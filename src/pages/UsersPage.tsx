import { useState, useEffect } from "react";
import { Header } from "@/components/Layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Users, 
  Plus, 
  Crown,
  Shield,
  UserCheck,
  ChefHat,
  Utensils,
  Clock,
  Mail,
  UserPlus,
  Trash2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
}

interface Membership {
  id: string;
  role: string;
  is_active: boolean;
  accepted_at: string | null;
  invited_at: string | null;
  profile: Profile;
}

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

export default function UsersPage() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('kitchen_staff');
  const [inviting, setInviting] = useState(false);
  
  const { currentOrganization } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (currentOrganization) {
      fetchMemberships();
    }
  }, [currentOrganization]);

  const fetchMemberships = async () => {
    if (!currentOrganization) return;

    try {
      const { data, error } = await supabase
        .from('memberships')
        .select(`
          id,
          role,
          is_active,
          accepted_at,
          invited_at,
          profiles!memberships_user_id_fkey (
            id,
            email,
            first_name,
            last_name,
            phone
          )
        `)
        .eq('organization_id', currentOrganization.organization_id)
        .order('invited_at', { ascending: false });

      if (error) throw error;

      setMemberships(data.map(m => ({
        id: m.id,
        role: m.role,
        is_active: m.is_active,
        accepted_at: m.accepted_at,
        invited_at: m.invited_at,
        profile: m.profiles as Profile
      })));
    } catch (error) {
      console.error('Error fetching memberships:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const inviteUser = async () => {
    if (!currentOrganization || !inviteEmail.trim()) return;

    try {
      setInviting(true);

      // Check if user already exists
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', inviteEmail.trim())
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      if (existingProfile) {
        // User exists, check if they're already a member
        const { data: existingMembership, error: membershipError } = await supabase
          .from('memberships')
          .select('id')
          .eq('user_id', existingProfile.id)
          .eq('organization_id', currentOrganization.organization_id)
          .single();

        if (!membershipError) {
          toast({
            title: "Usuario ya existe",
            description: "Este usuario ya es miembro de la organización",
            variant: "destructive"
          });
          return;
        }

        // Add existing user to organization
        const { error: addError } = await supabase
          .from('memberships')
          .insert({
            user_id: existingProfile.id,
            organization_id: currentOrganization.organization_id,
            role: inviteRole as any,
            is_active: true,
            accepted_at: new Date().toISOString()
          });

        if (addError) throw addError;
      } else {
        // User doesn't exist, create invitation
        toast({
          title: "Funcionalidad en desarrollo",
          description: "La invitación por email estará disponible pronto. Por ahora, el usuario debe registrarse primero.",
        });
        return;
      }

      toast({
        title: "Usuario añadido",
        description: `Usuario añadido a la organización como ${getRoleLabel(inviteRole)}`,
      });

      setInviteEmail('');
      setInviteRole('kitchen_staff');
      setShowInviteForm(false);
      await fetchMemberships();
    } catch (error) {
      console.error('Error inviting user:', error);
      toast({
        title: "Error",
        description: "No se pudo invitar al usuario",
        variant: "destructive"
      });
    } finally {
      setInviting(false);
    }
  };

  const removeMember = async (membershipId: string) => {
    try {
      const { error } = await supabase
        .from('memberships')
        .update({ is_active: false })
        .eq('id', membershipId);

      if (error) throw error;

      toast({
        title: "Usuario removido",
        description: "El usuario ha sido removido de la organización",
      });

      await fetchMemberships();
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: "Error",
        description: "No se pudo remover al usuario",
        variant: "destructive"
      });
    }
  };

  if (!currentOrganization) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <Header />
        <div className="max-w-6xl mx-auto p-6">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-xl font-semibold mb-2">Selecciona una organización</h2>
              <p className="text-muted-foreground">Debes seleccionar una organización para gestionar usuarios</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gradient">Gestión de Usuarios</h1>
            <p className="text-muted-foreground mt-1">
              Administra el equipo de {currentOrganization.organization.name}
            </p>
          </div>
          <Button onClick={() => setShowInviteForm(true)} disabled={showInviteForm}>
            <UserPlus className="h-4 w-4 mr-2" />
            Añadir Usuario
          </Button>
        </div>

        {showInviteForm && (
          <Card>
            <CardHeader>
              <CardTitle>Añadir Nuevo Usuario</CardTitle>
              <CardDescription>Invita a un usuario existente o crea una nueva invitación</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email del usuario</Label>
                  <Input
                    id="email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="usuario@ejemplo.com"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Rol</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="kitchen_staff">Personal Cocina</SelectItem>
                      <SelectItem value="hall_staff">Personal Sala</SelectItem>
                      <SelectItem value="hr_manager">Manager RRHH</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button onClick={inviteUser} disabled={inviting || !inviteEmail.trim()}>
                    {inviting ? 'Añadiendo...' : 'Añadir Usuario'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowInviteForm(false)} disabled={inviting}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Miembros del Equipo ({memberships.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-2">Cargando usuarios...</p>
              </div>
            ) : memberships.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay usuarios</h3>
                <p className="text-muted-foreground mb-4">Añade el primer miembro del equipo</p>
                <Button onClick={() => setShowInviteForm(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Añadir Primer Usuario
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {memberships.map((membership) => (
                  <div 
                    key={membership.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {getRoleIcon(membership.role)}
                        <div>
                          <h4 className="font-semibold">
                            {membership.profile.first_name && membership.profile.last_name
                              ? `${membership.profile.first_name} ${membership.profile.last_name}`
                              : membership.profile.email
                            }
                          </h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {membership.profile.email}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={membership.is_active ? "default" : "secondary"}>
                        {getRoleLabel(membership.role)}
                      </Badge>
                      {membership.accepted_at ? (
                        <Badge variant="outline" className="text-green-600">
                          Activo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-yellow-600">
                          Pendiente
                        </Badge>
                      )}
                      {membership.role !== 'owner' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMember(membership.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}