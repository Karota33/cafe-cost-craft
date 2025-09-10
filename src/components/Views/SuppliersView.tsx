import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Search, 
  Building2, 
  Clock, 
  Phone, 
  Plus, 
  Loader2,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Supplier {
  id: string;
  name: string;
  contact: string | null;
  lead_time_days: number | null;
  created_at: string;
}

export const SuppliersView = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name, contact, lead_time_days, created_at')
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      setSuppliers(data || []);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (supplier.contact && supplier.contact.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gradient">Proveedores</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona tu red de proveedores
          </p>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Cargando proveedores...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gradient">Proveedores</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona tu red de proveedores
          </p>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error al cargar datos</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchSuppliers} variant="outline">
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gradient">Proveedores</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona tu red de proveedores
          </p>
        </div>
        <Button className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Proveedor
        </Button>
      </div>

      {/* Search and Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="md:col-span-2">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar proveedores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Building2 className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">{suppliers.length}</p>
            <p className="text-sm text-muted-foreground">Proveedores</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 text-warning mx-auto mb-2" />
            <p className="text-2xl font-bold">
              {suppliers.length > 0 
                ? Math.round(suppliers.reduce((acc, s) => acc + (s.lead_time_days || 1), 0) / suppliers.length)
                : 0
              }
            </p>
            <p className="text-sm text-muted-foreground">Días promedio</p>
          </CardContent>
        </Card>
      </div>

      {/* Suppliers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Lista de Proveedores
          </CardTitle>
          <CardDescription>
            {filteredSuppliers.length} de {suppliers.length} proveedores mostrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSuppliers.length === 0 ? (
            <div className="p-8 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm ? "No se encontraron proveedores" : "No hay proveedores registrados"}
              </h3>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? "Intenta ajustar el término de búsqueda"
                  : "Comienza agregando tu primer proveedor"
                }
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead className="text-center">Tiempo de entrega</TableHead>
                  <TableHead className="text-center">Fecha registro</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.map((supplier) => (
                  <TableRow key={supplier.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{supplier.name}</p>
                          <p className="text-sm text-muted-foreground">
                            ID: {supplier.id.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {supplier.contact ? (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{supplier.contact}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">
                        {supplier.lead_time_days || 1} días
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {formatDate(supplier.created_at)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="default" className="bg-success text-success-foreground">
                        Activo
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};