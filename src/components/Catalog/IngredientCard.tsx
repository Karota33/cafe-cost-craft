import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Eye, 
  Heart, 
  ShoppingCart, 
  TrendingUp, 
  TrendingDown, 
  Package,
  MapPin,
  Clock,
  Euro
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface IngredientCardProps {
  ingredient: Ingredient;
  onViewDetails: (id: string) => void;
  onAddToFavorites: (id: string) => void;
  onCompare: (id: string) => void;
  isFavorite?: boolean;
  isSelected?: boolean;
  className?: string;
}

export const IngredientCard = ({
  ingredient,
  onViewDetails,
  onAddToFavorites,
  onCompare,
  isFavorite = false,
  isSelected = false,
  className
}: IngredientCardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  const getPriceChangeColor = (change: number) => {
    if (change > 5) return 'text-destructive';
    if (change < -5) return 'text-success';
    return 'text-warning';
  };

  const getPriceChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-3 w-3" />;
    if (change < 0) return <TrendingDown className="h-3 w-3" />;
    return null;
  };

  const getAreaBadge = (area: string) => {
    const areaConfig = {
      kitchen: { label: '🍳 Cocina', variant: 'secondary' as const },
      dining: { label: '🍽️ Sala', variant: 'outline' as const },
      both: { label: '🏪 Ambas', variant: 'default' as const }
    };
    
    const config = areaConfig[area as keyof typeof areaConfig] || areaConfig.both;
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(price);
  };

  const savings = ingredient.avgPrice - ingredient.bestPrice;
  const savingsPercentage = (savings / ingredient.avgPrice) * 100;

  return (
    <Card 
      className={cn(
        "transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer",
        "border-2",
        isSelected && "border-primary shadow-card",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onViewDetails(ingredient.id)}
    >
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate mb-1">
              {ingredient.name}
            </h3>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs">
                {ingredient.category}
              </Badge>
              {getAreaBadge(ingredient.area)}
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onAddToFavorites(ingredient.id);
            }}
            className={cn(
              "transition-colors",
              isFavorite ? "text-destructive" : "text-muted-foreground hover:text-destructive"
            )}
          >
            <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
          </Button>
        </div>

        {/* Prices */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Precio promedio</span>
            <span className="font-semibold">
              {formatPrice(ingredient.avgPrice)}/{ingredient.unit}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Mejor precio</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-success">
                {formatPrice(ingredient.bestPrice)}/{ingredient.unit}
              </span>
              {savings > 0 && (
                <Badge variant="outline" className="text-xs text-success">
                  -{savingsPercentage.toFixed(1)}%
                </Badge>
              )}
            </div>
          </div>

          {/* Price change */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Tendencia</span>
            <div className={cn(
              "flex items-center gap-1 text-sm font-medium",
              getPriceChangeColor(ingredient.priceChange)
            )}>
              {getPriceChangeIcon(ingredient.priceChange)}
              {ingredient.priceChange > 0 ? '+' : ''}{ingredient.priceChange.toFixed(1)}%
            </div>
          </div>
        </div>

        <Separator />

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Proveedores:</span>
            <span className="font-medium">{ingredient.suppliers}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground truncate">
              {ingredient.lastUpdate}
            </span>
          </div>
        </div>

        {/* Allergens */}
        {ingredient.allergens.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Alérgenos:</div>
            <div className="flex flex-wrap gap-1">
              {ingredient.allergens.slice(0, 3).map(allergen => (
                <Badge key={allergen} variant="outline" className="text-xs">
                  {allergen}
                </Badge>
              ))}
              {ingredient.allergens.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{ingredient.allergens.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className={cn(
          "flex gap-2 pt-2 transition-opacity",
          isHovered ? "opacity-100" : "opacity-0"
        )}>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(ingredient.id);
            }}
            className="flex-1"
          >
            <Eye className="h-3 w-3 mr-1" />
            Ver
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onCompare(ingredient.id);
            }}
            className="flex-1"
          >
            <Package className="h-3 w-3 mr-1" />
            Comparar
          </Button>
        </div>

        {/* Savings highlight */}
        {savings > 1 && (
          <div className="bg-success/10 border border-success/20 rounded-lg p-2 text-center">
            <div className="text-xs text-success font-medium">
              💰 Ahorro potencial: {formatPrice(savings)}/{ingredient.unit}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};