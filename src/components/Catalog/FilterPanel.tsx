import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { 
  Search, 
  Filter, 
  X, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  ShoppingCart
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterPanelProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  selectedArea: string;
  onAreaChange: (value: string) => void;
  priceRange: [number, number];
  onPriceRangeChange: (value: [number, number]) => void;
  selectedAllergens: string[];
  onAllergensChange: (allergens: string[]) => void;
  selectedSuppliers: string[];
  onSuppliersChange: (suppliers: string[]) => void;
  priceChangeFilter: 'all' | 'increase' | 'decrease' | 'stable';
  onPriceChangeFilterChange: (value: 'all' | 'increase' | 'decrease' | 'stable') => void;
  availableCategories: string[];
  availableSuppliers: string[];
  onClearFilters: () => void;
  className?: string;
}

const commonAllergens = [
  'Gluten', 'Lactosa', 'Huevos', 'Frutos secos', 'Cacahuetes', 
  'Soja', 'Pescado', 'Mariscos', 'Apio', 'Mostaza', 'Sésamo', 'Sulfitos'
];

export const FilterPanel = ({
  searchTerm,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedArea,
  onAreaChange,
  priceRange,
  onPriceRangeChange,
  selectedAllergens,
  onAllergensChange,
  selectedSuppliers,
  onSuppliersChange,
  priceChangeFilter,
  onPriceChangeFilterChange,
  availableCategories,
  availableSuppliers,
  onClearFilters,
  className
}: FilterPanelProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasActiveFilters = 
    searchTerm !== '' ||
    selectedCategory !== 'all' ||
    selectedArea !== 'all' ||
    priceRange[0] > 0 || priceRange[1] < 100 ||
    selectedAllergens.length > 0 ||
    selectedSuppliers.length > 0 ||
    priceChangeFilter !== 'all';

  const handleAllergenToggle = (allergen: string) => {
    const newAllergens = selectedAllergens.includes(allergen)
      ? selectedAllergens.filter(a => a !== allergen)
      : [...selectedAllergens, allergen];
    onAllergensChange(newAllergens);
  };

  const handleSupplierToggle = (supplier: string) => {
    const newSuppliers = selectedSuppliers.includes(supplier)
      ? selectedSuppliers.filter(s => s !== supplier)
      : [...selectedSuppliers, supplier];
    onSuppliersChange(newSuppliers);
  };

  const getPriceChangeIcon = (filter: string) => {
    switch (filter) {
      case 'increase':
        return <TrendingUp className="h-4 w-4 text-destructive" />;
      case 'decrease':
        return <TrendingDown className="h-4 w-4 text-success" />;
      case 'stable':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      default:
        return <Filter className="h-4 w-4" />;
    }
  };

  return (
    <Card className={cn("p-6", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Filtros Avanzados</h3>
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-2">
              {[
                searchTerm && 'búsqueda',
                selectedCategory !== 'all' && 'categoría',
                selectedArea !== 'all' && 'área',
                (priceRange[0] > 0 || priceRange[1] < 100) && 'precio',
                selectedAllergens.length > 0 && `${selectedAllergens.length} alérgenos`,
                selectedSuppliers.length > 0 && `${selectedSuppliers.length} proveedores`,
                priceChangeFilter !== 'all' && 'tendencia'
              ].filter(Boolean).length} activos
            </Badge>
          )}
        </div>
        
        <div className="flex gap-2">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={onClearFilters}>
              <X className="h-4 w-4 mr-1" />
              Limpiar
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Contraer' : 'Expandir'}
          </Button>
        </div>
      </div>

      {/* Búsqueda principal */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar ingredientes..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filtros rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <Label className="text-sm font-medium mb-2 block">Categoría</Label>
          <Select value={selectedCategory} onValueChange={onCategoryChange}>
            <SelectTrigger>
              <SelectValue placeholder="Todas las categorías" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {availableCategories.map(category => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm font-medium mb-2 block">Área</Label>
          <Select value={selectedArea} onValueChange={onAreaChange}>
            <SelectTrigger>
              <SelectValue placeholder="Todas las áreas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las áreas</SelectItem>
              <SelectItem value="kitchen">
                <div className="flex items-center gap-2">
                  🍳 Cocina
                </div>
              </SelectItem>
              <SelectItem value="dining">
                <div className="flex items-center gap-2">
                  🍽️ Sala
                </div>
              </SelectItem>
              <SelectItem value="both">
                <div className="flex items-center gap-2">
                  🏪 Ambas
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm font-medium mb-2 block">Tendencia de Precio</Label>
          <Select value={priceChangeFilter} onValueChange={onPriceChangeFilterChange}>
            <SelectTrigger>
              <SelectValue placeholder="Todas las tendencias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Todas
                </div>
              </SelectItem>
              <SelectItem value="increase">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-destructive" />
                  Subida
                </div>
              </SelectItem>
              <SelectItem value="decrease">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-success" />
                  Bajada
                </div>
              </SelectItem>
              <SelectItem value="stable">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  Estable
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filtros avanzados (expandibles) */}
      {isExpanded && (
        <div className="space-y-6 pt-4 border-t">
          {/* Rango de precio */}
          <div>
            <Label className="text-sm font-medium mb-3 block">
              Rango de Precio: {priceRange[0]}€ - {priceRange[1]}€
            </Label>
            <Slider
              value={priceRange}
              onValueChange={onPriceRangeChange}
              max={100}
              min={0}
              step={1}
              className="w-full"
            />
          </div>

          {/* Alérgenos */}
          <div>
            <Label className="text-sm font-medium mb-3 block">
              Alérgenos {selectedAllergens.length > 0 && `(${selectedAllergens.length} seleccionados)`}
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {commonAllergens.map(allergen => (
                <div key={allergen} className="flex items-center space-x-2">
                  <Checkbox
                    id={`allergen-${allergen}`}
                    checked={selectedAllergens.includes(allergen)}
                    onCheckedChange={() => handleAllergenToggle(allergen)}
                  />
                  <Label
                    htmlFor={`allergen-${allergen}`}
                    className="text-sm cursor-pointer"
                  >
                    {allergen}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Proveedores */}
          <div>
            <Label className="text-sm font-medium mb-3 block">
              Proveedores {selectedSuppliers.length > 0 && `(${selectedSuppliers.length} seleccionados)`}
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
              {availableSuppliers.map(supplier => (
                <div key={supplier} className="flex items-center space-x-2">
                  <Checkbox
                    id={`supplier-${supplier}`}
                    checked={selectedSuppliers.includes(supplier)}
                    onCheckedChange={() => handleSupplierToggle(supplier)}
                  />
                  <Label
                    htmlFor={`supplier-${supplier}`}
                    className="text-sm cursor-pointer flex items-center gap-1"
                  >
                    <ShoppingCart className="h-3 w-3" />
                    {supplier}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};