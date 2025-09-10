import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  Plus, 
  Calculator, 
  ChefHat, 
  Utensils,
  Edit3,
  Eye,
  Copy,
  FileDown,
  TrendingUp,
  Euro
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { RecipeEditor } from "@/components/Recipes/RecipeEditor";
import { downloadRecipePDF } from "@/utils/pdfExport";
import { useToast } from "@/hooks/use-toast";

interface Recipe {
  id: string;
  name: string;
  type: 'PREP' | 'PLATE';
  target_batch_qty: number;
  target_batch_unit: string;
  servings: number | null;
  status: 'draft' | 'active' | 'archived';
  version: number;
  created_at: string;
  updated_at: string;
}

export const RecipesView = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<string | undefined>();

  const { currentOrganization } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (currentOrganization) {
      fetchRecipes();
    }
  }, [currentOrganization]);

  const fetchRecipes = async () => {
    if (!currentOrganization) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('organization_id', currentOrganization.organization_id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching recipes:', error);
        return;
      }

      setRecipes(data || []);
    } catch (error) {
      console.error('Error fetching recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewRecipe = () => {
    setEditingRecipe(undefined);
    setShowEditor(true);
  };

  const handleEditRecipe = (recipeId: string) => {
    setEditingRecipe(recipeId);
    setShowEditor(true);
  };

  const handleSaveRecipe = () => {
    setShowEditor(false);
    setEditingRecipe(undefined);
    fetchRecipes(); // Refresh list
  };

  const handleCancelEdit = () => {
    setShowEditor(false);
    setEditingRecipe(undefined);
  };

  const handleExportPDF = async (recipeId: string) => {
    if (!currentOrganization) return;

    try {
      // Fetch complete recipe data
      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', recipeId)
        .single();

      if (recipeError) throw recipeError;

      const { data: lines, error: linesError } = await supabase
        .from('recipe_lines')
        .select(`
          *,
          ingredients(name, avg_price)
        `)
        .eq('recipe_id', recipeId)
        .order('step_order');

      if (linesError) throw linesError;

      const { data: costs, error: costsError } = await supabase
        .from('recipe_costs')
        .select('*')
        .eq('recipe_id', recipeId)
        .maybeSingle();

      // Prepare data for PDF
      const ingredients = lines?.map(line => ({
        name: line.ingredients?.name || 'Ingrediente desconocido',
        quantity: line.quantity,
        unit: line.unit,
        cost: (line.quantity * (line.ingredients?.avg_price || 0)) * (1 - line.loss_pct / 100),
        loss_pct: line.loss_pct
      })) || [];

      const pdfData = {
        name: recipe.name,
        type: recipe.type,
        target_batch_qty: recipe.target_batch_qty,
        target_batch_unit: recipe.target_batch_unit,
        servings: recipe.servings,
        prep_time_minutes: recipe.prep_time_minutes,
        cooking_time_minutes: recipe.cooking_time_minutes,
        instructions: recipe.instructions || '',
        chef_notes: recipe.chef_notes,
        allergen_info: Array.isArray(recipe.allergen_info) 
          ? recipe.allergen_info.filter((item): item is string => typeof item === 'string')
          : [],
        ingredients,
        costs: costs || {
          ingredient_cost: 0,
          labor_cost: 0,
          overhead_cost: 0,
          total_cost: 0,
          cost_per_serving: 0
        },
        food_cost_percentage: recipe.target_price && costs?.total_cost 
          ? (costs.total_cost / recipe.target_price) * 100 
          : undefined,
        target_price: recipe.target_price
      };

      await downloadRecipePDF(pdfData);
      
      toast({
        title: "PDF generado",
        description: "La ficha técnica se ha abierto en una nueva ventana",
      });

    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: "Error",
        description: "No se pudo generar el PDF",
        variant: "destructive"
      });
    }
  };
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = recipe.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || recipe.type === typeFilter;
    const matchesStatus = statusFilter === "all" || recipe.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const getTypeIcon = (type: Recipe['type']) => {
    return type === 'PREP' ? <ChefHat className="h-4 w-4" /> : <Utensils className="h-4 w-4" />;
  };

  const getTypeColor = (type: Recipe['type']) => {
    return type === 'PREP' ? 'bg-blue-500' : 'bg-green-500';
  };

  const getStatusBadge = (status: Recipe['status']) => {
    const variants = {
      active: 'default',
      draft: 'secondary', 
      archived: 'outline'
    } as const;
    
    const labels = {
      active: 'Activa',
      draft: 'Borrador',
      archived: 'Archivada'
    };

    return (
      <Badge variant={variants[status]}>
        {labels[status]}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatQuantity = (qty: number, unit: string) => {
    return `${qty} ${unit}`;
  };

  if (showEditor) {
    return (
      <RecipeEditor
        recipeId={editingRecipe}
        onSave={handleSaveRecipe}
        onCancel={handleCancelEdit}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gradient">Recetas y Escandallos</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona recetas PREP y PLATE con cálculo automático de costes
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={handleNewRecipe}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Receta
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar recetas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="PREP">PREP</SelectItem>
                <SelectItem value="PLATE">PLATE</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Activas</SelectItem>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="archived">Archivadas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <ChefHat className="h-6 w-6 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{recipes.filter(r => r.type === 'PREP').length}</p>
            <p className="text-sm text-muted-foreground">PREP</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Utensils className="h-6 w-6 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{recipes.filter(r => r.type === 'PLATE').length}</p>
            <p className="text-sm text-muted-foreground">PLATE</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">{recipes.filter(r => r.status === 'active').length}</p>
            <p className="text-sm text-muted-foreground">Activas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Euro className="h-6 w-6 text-warning mx-auto mb-2" />
            <p className="text-2xl font-bold">22.5%</p>
            <p className="text-sm text-muted-foreground">Food Cost medio</p>
          </CardContent>
        </Card>
      </div>

      {/* Recipes Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Lista de Recetas
          </CardTitle>
          <CardDescription>
            {filteredRecipes.length} de {recipes.length} recetas mostradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredRecipes.length === 0 ? (
            <div className="p-8 text-center">
              <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm ? "No se encontraron recetas" : "No hay recetas registradas"}
              </h3>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? "Intenta ajustar los filtros de búsqueda"
                  : "Comienza creando tu primera receta"
                }
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receta</TableHead>
                  <TableHead className="text-center">Tipo</TableHead>
                  <TableHead className="text-center">Cantidad objetivo</TableHead>
                  <TableHead className="text-center">Porciones</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-center">Versión</TableHead>
                  <TableHead className="text-center">Actualizada</TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecipes.map((recipe) => (
                  <TableRow key={recipe.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-lg ${getTypeColor(recipe.type)} text-white flex items-center justify-center`}>
                          {getTypeIcon(recipe.type)}
                        </div>
                        <div>
                          <p className="font-medium">{recipe.name}</p>
                          <p className="text-sm text-muted-foreground">
                            ID: {recipe.id.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-xs">
                        {recipe.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-medium">
                        {formatQuantity(recipe.target_batch_qty, recipe.target_batch_unit)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {recipe.servings ? (
                        <span className="font-medium">{recipe.servings}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(recipe.status)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">v{recipe.version}</Badge>
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {formatDate(recipe.updated_at)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-1">
                        <Button size="sm" variant="ghost" title="Ver receta">
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" title="Editar" onClick={() => handleEditRecipe(recipe.id)}>
                          <Edit3 className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" title="Duplicar">
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" title="Exportar PDF" onClick={() => handleExportPDF(recipe.id)}>
                          <FileDown className="h-3 w-3" />
                        </Button>
                      </div>
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