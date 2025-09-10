import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FilterPanel } from "@/components/Catalog/FilterPanel";
import { IngredientCard } from "@/components/Catalog/IngredientCard";
import { ComparisonModal } from "@/components/Catalog/ComparisonModal";
import { PriceAlerts } from "@/components/Catalog/PriceAlerts";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  Download,
  Grid,
  List,
  Eye,
  Search
} from "lucide-react";

interface Ingredient {
  id: string;
  name: string;
  category: string;
  family: string;
  unit_base: string;
  best_price: number | null;
  avg_price: number | null;
  supplier_count: number;
  last_price_update: string | null;
  allergens: string[];
  area: 'kitchen' | 'dining' | 'both';
  price_trend: number;
}

export const CatalogView = () => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedFamily, setSelectedFamily] = useState("all");
  const [selectedArea, setSelectedArea] = useState("all");
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [comparisonItems, setComparisonItems] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  const { currentOrganization } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (currentOrganization) {
      fetchIngredients();
    }
  }, [currentOrganization]);

  const fetchIngredients = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('ingredients')
        .select(`
          id,
          name,
          category,
          family,
          unit_base,
          best_price,
          avg_price,
          supplier_count,
          last_price_update,
          allergens,
          area,
          price_trend
        `)
        .eq('organization_id', currentOrganization?.id)
        .order('name');

      if (error) {
        console.error('Error fetching ingredients:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los ingredientes",
          variant: "destructive",
        });
        return;
      }

      setIngredients((data || []).map(item => ({
        ...item,
        allergens: Array.isArray(item.allergens) ? item.allergens : []
      })));
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

  // Get unique categories and families from real data
  const categories = [...new Set(ingredients.map(i => i.category).filter(Boolean))];
  const families = [...new Set(ingredients.map(i => i.family).filter(Boolean))];

  // Filter ingredients based on search and filters
  const filteredIngredients = ingredients.filter(ingredient => {
    const matchesSearch = ingredient.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || ingredient.category === selectedCategory;
    const matchesFamily = selectedFamily === 'all' || ingredient.family === selectedFamily;
    const matchesArea = selectedArea === 'all' || ingredient.area === selectedArea || ingredient.area === 'both';
    
    return matchesSearch && matchesCategory && matchesFamily && matchesArea;
  });

  const handleAddToComparison = (ingredientId: string) => {
    if (!comparisonItems.includes(ingredientId)) {
      setComparisonItems([...comparisonItems, ingredientId]);
    }
  };

  const handleRemoveFromComparison = (ingredientId: string) => {
    setComparisonItems(comparisonItems.filter(id => id !== ingredientId));
  };

  const formatUnitPrice = (price: number, unit: string) => `${price.toFixed(4)} €/${unit}`;
  
  const getAreaBadge = (area: string) => {
    switch (area) {
      case 'kitchen': return <Badge variant="secondary">Cocina</Badge>;
      case 'dining': return <Badge variant="outline">Sala</Badge>;
      default: return <Badge>Ambas</Badge>;
    }
  };

  const exportCatalog = () => {
    // Create CSV content
    const headers = ['Nombre', 'Categoría', 'Familia', 'Área', 'Mejor Precio', 'Precio Promedio', 'Proveedores', 'Última Actualización'];
    const csvContent = [
      headers.join(','),
      ...filteredIngredients.map(ingredient => [
        `"${ingredient.name}"`,
        `"${ingredient.category || ''}"`,
        `"${ingredient.family || ''}"`,
        `"${ingredient.area}"`,
        ingredient.best_price ? `${ingredient.best_price.toFixed(4)}` : '',
        ingredient.avg_price ? `${ingredient.avg_price.toFixed(4)}` : '',
        ingredient.supplier_count.toString(),
        ingredient.last_price_update ? new Date(ingredient.last_price_update).toLocaleDateString() : ''
      ].join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `catalogo-ingredientes-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Catálogo exportado",
      description: "El archivo CSV se ha descargado correctamente",
    });
  };

  if (!currentOrganization) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            Selecciona una empresa
          </h3>
          <p className="text-muted-foreground">
            Debes seleccionar una empresa antes de poder ver el catálogo
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gradient">Catálogo de Ingredientes</h1>
          <p className="text-muted-foreground mt-1">
            Cargando ingredientes...
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-muted rounded w-full"></div>
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
          <h1 className="text-2xl font-bold text-gradient">Catálogo de Ingredientes</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona y compara precios de ingredientes de todos tus proveedores
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            size="sm"
          >
            {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
          </Button>
          <Button onClick={exportCatalog} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Package className="h-8 w-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{ingredients.length}</div>
                <div className="text-sm text-muted-foreground">Total Ingredientes</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{categories.length}</div>
                <div className="text-sm text-muted-foreground">Categorías</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Eye className="h-8 w-8 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">{families.length}</div>
                <div className="text-sm text-muted-foreground">Familias</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-8 w-8 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">
                  {ingredients.filter(i => !i.best_price).length}
                </div>
                <div className="text-sm text-muted-foreground">Sin Precios</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar ingredientes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Categoría</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Familia</label>
              <Select value={selectedFamily} onValueChange={setSelectedFamily}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las familias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las familias</SelectItem>
                  {families.map(family => (
                    <SelectItem key={family} value={family}>
                      {family}
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
                  <SelectItem value="kitchen">Cocina</SelectItem>
                  <SelectItem value="dining">Sala</SelectItem>
                  <SelectItem value="both">Ambas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Resultados</label>
              <div className="text-sm text-muted-foreground pt-2">
                {filteredIngredients.length} de {ingredients.length} ingredientes
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison bar */}
      {comparisonItems.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {comparisonItems.length} ingredientes seleccionados para comparar
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setComparisonItems([])}
                >
                  Limpiar
                </Button>
                <Button 
                  size="sm"
                  onClick={() => setShowComparison(true)}
                >
                  Comparar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ingredients Grid/List */}
      {filteredIngredients.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              No se encontraron ingredientes
            </h3>
            <p className="text-muted-foreground">
              {ingredients.length === 0 
                ? "Aún no has importado ningún ingrediente. Ve a la sección de Ingesta para cargar tus primeros datos."
                : "Prueba a cambiar los filtros para ver más resultados."
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className={viewMode === 'grid' ? 
          "grid gap-4 md:grid-cols-2 lg:grid-cols-3" : 
          "space-y-4"
        }>
          {filteredIngredients.map((ingredient) => (
            <Card key={ingredient.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold">{ingredient.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {ingredient.category || 'Sin categoría'} • {ingredient.family || 'Sin familia'}
                    </p>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-lg font-bold text-green-600">
                        {ingredient.best_price ? formatUnitPrice(ingredient.best_price, ingredient.unit_base) : 'Sin precio'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {ingredient.supplier_count} proveedores
                      </div>
                    </div>
                    {getAreaBadge(ingredient.area)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Future: Add modals here */}
    </div>
  );
};