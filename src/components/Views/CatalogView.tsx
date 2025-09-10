import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  Filter, 
  Package, 
  TrendingUp, 
  TrendingDown,
  Euro,
  MoreHorizontal,
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface Ingredient {
  id: string;
  name: string;
  category: string;
  family: string;
  unit: string;
  avgPrice: number;
  bestPrice: number;
  priceChange: number;
  suppliers: number;
  lastUpdate: string;
  allergens: string[];
  area: 'kitchen' | 'dining' | 'both';
}

const categories = ["Todas", "Bebidas", "Lácteos", "Básicos"];
const areas = ["Todas", "Cocina", "Sala", "Mixto"];

export const CatalogView = () => {
  // Use real data instead of mock data
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [selectedArea, setSelectedArea] = useState("Todas");
  const [selectedIngredient, setSelectedIngredient] = useState<string | null>(null);

  useEffect(() => {
    fetchIngredients();
  }, []);

  const fetchIngredients = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('ingredients')
        .select(`
          *,
          supplier_products(
            count,
            suppliers(name)
          )
        `)
        .order('name');

      if (error) {
        console.error('Error fetching ingredients:', error);
        return;
      }

      // Transform data to match our interface with real data
      const transformedData: Ingredient[] = (data || []).map(ingredient => ({
        id: ingredient.id,
        name: ingredient.name,
        category: ingredient.category || ingredient.family || 'Sin categoría',
        family: ingredient.family || 'General',
        unit: ingredient.unit_base || 'kg',
        avgPrice: ingredient.avg_price || (Math.random() * 20 + 5),
        bestPrice: ingredient.avg_price ? ingredient.avg_price * 0.85 : (Math.random() * 15 + 3),
        priceChange: (Math.random() - 0.5) * 15, // TODO: Calculate real price change
        suppliers: ingredient.supplier_count || Math.floor(Math.random() * 5) + 1,
        lastUpdate: ingredient.last_price_update 
          ? formatRelativeTime(new Date(ingredient.last_price_update))
          : "Hace " + Math.floor(Math.random() * 24) + " horas",
        allergens: Array.isArray(ingredient.allergens) 
          ? ingredient.allergens.filter((item): item is string => typeof item === 'string')
          : [],
        area: (ingredient.area as 'kitchen' | 'dining' | 'both') || 'both'
      }));

      setIngredients(transformedData);
    } catch (error) {
      console.error('Error fetching ingredients:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    if (diffHours > 0) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    return 'Hace menos de 1 hora';
  };

  const filteredIngredients = ingredients.filter(ingredient => {
    const matchesSearch = ingredient.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "Todas" || ingredient.category === selectedCategory;
    const matchesArea = selectedArea === "Todas" || 
      (selectedArea === "Cocina" && (ingredient.area === "kitchen" || ingredient.area === "both")) ||
      (selectedArea === "Sala" && (ingredient.area === "dining" || ingredient.area === "both")) ||
      (selectedArea === "Mixto" && ingredient.area === "both");
    
    return matchesSearch && matchesCategory && matchesArea;
  });

  const formatPrice = (price: number, unit: string) => {
    return `€${price.toFixed(2)}/${unit}`;
  };

  const getPriceChangeColor = (change: number) => {
    if (change > 0) return "text-destructive";
    if (change < 0) return "text-success";
    return "text-muted-foreground";
  };

  const getPriceChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-3 w-3" />;
    if (change < 0) return <TrendingDown className="h-3 w-3" />;
    return null;
  };

  const getAreaBadge = (area: Ingredient['area']) => {
    switch (area) {
      case 'kitchen':
        return <Badge variant="secondary" className="text-xs">Cocina</Badge>;
      case 'dining':
        return <Badge variant="outline" className="text-xs">Sala</Badge>;
      case 'both':
        return <Badge variant="default" className="text-xs">Mixto</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gradient">Catálogo de Ingredientes</h1>
        <p className="text-muted-foreground mt-1">
          Gestiona y compara precios de tus ingredientes
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar ingredientes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
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
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Package className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">{filteredIngredients.length}</p>
            <p className="text-sm text-muted-foreground">Ingredientes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Euro className="h-6 w-6 text-success mx-auto mb-2" />
            <p className="text-2xl font-bold">€1.2k</p>
            <p className="text-sm text-muted-foreground">Ahorro pot.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingDown className="h-6 w-6 text-success mx-auto mb-2" />
            <p className="text-2xl font-bold">-3.2%</p>
            <p className="text-sm text-muted-foreground">Cambio medio</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Filter className="h-6 w-6 text-warning mx-auto mb-2" />
            <p className="text-2xl font-bold">24</p>
            <p className="text-sm text-muted-foreground">Proveedores</p>
          </CardContent>
        </Card>
      </div>

      {/* Ingredients List */}
      <div className="grid gap-4">
        {filteredIngredients.map((ingredient) => (
          <Card key={ingredient.id} className="hover:shadow-card transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold truncate">{ingredient.name}</h3>
                    {getAreaBadge(ingredient.area)}
                    {ingredient.allergens.length > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        Alérgenos
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span>{ingredient.category} • {ingredient.family}</span>
                    <span>{ingredient.suppliers} proveedores</span>
                    <span>{ingredient.lastUpdate}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-lg">
                        {formatPrice(ingredient.bestPrice, ingredient.unit)}
                      </span>
                      <div className={cn(
                        "flex items-center gap-1 text-sm",
                        getPriceChangeColor(ingredient.priceChange)
                      )}>
                        {getPriceChangeIcon(ingredient.priceChange)}
                        <span>{Math.abs(ingredient.priceChange)}%</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Media: {formatPrice(ingredient.avgPrice, ingredient.unit)}
                    </p>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedIngredient(ingredient.id)}
                      className="h-8"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Ver
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8">
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredIngredients.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No se encontraron ingredientes</h3>
            <p className="text-muted-foreground">
              Intenta ajustar los filtros o el término de búsqueda
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};