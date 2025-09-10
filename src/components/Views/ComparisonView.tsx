import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Search, 
  Download, 
  TrendingUp, 
  TrendingDown,
  Crown,
  AlertTriangle,
  Calendar,
  Package,
  DollarSign
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SupplierPrice {
  id: string;
  ingredientId: string;
  ingredientName: string;
  supplierName: string;
  packDescription: string;
  packNetQty: number;
  packUnit: string;
  packPrice: number;
  unitPrice: number;
  discountPct: number;
  taxPct: number;
  finalPrice: number;
  effectiveFrom: string;
  isBest: boolean;
  area: string;
  family: string;
  category: string;
}

export const ComparisonView = () => {
  const [prices, setPrices] = useState<SupplierPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIngredient, setSelectedIngredient] = useState("all");
  const [selectedArea, setSelectedArea] = useState("all");

  const { currentOrganization } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (currentOrganization) {
      fetchPrices();
    }
  }, [currentOrganization]);

  const fetchPrices = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('supplier_prices')
        .select(`
          id,
          pack_description,
          pack_net_qty,
          pack_unit,
          pack_price,
          discount_pct,
          tax_pct,
          effective_from,
          is_active,
          supplier_products!inner (
            id,
            area,
            family,
            suppliers!inner (
              id,
              name
            ),
            ingredients!inner (
              id,
              name,
              category,
              unit_base
            )
          )
        `)
        .eq('is_active', true)
        .eq('supplier_products.suppliers.organization_id', currentOrganization?.id)
        .order('effective_from', { ascending: false });

      if (error) {
        console.error('Error fetching prices:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los precios",
          variant: "destructive",
        });
        return;
      }

      // Transform data and calculate metrics
      const transformedPrices: SupplierPrice[] = (data || []).map((item: any) => {
        const unitPrice = item.pack_price / item.pack_net_qty;
        const discountAmount = item.pack_price * (item.discount_pct / 100);
        const taxableAmount = item.pack_price - discountAmount;
        const taxAmount = taxableAmount * (item.tax_pct / 100);
        const finalPrice = taxableAmount + taxAmount;
        
        return {
          id: item.id,
          ingredientId: item.supplier_products.ingredients.id,
          ingredientName: item.supplier_products.ingredients.name,
          supplierName: item.supplier_products.suppliers.name,
          packDescription: item.pack_description,
          packNetQty: item.pack_net_qty,
          packUnit: item.pack_unit,
          packPrice: item.pack_price,
          unitPrice: unitPrice / item.pack_net_qty, // Normalize to base unit
          discountPct: item.discount_pct,
          taxPct: item.tax_pct,
          finalPrice: finalPrice / item.pack_net_qty, // Final unit price
          effectiveFrom: item.effective_from,
          isBest: false, // Will be calculated below
          area: item.supplier_products.area,
          family: item.supplier_products.family || '',
          category: item.supplier_products.ingredients.category || ''
        };
      });

      // Calculate best prices per ingredient
      const ingredientGroups = transformedPrices.reduce((acc, price) => {
        if (!acc[price.ingredientId]) {
          acc[price.ingredientId] = [];
        }
        acc[price.ingredientId].push(price);
        return acc;
      }, {} as Record<string, SupplierPrice[]>);

      // Mark best prices
      Object.values(ingredientGroups).forEach(group => {
        const bestPrice = Math.min(...group.map(p => p.finalPrice));
        group.forEach(price => {
          if (price.finalPrice === bestPrice) {
            price.isBest = true;
          }
        });
      });

      setPrices(transformedPrices);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Error inesperado al cargar datos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Get unique values for filters
  const uniqueIngredients = [...new Set(prices.map(p => ({ id: p.ingredientId, name: p.ingredientName })))];
  const uniqueAreas = [...new Set(prices.map(p => p.area))];

  // Filter prices
  const filteredPrices = prices.filter(price => {
    const matchesSearch = price.ingredientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          price.supplierName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesIngredient = selectedIngredient === 'all' || price.ingredientId === selectedIngredient;
    const matchesArea = selectedArea === 'all' || price.area === selectedArea;
    
    return matchesSearch && matchesIngredient && matchesArea;
  });

  // Calculate statistics
  const stats = {
    totalIngredients: uniqueIngredients.length,
    totalSuppliers: [...new Set(prices.map(p => p.supplierName))].length,
    avgSavings: 0,
    outdatedPrices: 0
  };

  // Calculate ingredient-wise savings
  const ingredientStats = uniqueIngredients.map(ingredient => {
    const ingredientPrices = prices.filter(p => p.ingredientId === ingredient.id);
    const bestPrice = Math.min(...ingredientPrices.map(p => p.finalPrice));
    const worstPrice = Math.max(...ingredientPrices.map(p => p.finalPrice));
    const avgPrice = ingredientPrices.reduce((sum, p) => sum + p.finalPrice, 0) / ingredientPrices.length;
    const savings = worstPrice - bestPrice;
    const savingsPercent = worstPrice > 0 ? (savings / worstPrice) * 100 : 0;
    
    return {
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      suppliers: ingredientPrices.length,
      bestPrice,
      worstPrice,
      avgPrice,
      savings,
      savingsPercent
    };
  });

  const formatPrice = (price: number) => `${price.toFixed(4)} €`;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

  const getAreaBadge = (area: string) => {
    switch (area) {
      case 'kitchen':
        return <Badge variant="secondary">Cocina</Badge>;
      case 'dining':
        return <Badge variant="outline">Sala</Badge>;
      case 'both':
        return <Badge>Ambas</Badge>;
      default:
        return <Badge variant="secondary">{area}</Badge>;
    }
  };

  const exportComparison = () => {
    const headers = [
      'Ingrediente', 'Proveedor', 'Descripción', 'Cantidad', 'Unidad', 
      'Precio Pack', 'Precio Unitario', 'Descuento %', 'Impuesto %', 
      'Precio Final', 'Área', 'Fecha', 'Es Mejor'
    ];
    
    const csvContent = [
      headers.join(','),
      ...filteredPrices.map(price => [
        `"${price.ingredientName}"`,
        `"${price.supplierName}"`,
        `"${price.packDescription}"`,
        price.packNetQty.toString(),
        `"${price.packUnit}"`,
        price.packPrice.toFixed(2),
        price.unitPrice.toFixed(4),
        price.discountPct.toString(),
        price.taxPct.toString(),
        price.finalPrice.toFixed(4),
        `"${price.area}"`,
        `"${formatDate(price.effectiveFrom)}"`,
        price.isBest ? 'Sí' : 'No'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `comparacion-precios-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Comparación exportada",
      description: "El archivo CSV se ha descargado correctamente",
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gradient">Comparador de Precios</h1>
          <p className="text-muted-foreground mt-1">Cargando datos...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gradient">Comparador de Precios</h1>
          <p className="text-muted-foreground mt-1">
            Compara precios de ingredientes entre diferentes proveedores
          </p>
        </div>
        <Button onClick={exportComparison} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Package className="h-8 w-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{stats.totalIngredients}</div>
                <div className="text-sm text-muted-foreground">Ingredientes</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-8 w-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{stats.totalSuppliers}</div>
                <div className="text-sm text-muted-foreground">Proveedores</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-8 w-8 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">
                  {ingredientStats.reduce((sum, stat) => sum + stat.savingsPercent, 0) / ingredientStats.length || 0}%
                </div>
                <div className="text-sm text-muted-foreground">Ahorro Promedio</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-8 w-8 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">
                  {prices.filter(p => {
                    const daysDiff = (new Date().getTime() - new Date(p.effectiveFrom).getTime()) / (1000 * 3600 * 24);
                    return daysDiff > 30;
                  }).length}
                </div>
                <div className="text-sm text-muted-foreground">Precios +30 días</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar ingrediente o proveedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Ingrediente</label>
              <Select value={selectedIngredient} onValueChange={setSelectedIngredient}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los ingredientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los ingredientes</SelectItem>
                  {uniqueIngredients.map(ingredient => (
                    <SelectItem key={ingredient.id} value={ingredient.id}>
                      {ingredient.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Área</label>
              <Select value={selectedArea} onValueChange={setSelectedArea}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las áreas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las áreas</SelectItem>
                  {uniqueAreas.map(area => (
                    <SelectItem key={area} value={area}>
                      {area === 'kitchen' ? 'Cocina' : area === 'dining' ? 'Sala' : 'Ambas'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Resultados</label>
              <div className="text-sm text-muted-foreground pt-2">
                {filteredPrices.length} precios encontrados
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Price Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Comparación de Precios</CardTitle>
          <CardDescription>
            Precios unitarios normalizados por ingrediente y proveedor
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredPrices.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No se encontraron precios</h3>
              <p className="text-muted-foreground">
                {prices.length === 0 
                  ? "Aún no has importado precios. Ve a la sección de Ingesta para cargar datos."
                  : "Prueba a cambiar los filtros para ver más resultados."
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ingrediente</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Formato</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead className="text-right">Precio Pack</TableHead>
                    <TableHead className="text-right">Precio Unitario</TableHead>
                    <TableHead className="text-right">Descuento</TableHead>
                    <TableHead className="text-right">Impuesto</TableHead>
                    <TableHead className="text-right">Precio Final</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPrices.map((price) => (
                    <TableRow 
                      key={price.id}
                      className={cn(price.isBest && "bg-green-50 dark:bg-green-950/20")}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {price.isBest && (
                            <Crown className="h-4 w-4 text-yellow-500" />
                          )}
                          {price.ingredientName}
                        </div>
                      </TableCell>
                      <TableCell>{price.supplierName}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {price.packDescription}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {price.packNetQty} {price.packUnit}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getAreaBadge(price.area)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatPrice(price.packPrice)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatPrice(price.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right">
                        {price.discountPct > 0 ? (
                          <span className="text-green-600">-{price.discountPct}%</span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {price.taxPct}%
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatPrice(price.finalPrice)}
                        {price.isBest && (
                          <Badge variant="default" className="ml-2 bg-green-500">
                            Mejor
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(price.effectiveFrom)}
                        </div>
                        {(() => {
                          const daysDiff = (new Date().getTime() - new Date(price.effectiveFrom).getTime()) / (1000 * 3600 * 24);
                          return daysDiff > 30 && (
                            <Badge variant="destructive" className="mt-1">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Antiguo
                            </Badge>
                          );
                        })()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Savings Analysis */}
      {ingredientStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Análisis de Ahorros</CardTitle>
            <CardDescription>
              Potencial de ahorro por ingrediente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ingrediente</TableHead>
                    <TableHead className="text-right">Proveedores</TableHead>
                    <TableHead className="text-right">Mejor Precio</TableHead>
                    <TableHead className="text-right">Peor Precio</TableHead>
                    <TableHead className="text-right">Precio Promedio</TableHead>
                    <TableHead className="text-right">Ahorro Potencial</TableHead>
                    <TableHead className="text-right">% Ahorro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ingredientStats
                    .sort((a, b) => b.savingsPercent - a.savingsPercent)
                    .slice(0, 10)
                    .map((stat) => (
                    <TableRow key={stat.ingredientId}>
                      <TableCell className="font-medium">{stat.ingredientName}</TableCell>
                      <TableCell className="text-right">{stat.suppliers}</TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatPrice(stat.bestPrice)}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {formatPrice(stat.worstPrice)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatPrice(stat.avgPrice)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatPrice(stat.savings)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {stat.savingsPercent > 10 ? (
                            <TrendingUp className="h-4 w-4 text-green-500" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-orange-500" />
                          )}
                          <span className={stat.savingsPercent > 10 ? "text-green-600" : "text-orange-600"}>
                            {stat.savingsPercent.toFixed(1)}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};