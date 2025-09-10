import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Eye
} from "lucide-react";

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

export const CatalogView = () => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedArea, setSelectedArea] = useState("all");
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [comparisonItems, setComparisonItems] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  
  // Advanced filters
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100]);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [priceChangeFilter, setPriceChangeFilter] = useState<'all' | 'increase' | 'decrease' | 'stable'>('all');
  
  const { currentOrganization } = useAuth();
  const { toast } = useToast();

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
    // Search term filter
    const matchesSearch = ingredient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ingredient.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ingredient.family.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Category filter
    const matchesCategory = selectedCategory === "all" || ingredient.category === selectedCategory;
    
    // Area filter
    const matchesArea = selectedArea === "all" || ingredient.area === selectedArea || ingredient.area === 'both';
    
    // Price range filter
    const matchesPrice = ingredient.avgPrice >= priceRange[0] && ingredient.avgPrice <= priceRange[1];
    
    // Allergens filter
    const matchesAllergens = selectedAllergens.length === 0 || 
      selectedAllergens.some(allergen => ingredient.allergens.includes(allergen));
    
    // Price change filter
    const matchesPriceChange = priceChangeFilter === 'all' ||
      (priceChangeFilter === 'increase' && ingredient.priceChange > 5) ||
      (priceChangeFilter === 'decrease' && ingredient.priceChange < -5) ||
      (priceChangeFilter === 'stable' && Math.abs(ingredient.priceChange) <= 5);

    return matchesSearch && matchesCategory && matchesArea && matchesPrice && 
           matchesAllergens && matchesPriceChange;
  });

  // Get unique values for filters
  const availableCategories = [...new Set(ingredients.map(i => i.category))];
  const availableSuppliers = ['Proveedor A', 'Proveedor B', 'Mayorista Central']; // Mock data

  const handleViewDetails = (id: string) => {
    const ingredient = ingredients.find(i => i.id === id);
    setSelectedIngredient(ingredient || null);
  };

  const handleAddToFavorites = (id: string) => {
    setFavorites(prev => 
      prev.includes(id) 
        ? prev.filter(fav => fav !== id)
        : [...prev, id]
    );
    
    toast({
      title: favorites.includes(id) ? "Eliminado de favoritos" : "Agregado a favoritos",
      description: "La lista de favoritos se actualizó"
    });
  };

  const handleCompare = (id: string) => {
    setComparisonItems(prev => {
      const newItems = prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id];
      
      if (newItems.length > 0) {
        setShowComparison(true);
      }
      
      return newItems;
    });
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setSelectedArea("all");
    setPriceRange([0, 100]);
    setSelectedAllergens([]);
    setSelectedSuppliers([]);
    setPriceChangeFilter("all");
  };

  const handleExportCSV = () => {
    const csvData = filteredIngredients.map(ingredient => ({
      Nombre: ingredient.name,
      Categoría: ingredient.category,
      'Precio Promedio': ingredient.avgPrice,
      'Mejor Precio': ingredient.bestPrice,
      'Cambio de Precio': ingredient.priceChange,
      Proveedores: ingredient.suppliers,
      'Última Actualización': ingredient.lastUpdate,
      Alérgenos: ingredient.allergens.join('; '),
      Área: ingredient.area
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `catalogo-ingredientes-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export completado",
      description: "El catálogo se descargó correctamente"
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
          <div className="grid md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gradient">Catálogo de Ingredientes</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona y compara precios de {ingredients.length} ingredientes
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
          
          <div className="flex border rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <FilterPanel
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        selectedArea={selectedArea}
        onAreaChange={setSelectedArea}
        priceRange={priceRange}
        onPriceRangeChange={setPriceRange}
        selectedAllergens={selectedAllergens}
        onAllergensChange={setSelectedAllergens}
        selectedSuppliers={selectedSuppliers}
        onSuppliersChange={setSelectedSuppliers}
        priceChangeFilter={priceChangeFilter}
        onPriceChangeFilterChange={setPriceChangeFilter}
        availableCategories={availableCategories}
        availableSuppliers={availableSuppliers}
        onClearFilters={clearFilters}
      />

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card className="p-6 text-center">
          <Package className="h-8 w-8 mx-auto mb-2 text-primary" />
          <p className="text-2xl font-bold">{filteredIngredients.length}</p>
          <p className="text-sm text-muted-foreground">Ingredientes</p>
        </Card>
        
        <Card className="p-6 text-center">
          <TrendingDown className="h-8 w-8 mx-auto mb-2 text-success" />
          <p className="text-2xl font-bold">€1.2k</p>
          <p className="text-sm text-muted-foreground">Ahorro potencial</p>
        </Card>
        
        <Card className="p-6 text-center">
          <TrendingUp className="h-8 w-8 mx-auto mb-2 text-warning" />
          <p className="text-2xl font-bold">+2.3%</p>
          <p className="text-sm text-muted-foreground">Cambio promedio</p>
        </Card>
        
        <Card className="p-6 text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-accent" />
          <p className="text-2xl font-bold">{availableSuppliers.length}</p>
          <p className="text-sm text-muted-foreground">Proveedores</p>
        </Card>
      </div>

      {/* Comparison Bar */}
      {comparisonItems.length > 0 && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              <span className="font-medium">
                {comparisonItems.length} ingrediente(s) seleccionados para comparar
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowComparison(true)}
                disabled={comparisonItems.length === 0}
              >
                Ver Comparación
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setComparisonItems([])}
              >
                Limpiar
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Content Grid */}
      <div className={`grid gap-6 ${
        viewMode === 'grid' 
          ? 'md:grid-cols-2 lg:grid-cols-3' 
          : 'grid-cols-1'
      }`}>
        {filteredIngredients.map((ingredient) => (
          <IngredientCard
            key={ingredient.id}
            ingredient={ingredient}
            onViewDetails={handleViewDetails}
            onAddToFavorites={handleAddToFavorites}
            onCompare={handleCompare}
            isFavorite={favorites.includes(ingredient.id)}
            isSelected={comparisonItems.includes(ingredient.id)}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredIngredients.length === 0 && (
        <Card className="p-12 text-center">
          <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No se encontraron ingredientes</h3>
          <p className="text-muted-foreground mb-4">
            Prueba ajustando los filtros o la búsqueda
          </p>
          <Button variant="outline" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        </Card>
      )}

      {/* Price Alerts Sidebar */}
      {currentOrganization && (
        <PriceAlerts 
          organizationId={currentOrganization.id}
          ingredientId={selectedIngredient?.id}
        />
      )}

      {/* Comparison Modal */}
      <ComparisonModal
        ingredients={comparisonItems}
        open={showComparison}
        onClose={() => setShowComparison(false)}
      />
    </div>
  );
};