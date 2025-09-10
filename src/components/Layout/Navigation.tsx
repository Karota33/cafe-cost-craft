import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Package, 
  ShoppingCart, 
  Calculator, 
  Upload, 
  BarChart3,
  ChefHat,
  Utensils,
  Filter
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavigationProps {
  activeView: string;
  onViewChange: (view: string) => void;
  className?: string;
}

const navigationItems = [
  {
    id: "upload",
    label: "Ingesta",
    description: "Subir archivos",
    icon: Upload,
    badge: "CSV/PDF/Excel",
    color: "bg-success text-success-foreground",
    roles: ['owner', 'admin', 'manager']
  },
  {
    id: "catalog",
    label: "Catálogo",
    description: "Ingredientes",
    icon: Package,
    badge: "Productos",
    color: "bg-primary text-primary-foreground",
    roles: ['owner', 'admin', 'manager', 'kitchen_staff', 'hall_staff']
  },
  {
    id: "comparison",
    label: "Comparador",
    description: "Precios",
    icon: BarChart3,
    badge: "Live",
    color: "bg-warning text-warning-foreground",
    roles: ['owner', 'admin', 'manager']
  },
  {
    id: "suppliers",
    label: "Proveedores",
    description: "Red comercial",
    icon: ShoppingCart,
    badge: "Gestión",
    color: "bg-secondary text-secondary-foreground",
    roles: ['owner', 'admin', 'manager']
  },
  {
    id: "recipes",
    label: "Recetas",
    description: "PREP/PLATE",
    icon: Calculator,
    badge: "Escandallos",
    color: "bg-accent text-accent-foreground",
    roles: ['owner', 'admin', 'manager', 'kitchen_staff']
  },
  {
    id: "purchases",
    label: "Compras",
    description: "Por área",
    icon: ShoppingCart,
    badge: "Cocina/Sala",
    color: "bg-secondary text-secondary-foreground",
    roles: ['owner', 'admin', 'manager', 'kitchen_staff', 'hall_staff']
  },
  {
    id: "hr",
    label: "RRHH",
    description: "Personal",
    icon: Filter,
    badge: "Horarios",
    color: "bg-primary text-primary-foreground",
    roles: ['owner', 'admin', 'hr_manager', 'manager']
  }
];

const areaFilters = [
  { id: "all", label: "Todo", icon: Filter },
  { id: "kitchen", label: "Cocina", icon: ChefHat },
  { id: "dining", label: "Sala", icon: Utensils }
];

export const Navigation = ({ activeView, onViewChange, className }: NavigationProps) => {
  const [activeArea, setActiveArea] = useState("all");
  const { currentOrganization, hasRole } = useAuth();

  const visibleItems = navigationItems.filter(item => 
    !item.roles || currentOrganization && hasRole(item.roles)
  );

  return (
    <Card className={cn("p-4", className)}>
      {/* Area Filter */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Área</h3>
        <div className="grid grid-cols-3 gap-2">
          {areaFilters.map((area) => (
            <Button
              key={area.id}
              variant={activeArea === area.id ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveArea(area.id)}
              className="h-10 flex-col gap-1 text-xs"
            >
              <area.icon className="h-4 w-4" />
              {area.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Main Navigation */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Módulos</h3>
        {visibleItems.map((item) => (
          <Button
            key={item.id}
            variant={activeView === item.id ? "default" : "ghost"}
            className={cn(
              "w-full justify-start h-auto p-4 text-left transition-all",
              activeView === item.id && "shadow-card"
            )}
            onClick={() => onViewChange(item.id)}
          >
            <div className="flex items-center gap-3 w-full">
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                activeView === item.id ? "bg-primary-foreground text-primary" : item.color
              )}>
                <item.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium truncate">{item.label}</p>
                  <Badge variant="secondary" className="text-xs ml-2">
                    {item.badge}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {item.description}
                </p>
              </div>
            </div>
          </Button>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="mt-6 pt-4 border-t">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Resumen</h3>
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="p-3 bg-gradient-subtle rounded-lg">
            <p className="text-lg font-bold text-primary">€24.5k</p>
            <p className="text-xs text-muted-foreground">Coste mensual</p>
          </div>
          <div className="p-3 bg-gradient-subtle rounded-lg">
            <p className="text-lg font-bold text-success">22.3%</p>
            <p className="text-xs text-muted-foreground">Food Cost avg</p>
          </div>
        </div>
      </div>
    </Card>
  );
};