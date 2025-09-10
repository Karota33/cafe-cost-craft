import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  BarChart3, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  ArrowRight,
  Package,
  Euro,
  Percent
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface ComparisonData {
  id: string;
  name: string;
  suppliers: {
    id: string;
    name: string;
    price: number;
    unit: string;
    lastUpdate: string;
    quality: 'premium' | 'standard' | 'basic';
    deliveryTime: number;
    minOrder: number;
  }[];
  category: string;
  averagePrice: number;
  bestPrice: number;
  worstPrice: number;
  priceSpread: number;
  recommendedSupplier: string;
}

interface ComparisonModalProps {
  ingredients: string[];
  onClose: () => void;
  open: boolean;
}

// Mock data for demonstration
const mockComparisonData: ComparisonData[] = [
  {
    id: '1',
    name: 'Aceite de oliva virgen extra',
    category: 'Aceites',
    averagePrice: 15.50,
    bestPrice: 12.30,
    worstPrice: 18.90,
    priceSpread: 6.60,
    recommendedSupplier: 'Distribuidora Gourmet',
    suppliers: [
      {
        id: '1',
        name: 'Distribuidora Gourmet',
        price: 12.30,
        unit: 'L',
        lastUpdate: '2024-01-10',
        quality: 'premium',
        deliveryTime: 2,
        minOrder: 20
      },
      {
        id: '2',
        name: 'Mayorista Central',
        price: 14.80,
        unit: 'L',
        lastUpdate: '2024-01-09',
        quality: 'standard',
        deliveryTime: 1,
        minOrder: 10
      },
      {
        id: '3',
        name: 'Proveedor Local',
        price: 18.90,
        unit: 'L',
        lastUpdate: '2024-01-08',
        quality: 'premium',
        deliveryTime: 3,
        minOrder: 50
      }
    ]
  }
];

export const ComparisonModal = ({ ingredients, onClose, open }: ComparisonModalProps) => {
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>(ingredients);
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
  const { toast } = useToast();

  const comparisonData = useMemo(() => {
    return mockComparisonData.filter(item => selectedIngredients.includes(item.id));
  }, [selectedIngredients]);

  const chartData = useMemo(() => {
    return comparisonData.flatMap(ingredient =>
      ingredient.suppliers.map(supplier => ({
        name: `${ingredient.name} - ${supplier.name}`,
        ingredient: ingredient.name,
        supplier: supplier.name,
        price: supplier.price,
        quality: supplier.quality,
        deliveryTime: supplier.deliveryTime
      }))
    );
  }, [comparisonData]);

  const handleExportCSV = () => {
    const csvData = comparisonData.flatMap(ingredient =>
      ingredient.suppliers.map(supplier => ({
        Ingrediente: ingredient.name,
        Proveedor: supplier.name,
        Precio: supplier.price,
        Unidad: supplier.unit,
        Calidad: supplier.quality,
        'Tiempo Entrega': supplier.deliveryTime,
        'Pedido Mínimo': supplier.minOrder,
        'Última Actualización': supplier.lastUpdate
      }))
    );

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparacion-precios-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export completado",
      description: "La comparación se descargó correctamente"
    });
  };

  const getQualityBadge = (quality: string) => {
    const qualityConfig = {
      premium: { label: 'Premium', variant: 'default' as const, color: 'text-primary' },
      standard: { label: 'Estándar', variant: 'secondary' as const, color: 'text-muted-foreground' },
      basic: { label: 'Básico', variant: 'outline' as const, color: 'text-muted-foreground' }
    };
    
    const config = qualityConfig[quality as keyof typeof qualityConfig] || qualityConfig.standard;
    return (
      <Badge variant={config.variant} className={`text-xs ${config.color}`}>
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

  const calculateSavings = (ingredient: ComparisonData) => {
    const savings = ingredient.worstPrice - ingredient.bestPrice;
    const percentage = (savings / ingredient.worstPrice) * 100;
    return { amount: savings, percentage };
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Comparador de Precios
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Controls */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                Tabla
              </Button>
              <Button
                variant={viewMode === 'chart' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('chart')}
              >
                Gráfico
              </Button>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-1" />
                Exportar CSV
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {comparisonData.map(ingredient => {
              const savings = calculateSavings(ingredient);
              return (
                <Card key={ingredient.id} className="p-4">
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-semibold truncate">{ingredient.name}</h4>
                      <Badge variant="outline" className="text-xs mt-1">
                        {ingredient.category}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Mejor precio:</span>
                        <span className="font-medium text-success">
                          {formatPrice(ingredient.bestPrice)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Precio promedio:</span>
                        <span className="font-medium">
                          {formatPrice(ingredient.averagePrice)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Ahorro potencial:</span>
                        <div className="text-right">
                          <span className="font-medium text-success">
                            {formatPrice(savings.amount)}
                          </span>
                          <div className="text-xs text-success">
                            ({savings.percentage.toFixed(1)}%)
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t">
                      <div className="flex items-center gap-1 text-xs text-primary">
                        <Package className="h-3 w-3" />
                        <span>Recomendado: {ingredient.recommendedSupplier}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Content */}
          {viewMode === 'table' ? (
            <div className="space-y-6">
              {comparisonData.map(ingredient => (
                <Card key={ingredient.id} className="overflow-hidden">
                  <div className="p-4 bg-muted/50 border-b">
                    <h3 className="font-semibold">{ingredient.name}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span>{ingredient.suppliers.length} proveedores</span>
                      <span>•</span>
                      <span>Rango: {formatPrice(ingredient.bestPrice)} - {formatPrice(ingredient.worstPrice)}</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/30">
                        <tr className="text-left">
                          <th className="p-3 font-medium">Proveedor</th>
                          <th className="p-3 font-medium">Precio</th>
                          <th className="p-3 font-medium">Calidad</th>
                          <th className="p-3 font-medium">Entrega</th>
                          <th className="p-3 font-medium">Mín. Pedido</th>
                          <th className="p-3 font-medium">Actualizado</th>
                          <th className="p-3 font-medium">Ahorro</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ingredient.suppliers
                          .sort((a, b) => a.price - b.price)
                          .map((supplier, index) => {
                            const savings = ingredient.worstPrice - supplier.price;
                            const isRecommended = supplier.name === ingredient.recommendedSupplier;
                            const isBest = index === 0;
                            
                            return (
                              <tr 
                                key={supplier.id} 
                                className={`border-b hover:bg-muted/50 ${isRecommended ? 'bg-primary/5' : ''}`}
                              >
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{supplier.name}</span>
                                    {isRecommended && (
                                      <Badge variant="default" className="text-xs">
                                        Recomendado
                                      </Badge>
                                    )}
                                    {isBest && (
                                      <Badge variant="outline" className="text-xs text-success">
                                        Mejor precio
                                      </Badge>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3">
                                  <span className={`font-semibold ${isBest ? 'text-success' : ''}`}>
                                    {formatPrice(supplier.price)}/{supplier.unit}
                                  </span>
                                </td>
                                <td className="p-3">
                                  {getQualityBadge(supplier.quality)}
                                </td>
                                <td className="p-3 text-sm">
                                  {supplier.deliveryTime} días
                                </td>
                                <td className="p-3 text-sm">
                                  {supplier.minOrder} ud.
                                </td>
                                <td className="p-3 text-sm text-muted-foreground">
                                  {new Date(supplier.lastUpdate).toLocaleDateString('es-ES')}
                                </td>
                                <td className="p-3">
                                  {savings > 0 ? (
                                    <div className="text-sm">
                                      <span className="text-success font-medium">
                                        {formatPrice(savings)}
                                      </span>
                                      <div className="text-xs text-success">
                                        ({((savings / ingredient.worstPrice) * 100).toFixed(1)}%)
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-4">
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      fontSize={12}
                    />
                    <YAxis 
                      tickFormatter={(value) => `${value}€`}
                      fontSize={12}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${value.toFixed(2)}€`, 'Precio']}
                      labelFormatter={(label) => `${label}`}
                    />
                    <Bar 
                      dataKey="price" 
                      fill="hsl(var(--primary))"
                      name="Precio"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};