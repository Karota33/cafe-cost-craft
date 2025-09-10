import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Bell, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Edit, 
  Trash2,
  Package,
  AlertTriangle
} from 'lucide-react';

interface PriceAlert {
  id: string;
  ingredient_id: string;
  ingredient_name: string;
  threshold_percentage: number;
  alert_type: 'increase' | 'decrease' | 'both';
  is_active: boolean;
  last_triggered?: string;
  created_at: string;
}

interface PriceAlertsProps {
  organizationId: string;
  ingredientId?: string;
  className?: string;
}

export const PriceAlerts = ({ organizationId, ingredientId, className }: PriceAlertsProps) => {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<PriceAlert | null>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    ingredient_id: ingredientId || '',
    threshold_percentage: 10,
    alert_type: 'both' as 'increase' | 'decrease' | 'both'
  });

  useEffect(() => {
    fetchAlerts();
    fetchIngredients();
  }, [organizationId]);

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('price_alerts')
        .select(`
          *,
          ingredients(name)
        `)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedData: PriceAlert[] = (data || []).map(alert => ({
        id: alert.id,
        ingredient_id: alert.ingredient_id,
        ingredient_name: (alert.ingredients as any)?.name || 'Ingrediente desconocido',
        threshold_percentage: alert.threshold_percentage || 10,
        alert_type: (alert.alert_type as 'increase' | 'decrease' | 'both') || 'both',
        is_active: alert.is_active || false,
        last_triggered: alert.last_triggered || undefined,
        created_at: alert.created_at || new Date().toISOString()
      }));

      setAlerts(transformedData);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las alertas",
        variant: "destructive"
      });
    }
  };

  const fetchIngredients = async () => {
    try {
      const { data, error } = await supabase
        .from('ingredients')
        .select('id, name')
        .eq('organization_id', organizationId)
        .order('name');

      if (error) throw error;
      setIngredients(data || []);
    } catch (error) {
      console.error('Error fetching ingredients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAlert = async () => {
    try {
      const { error } = await supabase
        .from('price_alerts')
        .insert({
          organization_id: organizationId,
          ingredient_id: formData.ingredient_id,
          threshold_percentage: formData.threshold_percentage,
          alert_type: formData.alert_type,
          is_active: true
        });

      if (error) throw error;

      toast({
        title: "Alerta creada",
        description: "La alerta de precio se creó correctamente"
      });

      setIsDialogOpen(false);
      resetForm();
      fetchAlerts();
    } catch (error) {
      console.error('Error creating alert:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la alerta",
        variant: "destructive"
      });
    }
  };

  const handleUpdateAlert = async () => {
    if (!editingAlert) return;

    try {
      const { error } = await supabase
        .from('price_alerts')
        .update({
          threshold_percentage: formData.threshold_percentage,
          alert_type: formData.alert_type
        })
        .eq('id', editingAlert.id);

      if (error) throw error;

      toast({
        title: "Alerta actualizada",
        description: "La alerta se actualizó correctamente"
      });

      setIsDialogOpen(false);
      setEditingAlert(null);
      resetForm();
      fetchAlerts();
    } catch (error) {
      console.error('Error updating alert:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la alerta",
        variant: "destructive"
      });
    }
  };

  const handleDeleteAlert = async (id: string) => {
    try {
      const { error } = await supabase
        .from('price_alerts')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Alerta eliminada",
        description: "La alerta se eliminó correctamente"
      });

      fetchAlerts();
    } catch (error) {
      console.error('Error deleting alert:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la alerta",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      ingredient_id: ingredientId || '',
      threshold_percentage: 10,
      alert_type: 'both'
    });
  };

  const openEditDialog = (alert: PriceAlert) => {
    setEditingAlert(alert);
    setFormData({
      ingredient_id: alert.ingredient_id,
      threshold_percentage: alert.threshold_percentage,
      alert_type: alert.alert_type
    });
    setIsDialogOpen(true);
  };

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case 'increase':
        return <TrendingUp className="h-4 w-4 text-destructive" />;
      case 'decrease':
        return <TrendingDown className="h-4 w-4 text-success" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-warning" />;
    }
  };

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case 'increase':
        return 'Subida';
      case 'decrease':
        return 'Bajada';
      default:
        return 'Ambas';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-muted rounded"></div>
            <div className="h-3 bg-muted rounded w-3/4"></div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Alertas de Precio</h3>
            <Badge variant="outline">{alerts.length}</Badge>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => {
                setEditingAlert(null);
                resetForm();
              }}>
                <Plus className="h-4 w-4 mr-1" />
                Nueva Alerta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingAlert ? 'Editar Alerta' : 'Nueva Alerta de Precio'}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="ingredient">Ingrediente</Label>
                  <Select
                    value={formData.ingredient_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, ingredient_id: value }))}
                    disabled={!!editingAlert}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar ingrediente" />
                    </SelectTrigger>
                    <SelectContent>
                      {ingredients.map(ingredient => (
                        <SelectItem key={ingredient.id} value={ingredient.id}>
                          {ingredient.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="threshold">Umbral de cambio (%)</Label>
                  <Input
                    id="threshold"
                    type="number"
                    min="1"
                    max="100"
                    value={formData.threshold_percentage}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      threshold_percentage: parseInt(e.target.value) || 10 
                    }))}
                  />
                </div>

                <div>
                  <Label htmlFor="alert_type">Tipo de alerta</Label>
                  <Select
                    value={formData.alert_type}
                    onValueChange={(value: 'increase' | 'decrease' | 'both') => 
                      setFormData(prev => ({ ...prev, alert_type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="increase">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-destructive" />
                          Solo subidas
                        </div>
                      </SelectItem>
                      <SelectItem value="decrease">
                        <div className="flex items-center gap-2">
                          <TrendingDown className="h-4 w-4 text-success" />
                          Solo bajadas
                        </div>
                      </SelectItem>
                      <SelectItem value="both">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-warning" />
                          Subidas y bajadas
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={editingAlert ? handleUpdateAlert : handleCreateAlert}
                    disabled={!formData.ingredient_id}
                    className="flex-1"
                  >
                    {editingAlert ? 'Actualizar' : 'Crear'} Alerta
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {alerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No hay alertas configuradas</p>
            <p className="text-sm">Crea alertas para recibir notificaciones cuando cambien los precios</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map(alert => (
              <div key={alert.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getAlertTypeIcon(alert.alert_type)}
                      <span className="font-medium">{alert.ingredient_name}</span>
                      <Badge variant="outline" className="text-xs">
                        ±{alert.threshold_percentage}%
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Alerta de {getAlertTypeLabel(alert.alert_type).toLowerCase()} de precio
                    </p>
                    {alert.last_triggered && (
                      <p className="text-xs text-muted-foreground">
                        Última activación: {formatDate(alert.last_triggered)}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(alert)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteAlert(alert.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};