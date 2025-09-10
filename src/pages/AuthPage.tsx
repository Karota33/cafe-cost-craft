import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { LogIn, UserPlus, Building2, ChefHat } from "lucide-react";

interface AuthPageProps {
  onSuccess?: () => void;
}

export const AuthPage = ({ onSuccess }: AuthPageProps) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: ''
  });

  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let result;
      
      if (isSignUp) {
        result = await signUp(
          formData.email,
          formData.password,
          formData.firstName,
          formData.lastName
        );
      } else {
        result = await signIn(formData.email, formData.password);
      }

      if (result.error) {
        toast({
          title: "Error de autenticación",
          description: result.error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: isSignUp ? "Cuenta creada" : "Sesión iniciada",
          description: isSignUp 
            ? "Revisa tu email para confirmar la cuenta" 
            : "Bienvenido al sistema",
        });
        onSuccess?.();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Ha ocurrido un error inesperado",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <ChefHat className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-gradient">DRAGO COFFEE</h1>
          </div>
          <h2 className="text-xl font-semibold">
            {isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}
          </h2>
          <p className="text-muted-foreground">
            {isSignUp 
              ? 'Regístrate para gestionar tu negocio gastronómico'
              : 'Accede a tu panel de control gastronómico'
            }
          </p>
        </div>

        {/* Auth Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isSignUp ? <UserPlus className="h-5 w-5" /> : <LogIn className="h-5 w-5" />}
              {isSignUp ? 'Registro' : 'Acceso'}
            </CardTitle>
            <CardDescription>
              {isSignUp 
                ? 'Completa los datos para crear tu cuenta'
                : 'Introduce tus credenciales para acceder'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Nombre</Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      placeholder="Tu nombre"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Apellidos</Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      placeholder="Tus apellidos"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="tu@email.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
              >
                {loading ? 'Procesando...' : (isSignUp ? 'Crear cuenta' : 'Iniciar sesión')}
              </Button>
            </form>

            <Separator className="my-4" />

            <div className="text-center">
              <Button
                variant="link"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm"
              >
                {isSignUp 
                  ? '¿Ya tienes cuenta? Inicia sesión'
                  : '¿No tienes cuenta? Regístrate'
                }
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardContent className="p-4">
            <div className="text-center space-y-3">
              <Building2 className="h-8 w-8 text-primary mx-auto" />
              <h3 className="font-semibold">Sistema Gastronómico Profesional</h3>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>• Gestión de proveedores</div>
                <div>• Control de costes</div>
                <div>• Recetas y escandallos</div>
                <div>• Gestión de personal</div>
                <div>• Horarios y turnos</div>
                <div>• Multi-organización</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};