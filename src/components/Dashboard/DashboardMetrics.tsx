import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  TrendingUp, 
  TrendingDown, 
  Euro, 
  Package, 
  ShoppingCart, 
  Calculator,
  Users,
  Clock
} from "lucide-react";

interface DashboardMetrics {
  totalIngredients: number;
  totalRecipes: number;
  totalSuppliers: number;
  activeEmployees: number;
  averageFoodCost: number;
  totalMonthlyCost: number;
  priceAlerts: number;
  recentUploads: number;
}

export const DashboardMetrics = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalIngredients: 0,
    totalRecipes: 0,
    totalSuppliers: 0,
    activeEmployees: 0,
    averageFoodCost: 0,
    totalMonthlyCost: 0,
    priceAlerts: 0,
    recentUploads: 0
  });
  const [loading, setLoading] = useState(true);

  const { currentOrganization } = useAuth();

  useEffect(() => {
    if (currentOrganization) {
      fetchMetrics();
    }
  }, [currentOrganization]);

  const fetchMetrics = async () => {
    if (!currentOrganization) return;

    try {
      setLoading(true);

      // Fetch basic counts
      const [
        { count: ingredientsCount },
        { count: recipesCount },
        { count: suppliersCount },
        { count: employeesCount },
        { count: uploadsCount }
      ] = await Promise.all([
        supabase
          .from('ingredients')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', currentOrganization.organization_id),
        supabase
          .from('recipes')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', currentOrganization.organization_id)
          .eq('status', 'active'),
        supabase
          .from('suppliers')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', currentOrganization.organization_id),
        supabase
          .from('memberships')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', currentOrganization.organization_id)
          .eq('is_active', true),
        supabase
          .from('file_uploads')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', currentOrganization.organization_id)
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      ]);

      // Calculate average food cost from recipes
      const { data: recipeCosts } = await supabase
        .from('recipe_costs')
        .select(`
          *,
          recipes!inner(organization_id, target_price)
        `)
        .eq('recipes.organization_id', currentOrganization.organization_id);

      let avgFoodCost = 0;
      let totalMonthlyCost = 0;

      if (recipeCosts && recipeCosts.length > 0) {
        const validCosts = recipeCosts.filter(rc => 
          rc.recipes.target_price && rc.recipes.target_price > 0 && rc.total_cost > 0
        );

        if (validCosts.length > 0) {
          const foodCosts = validCosts.map(rc => 
            (rc.total_cost / rc.recipes.target_price) * 100
          );
          avgFoodCost = foodCosts.reduce((sum, fc) => sum + fc, 0) / foodCosts.length;
        }

        totalMonthlyCost = recipeCosts.reduce((sum, rc) => sum + (rc.total_cost || 0), 0);
      }

      // Count price alerts (ingredients with significant price changes)
      const { data: ingredients } = await supabase
        .from('ingredients')
        .select('id, avg_price, last_price_update')
        .eq('organization_id', currentOrganization.organization_id)
        .not('avg_price', 'is', null);

      let priceAlerts = 0;
      if (ingredients) {
        // Simple heuristic: count ingredients updated in last 24h as potential alerts
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        priceAlerts = ingredients.filter(ing => 
          ing.last_price_update && new Date(ing.last_price_update) > oneDayAgo
        ).length;
      }

      setMetrics({
        totalIngredients: ingredientsCount || 0,
        totalRecipes: recipesCount || 0,
        totalSuppliers: suppliersCount || 0,
        activeEmployees: employeesCount || 0,
        averageFoodCost: avgFoodCost,
        totalMonthlyCost: totalMonthlyCost,
        priceAlerts: priceAlerts,
        recentUploads: uploadsCount || 0
      });

    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!currentOrganization) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Ingredients */}
      <Card>
        <CardContent className="p-4 text-center">
          <Package className="h-6 w-6 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold">{metrics.totalIngredients}</p>
          <p className="text-sm text-muted-foreground">Ingredientes</p>
        </CardContent>
      </Card>

      {/* Recipes */}
      <Card>
        <CardContent className="p-4 text-center">
          <Calculator className="h-6 w-6 text-secondary mx-auto mb-2" />
          <p className="text-2xl font-bold">{metrics.totalRecipes}</p>
          <p className="text-sm text-muted-foreground">Recetas</p>
        </CardContent>
      </Card>

      {/* Suppliers */}
      <Card>
        <CardContent className="p-4 text-center">
          <ShoppingCart className="h-6 w-6 text-accent mx-auto mb-2" />
          <p className="text-2xl font-bold">{metrics.totalSuppliers}</p>
          <p className="text-sm text-muted-foreground">Proveedores</p>
        </CardContent>
      </Card>

      {/* Employees */}
      <Card>
        <CardContent className="p-4 text-center">
          <Users className="h-6 w-6 text-warning mx-auto mb-2" />
          <p className="text-2xl font-bold">{metrics.activeEmployees}</p>
          <p className="text-sm text-muted-foreground">Empleados</p>
        </CardContent>
      </Card>

      {/* Food Cost */}
      <Card className="md:col-span-2">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Euro className="h-5 w-5 text-success" />
                <span className="text-sm font-medium">Food Cost Promedio</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-bold ${
                  metrics.averageFoodCost <= 25 ? 'text-success' : 
                  metrics.averageFoodCost <= 35 ? 'text-warning' : 'text-destructive'
                }`}>
                  {metrics.averageFoodCost.toFixed(1)}%
                </span>
                {metrics.averageFoodCost <= 25 ? (
                  <TrendingDown className="h-4 w-4 text-success" />
                ) : metrics.averageFoodCost > 35 ? (
                  <TrendingUp className="h-4 w-4 text-destructive" />
                ) : null}
              </div>
            </div>
            <Badge variant={
              metrics.averageFoodCost <= 25 ? 'default' : 
              metrics.averageFoodCost <= 35 ? 'secondary' : 'destructive'
            }>
              {metrics.averageFoodCost <= 25 ? 'Excelente' : 
               metrics.averageFoodCost <= 35 ? 'Aceptable' : 'Alto'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Cost */}
      <Card className="md:col-span-2">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Calculator className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Coste Estimado Mensual</span>
              </div>
              <span className="text-2xl font-bold">
                €{(metrics.totalMonthlyCost * 30).toLocaleString('es-ES', { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <div>€{metrics.totalMonthlyCost.toFixed(2)}/día</div>
              <div>Basado en recetas</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardContent className="p-4 text-center">
          <Clock className="h-6 w-6 text-blue-500 mx-auto mb-2" />
          <p className="text-2xl font-bold">{metrics.recentUploads}</p>
          <p className="text-sm text-muted-foreground">Subidas (7d)</p>
        </CardContent>
      </Card>

      {/* Price Alerts */}
      <Card>
        <CardContent className="p-4 text-center">
          <TrendingUp className="h-6 w-6 text-orange-500 mx-auto mb-2" />
          <p className="text-2xl font-bold">{metrics.priceAlerts}</p>
          <p className="text-sm text-muted-foreground">Alertas precio</p>
          {metrics.priceAlerts > 0 && (
            <Badge variant="secondary" className="mt-1 text-xs">
              Requieren revisión
            </Badge>
          )}
        </CardContent>
      </Card>
    </div>
  );
};