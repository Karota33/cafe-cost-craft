import { useState, useEffect } from "react";
import { Header } from "@/components/Layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
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
  Users
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  
  const { user, memberships, currentOrganization, setCurrentOrganization, refreshMemberships } = useAuth();
  const { toast } = useToast();

  const createOrganization = async () => {
    if (!user || !newOrgName.trim()) return;

    try {
      setCreating(true);

      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert([{
          name: newOrgName.trim(),
          igic_default: 0.070,
          timezone: 'Atlantic/Canary'
        }])
        .select()
        .single();

      if (orgError) throw orgError;

      const { error: membershipError } = await supabase
        .from('memberships')
        .insert([{
          user_id: user.id,
          organization_id: orgData.id,
          role: 'owner',
          is_active: true,
          accepted_at: new Date().toISOString()
        }]);

      if (membershipError) throw membershipError;

      toast({
        title: "Organización creada",
        description: `${newOrgName} ha sido creada exitosamente`,
      });

      setNewOrgName('');
      setShowForm(false);
      await refreshMemberships();
    } catch (error) {
      console.error('Error creating organization:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la organización",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
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
            <h1 className="text-3xl font-bold text-gradient">Mis Organizaciones</h1>
            <p className="text-muted-foreground mt-1">Gestiona tus empresas y restaurantes</p>
          </div>
          <Button onClick={() => setShowForm(true)} disabled={showForm}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Organización
          </Button>
        </div>

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>Crear Nueva Organización</CardTitle>
              <CardDescription>Crea una nueva empresa o establecimiento para gestionar</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="orgName">Nombre de la organización</Label>
                  <Input
                    id="orgName"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    placeholder="Ej: Restaurante El Volcán"
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button onClick={createOrganization} disabled={creating || !newOrgName.trim()}>
                    {creating ? 'Creando...' : 'Crear'}
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
            <CardTitle>Tus Organizaciones ({memberships.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {memberships.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No tienes organizaciones</h3>
                <p className="text-muted-foreground mb-4">Crea tu primera organización</p>
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Primera Organización
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {memberships.map((membership) => (
                  <Card 
                    key={membership.id}
                    className={`cursor-pointer transition-all hover:shadow-card ${
                      currentOrganization?.organization_id === membership.organization_id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setCurrentOrganization(membership)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-5 w-5 text-primary" />
                          <h4 className="font-semibold truncate">{membership.organization.name}</h4>
                        </div>
                        {currentOrganization?.organization_id === membership.organization_id && (
                          <Badge variant="default" className="text-xs">Actual</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
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