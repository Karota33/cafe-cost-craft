import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  Plus, 
  Calendar as CalendarIcon, 
  Clock, 
  Search,
  UserPlus,
  Edit3,
  Trash2,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

interface Employee {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  is_active: boolean;
}

interface Schedule {
  id: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  break_duration: number;
  status: string;
  notes: string | null;
  employee: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
}

export const HRView = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'employees' | 'schedules'>('employees');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const { currentOrganization, hasRole } = useAuth();
  const { toast } = useToast();

  const canManageHR = hasRole(['owner', 'admin', 'hr_manager']);

  useEffect(() => {
    if (currentOrganization) {
      fetchEmployees();
      fetchSchedules();
    }
  }, [currentOrganization]);

  const fetchEmployees = async () => {
    if (!currentOrganization) return;

    try {
      const { data, error } = await supabase
        .from('memberships')
        .select(`
          user_id,
          role,
          is_active,
          profiles!user_id (
            id,
            email,
            first_name,
            last_name
          )
        `)
        .eq('organization_id', currentOrganization.organization_id);

      if (error) {
        console.error('Error fetching employees:', error);
        return;
      }

      const formattedEmployees = data?.map(membership => ({
        id: membership.user_id,
        email: membership.profiles.email,
        first_name: membership.profiles.first_name,
        last_name: membership.profiles.last_name,
        role: membership.role,
        is_active: membership.is_active
      })) || [];

      setEmployees(formattedEmployees);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchSchedules = async () => {
    if (!currentOrganization || !selectedDate) return;

    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('employee_schedules')
        .select(`
          *,
          profiles!user_id (
            first_name,
            last_name,
            email
          )
        `)
        .eq('organization_id', currentOrganization.organization_id)
        .eq('date', dateStr)
        .order('start_time');

      if (error) {
        console.error('Error fetching schedules:', error);
        return;
      }

      const formattedSchedules = data?.map(schedule => ({
        ...schedule,
        employee: {
          first_name: schedule.profiles.first_name,
          last_name: schedule.profiles.last_name,
          email: schedule.profiles.email
        }
      })) || [];

      setSchedules(formattedSchedules);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDate && currentOrganization) {
      fetchSchedules();
    }
  }, [selectedDate, currentOrganization]);

  const filteredEmployees = employees.filter(employee => {
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${employee.first_name || ''} ${employee.last_name || ''}`.toLowerCase();
    return fullName.includes(searchLower) || employee.email.toLowerCase().includes(searchLower);
  });

  const getRoleBadge = (role: string) => {
    const variants = {
      owner: 'default',
      admin: 'default',
      manager: 'secondary',
      hr_manager: 'secondary',
      kitchen_staff: 'outline',
      hall_staff: 'outline'
    } as const;

    const labels = {
      owner: 'Propietario',
      admin: 'Admin',
      manager: 'Manager',
      hr_manager: 'RRHH',
      kitchen_staff: 'Cocina',
      hall_staff: 'Sala'
    };

    return (
      <Badge variant={variants[role as keyof typeof variants] || 'outline'}>
        {labels[role as keyof typeof labels] || role}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      scheduled: 'secondary',
      confirmed: 'default',
      completed: 'default',
      cancelled: 'destructive'
    } as const;

    const labels = {
      scheduled: 'Programado',
      confirmed: 'Confirmado',
      completed: 'Completado',
      cancelled: 'Cancelado'
    };

    const icons = {
      scheduled: <Clock className="h-3 w-3 mr-1" />,
      confirmed: <CheckCircle className="h-3 w-3 mr-1" />,
      completed: <CheckCircle className="h-3 w-3 mr-1" />,
      cancelled: <AlertCircle className="h-3 w-3 mr-1" />
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'} className="flex items-center">
        {icons[status as keyof typeof icons]}
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const formatTime = (time: string) => {
    return format(new Date(`1970-01-01T${time}`), 'HH:mm');
  };

  const getEmployeeName = (employee: Employee) => {
    if (employee.first_name || employee.last_name) {
      return `${employee.first_name || ''} ${employee.last_name || ''}`.trim();
    }
    return employee.email;
  };

  if (!currentOrganization) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Selecciona una organización</h3>
        <p className="text-muted-foreground">
          Necesitas seleccionar una organización para gestionar el personal
        </p>
      </div>
    );
  }

  if (!canManageHR) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Acceso restringido</h3>
        <p className="text-muted-foreground">
          No tienes permisos para gestionar recursos humanos en esta organización
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gradient">Recursos Humanos</h1>
        <p className="text-muted-foreground mt-1">
          Gestiona personal, horarios y asistencia de {currentOrganization.organization.name}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Button 
          variant={activeTab === 'employees' ? 'default' : 'outline'}
          onClick={() => setActiveTab('employees')}
        >
          <Users className="h-4 w-4 mr-2" />
          Personal ({employees.length})
        </Button>
        <Button 
          variant={activeTab === 'schedules' ? 'default' : 'outline'}
          onClick={() => setActiveTab('schedules')}
        >
          <CalendarIcon className="h-4 w-4 mr-2" />
          Horarios
        </Button>
      </div>

      {/* Employees Tab */}
      {activeTab === 'employees' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Personal de la Organización</CardTitle>
                  <CardDescription>
                    Gestiona los empleados y sus roles
                  </CardDescription>
                </div>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invitar Empleado
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar empleados..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{getEmployeeName(employee)}</p>
                          <p className="text-sm text-muted-foreground">
                            ID: {employee.id.slice(0, 8)}...
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell>{getRoleBadge(employee.role)}</TableCell>
                      <TableCell>
                        <Badge variant={employee.is_active ? 'default' : 'secondary'}>
                          {employee.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost">
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredEmployees.length === 0 && (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No hay empleados</h3>
                  <p className="text-muted-foreground">
                    {searchTerm ? 'No se encontraron empleados con ese criterio' : 'Invita a tu primer empleado'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Schedules Tab */}
      {activeTab === 'schedules' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Horarios y Turnos</CardTitle>
                  <CardDescription>
                    Programa y gestiona los horarios del personal
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {selectedDate ? format(selectedDate, 'dd/MM/yyyy', { locale: es }) : 'Seleccionar fecha'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        initialFocus
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Programar Turno
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {selectedDate && (
                <div className="mb-4">
                  <h4 className="font-medium">
                    Horarios para {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: es })}
                  </h4>
                </div>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Hora inicio</TableHead>
                    <TableHead>Hora fin</TableHead>
                    <TableHead>Descanso</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Notas</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map((schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {schedule.employee.first_name || schedule.employee.last_name
                              ? `${schedule.employee.first_name || ''} ${schedule.employee.last_name || ''}`.trim()
                              : schedule.employee.email
                            }
                          </p>
                          <p className="text-sm text-muted-foreground">{schedule.employee.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{formatTime(schedule.start_time)}</TableCell>
                      <TableCell>{formatTime(schedule.end_time)}</TableCell>
                      <TableCell>
                        {schedule.break_duration > 0 ? `${schedule.break_duration} min` : '—'}
                      </TableCell>
                      <TableCell>{getStatusBadge(schedule.status)}</TableCell>
                      <TableCell>
                        {schedule.notes ? (
                          <span className="text-sm">{schedule.notes}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost">
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {schedules.length === 0 && (
                <div className="text-center py-8">
                  <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No hay horarios programados</h3>
                  <p className="text-muted-foreground">
                    No hay turnos programados para {selectedDate && format(selectedDate, 'dd/MM/yyyy', { locale: es })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};