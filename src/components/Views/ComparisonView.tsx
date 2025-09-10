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
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { exportComparisonCSV } from "@/utils/pdfExport";

interface SupplierPrice {
  id: string;
  ingredientName: string;
  supplierName: string;
  packDescription: string;
  packSize: string;
  unitPrice: number;
  packPrice: number;
  discount: number;
  igic: number;
  finalPrice: number;
  lastUpdate: string;
  isBest: boolean;
  area: 'kitchen' | 'dining' | 'both';
}

export const ComparisonView = () => {
  const [prices, setPrices] = useState<SupplierPrice[]>([]);
  const [loading, setLoading] = useState(true);

  const { currentOrganization } = useAuth();

  useEffect(() => {
    if (currentOrganization) {
      fetchPrices();
    }
  }, [currentOrganization]);

  const fetchPrices = async () => {
    if (!currentOrganization) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('supplier_prices')
        .select(`
          *,
          supplier_products!inner(
            *,
            ingredients!inner(name, unit_base, area),
            suppliers!inner(name)
          )
        `)
        .eq('supplier_products.suppliers.organization_id', currentOrganization.organization_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching prices:', error);
        return;
      }

      const formattedPrices: SupplierPrice[] = data?.map(price => {
        const ingredient = price.supplier_products.ingredients;
        const supplier = price.supplier_products.suppliers;
        const unitPrice = price.pack_price / price.pack_net_qty;
        const finalPrice = unitPrice * (1 - price.discount_pct / 100) * (1 + price.tax_pct / 100);

        return {
          id: price.id,
          ingredientName: ingredient.name,
          supplierName: supplier.name,
          packDescription: price.pack_description,
          packSize: `${price.pack_net_qty} ${price.pack_unit}`,
          unitPrice: finalPrice,
          packPrice: price.pack_price,
          discount: price.discount_pct,
          igic: price.tax_pct,
          finalPrice,
          lastUpdate: price.updated_at.split('T')[0],
          isBest: false, // Will be calculated
          area: ingredient.area as 'kitchen' | 'dining' | 'both'
        };
      }) || [];

      // Calculate best prices per ingredient
      const ingredientGroups: { [key: string]: SupplierPrice[] } = {};
      formattedPrices.forEach(price => {
        if (!ingredientGroups[price.ingredientName]) {
          ingredientGroups[price.ingredientName] = [];
        }
        ingredientGroups[price.ingredientName].push(price);
      });

      // Mark best prices
      Object.values(ingredientGroups).forEach(group => {
        const bestPrice = Math.min(...group.map(p => p.finalPrice));
        group.forEach(price => {
          price.isBest = price.finalPrice === bestPrice;
        });
      });

      setPrices(formattedPrices);
    } catch (error) {
      console.error('Error fetching prices:', error);
    } finally {
      setLoading(false);
    }
  };
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIngredient, setSelectedIngredient] = useState("Todos");
  const [selectedArea, setSelectedArea] = useState("Todas");

  const ingredients = [...new Set(prices.map(p => p.ingredientName))];
  const areas = ["Todas", "Cocina", "Sala", "Mixto"];

  const filteredPrices = prices.filter(price => {
    const matchesSearch = price.ingredientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         price.supplierName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesIngredient = selectedIngredient === "Todos" || price.ingredientName === selectedIngredient;
    const matchesArea = selectedArea === "Todas" || 
      (selectedArea === "Cocina" && (price.area === "kitchen" || price.area === "both")) ||
      (selectedArea === "Sala" && (price.area === "dining" || price.area === "both")) ||
      (selectedArea === "Mixto" && price.area === "both");
    
    return matchesSearch && matchesIngredient && matchesArea;
  });

  const formatPrice = (price: number) => `€${price.toFixed(2)}`;
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('es-ES');

  const getAreaBadge = (area: SupplierPrice['area']) => {
    switch (area) {
      case 'kitchen':
        return <Badge variant="secondary" className="text-xs">Cocina</Badge>;
      case 'dining':
        return <Badge variant="outline" className="text-xs">Sala</Badge>;
      case 'both':
        return <Badge variant="default" className="text-xs">Mixto</Badge>;
    }
  };

  // Group by ingredient for statistics
  const ingredientStats = ingredients.map(ingredient => {
    const ingredientPrices = prices.filter(p => p.ingredientName === ingredient);
    const bestPrice = Math.min(...ingredientPrices.map(p => p.finalPrice));
    const worstPrice = Math.max(...ingredientPrices.map(p => p.finalPrice));
    const avgPrice = ingredientPrices.reduce((sum, p) => sum + p.finalPrice, 0) / ingredientPrices.length;
    const savings = ((worstPrice - bestPrice) / worstPrice) * 100;
    
    return {
      ingredient,
      suppliers: ingredientPrices.length,
      bestPrice,
      worstPrice,
      avgPrice,
      savings
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gradient">Comparador de Precios</h1>
        <p className="text-muted-foreground mt-1">
          Compara precios en tiempo real de todos tus proveedores
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Crown className="h-6 w-6 text-warning mx-auto mb-2" />
            <p className="text-2xl font-bold">€1,247</p>
            <p className="text-sm text-muted-foreground">Ahorro potencial/mes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingDown className="h-6 w-6 text-success mx-auto mb-2" />
            <p className="text-2xl font-bold">18.5%</p>
            <p className="text-sm text-muted-foreground">Reducción promedio</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-6 w-6 text-destructive mx-auto mb-2" />
            <p className="text-2xl font-bold">3</p>
            <p className="text-sm text-muted-foreground">Precios desactualizados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">Hoy</p>
            <p className="text-sm text-muted-foreground">Última actualización</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar ingrediente o proveedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedIngredient} onValueChange={setSelectedIngredient}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos los ingredientes</SelectItem>
                {ingredients.map(ingredient => (
                  <SelectItem key={ingredient} value={ingredient}>
                    {ingredient}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedArea} onValueChange={setSelectedArea}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {areas.map(area => (
                  <SelectItem key={area} value={area}>
                    {area}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2" onClick={() => exportComparisonCSV(filteredPrices)}>
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Price Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Comparación Detallada</CardTitle>
          <CardDescription>
            Precios normalizados por unidad con descuentos e IGIC aplicados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ingrediente</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Formato</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead className="text-right">Precio/Unidad</TableHead>
                  <TableHead className="text-right">Precio Pack</TableHead>
                  <TableHead className="text-right">Descuento</TableHead>
                  <TableHead className="text-right">IGIC</TableHead>
                  <TableHead className="text-right">Actualizado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPrices.map((price) => (
                  <TableRow key={price.id} className={price.isBest ? "bg-success/5" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {price.isBest && <Crown className="h-4 w-4 text-warning" />}
                        <span className="font-medium">{price.ingredientName}</span>
                      </div>
                    </TableCell>
                    <TableCell>{price.supplierName}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{price.packDescription}</div>
                        <div className="text-sm text-muted-foreground">{price.packSize}</div>
                      </div>
                    </TableCell>
                    <TableCell>{getAreaBadge(price.area)}</TableCell>
                    <TableCell className="text-right">
                      <span className={cn(
                        "font-bold",
                        price.isBest ? "text-success" : "text-foreground"
                      )}>
                        {formatPrice(price.finalPrice)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{formatPrice(price.packPrice)}</TableCell>
                    <TableCell className="text-right">
                      {price.discount > 0 ? (
                        <Badge variant="secondary">{price.discount}%</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline">{price.igic}%</Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {formatDate(price.lastUpdate)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Savings Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Análisis de Ahorro por Ingrediente</CardTitle>
          <CardDescription>
            Potencial de ahorro eligiendo el mejor proveedor para cada ingrediente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {ingredientStats.map((stat, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gradient-subtle rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium">{stat.ingredient}</h4>
                  <p className="text-sm text-muted-foreground">
                    {stat.suppliers} proveedores • Mejor: {formatPrice(stat.bestPrice)} • 
                    Peor: {formatPrice(stat.worstPrice)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-success">
                    -{stat.savings.toFixed(1)}%
                  </p>
                  <p className="text-sm text-muted-foreground">ahorro</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};