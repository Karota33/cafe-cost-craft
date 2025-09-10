import { useState, useEffect } from "react";
import { Header } from "@/components/Layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Building2, 
  Plus, 
  Crown,
  Shield,
  UserCheck,
  ChefHat,
  Utensils,
  Clock,
  Users,
  Trash2,
  MoreVertical
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'owner': return <Crown className="h-4 w-4" />;
    case 'admin': return <Shield className="h-4 w-4" />;
    case 'manager': return <UserCheck className="h-4 w-4" />;
    case 'kitchen_staff': return <ChefHat className="h-4 w-4" />;
    case 'hall_staff': return <Utensils className="h-4 w-4" />;
    case 'hr_manager': return <Clock className="h-4 w-4" />;
    default: return <Users className="h-4 w-4" />;
  }
};

const getRoleLabel = (role: string) => {
  const labels = {
    owner: 'Propietario',
    admin: 'Administrador',
    manager: 'Manager',
    kitchen_staff: 'Personal Cocina',
    hall_staff: 'Personal Sala',
    hr_manager: 'Manager RRHH'
  };
  return labels[role as keyof typeof labels] || role;
};

export const OrganizationsPage = () => {
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  
  const { user, memberships, currentOrganization, setCurrentOrganization, refreshMemberships } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const createOrganization = async () => {
    if (!user || !newOrgName.trim()) return;

    try {
      setCreating(true);

      // Use RPC function to create organization and membership atomically
      const { data: orgData, error: orgError } = await supabase
        .rpc('create_org_with_owner', {
          p_name: newOrgName.trim(),
          p_timezone: 'Atlantic/Canary',
          p_igic: 0.070
        })
        .single();

      if (orgError || !orgData) throw orgError || new Error('No se pudo crear la empresa');

      const orgId = (orgData as any).id;
      toast({
        title: "Empresa creada",
        description: `${newOrgName} ha sido añadida como cliente exitosamente`,
      });

      setNewOrgName('');
      setShowForm(false);
      await refreshMemberships();

      // Seleccionar automáticamente la empresa creada y navegar al dashboard
      const { data: createdMembership } = await supabase
        .from('memberships')
        .select('id, organization_id, role, is_active, organization:organizations(id, name)')
        .eq('user_id', user.id)
        .eq('organization_id', orgId)
        .maybeSingle();

      if (createdMembership) {
        setCurrentOrganization(createdMembership as any);
        navigate('/');
      }
    } catch (error) {
      console.error('Error creating organization:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la empresa",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  const deleteOrganization = async (organizationId: string, organizationName: string) => {
    if (!user) return;

    try {
      setDeleting(organizationId);

      // First delete all memberships for this organization
      const { error: membershipError } = await supabase
        .from('memberships')
        .delete()
        .eq('organization_id', organizationId);

      if (membershipError) throw membershipError;

      // Then delete the organization
      const { error: orgError } = await supabase
        .from('organizations')
        .delete()
        .eq('id', organizationId);

      if (orgError) throw orgError;

      toast({
        title: "Empresa eliminada",
        description: `${organizationName} ha sido eliminada exitosamente`,
      });

      // If the deleted organization was the current one, clear it
      if (currentOrganization?.organization_id === organizationId) {
        setCurrentOrganization(null);
      }

      await refreshMemberships();
    } catch (error) {
      console.error('Error deleting organization:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la empresa",
        variant: "destructive"
      });
    } finally {
      setDeleting(null);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">Acceso requerido</h2>
            <p className="text-muted-foreground">Debes iniciar sesión para ver las organizaciones</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gradient">Mis Empresas</h1>
            <p className="text-muted-foreground mt-1">Gestiona todas las empresas gastronómicas de tus clientes</p>
          </div>
          <Button onClick={() => setShowForm(true)} disabled={showForm}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Empresa
          </Button>
        </div>

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>Añadir Nueva Empresa Cliente</CardTitle>
              <CardDescription>Crea una nueva empresa gastronómica para gestionar como cliente</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="orgName">Nombre de la empresa</Label>
                  <Input
                    id="orgName"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    placeholder="Ej: Restaurante El Volcán, Cafetería Central..."
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button onClick={createOrganization} disabled={creating || !newOrgName.trim()}>
                    {creating ? 'Creando...' : 'Crear Empresa'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowForm(false)} disabled={creating}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Empresas Clientes ({memberships.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {memberships.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No tienes empresas</h3>
                <p className="text-muted-foreground mb-4">Crea tu primera empresa cliente para gestionar</p>
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Primera Empresa
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {memberships.map((membership) => (
                  <Card 
                    key={membership.id}
                    className={`transition-all hover:shadow-card ${
                      currentOrganization?.organization_id === membership.organization_id ? 'ring-2 ring-primary' : ''
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div 
                          className="flex items-center gap-2 flex-1 cursor-pointer"
                          onClick={() => { setCurrentOrganization(membership as any); navigate('/'); }}
                        >
                          <Building2 className="h-5 w-5 text-primary" />
                          <h4 className="font-semibold truncate">{membership.organization.name}</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          {currentOrganization?.organization_id === membership.organization_id && (
                            <Badge variant="default" className="text-xs">Actual</Badge>
                          )}
                          {membership.role === 'owner' && (
                            <AlertDialog>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem className="text-destructive">
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Eliminar empresa
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                </DropdownMenuContent>
                              </DropdownMenu>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Eliminar empresa?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta acción eliminará permanentemente "{membership.organization.name}" y todos sus datos asociados (ingredientes, proveedores, recetas, etc.). Esta acción no se puede deshacer.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteOrganization(membership.organization_id, membership.organization.name)}
                                    disabled={deleting === membership.organization_id}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    {deleting === membership.organization_id ? 'Eliminando...' : 'Eliminar'}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                      <div 
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => { setCurrentOrganization(membership as any); navigate('/'); }}
                      >
                        {getRoleIcon(membership.role)}
                        <span className="text-sm text-muted-foreground">{getRoleLabel(membership.role)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OrganizationsPage;