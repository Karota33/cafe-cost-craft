import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  Plus, 
  Trash2, 
  Save, 
  Calculator,
  ChefHat,
  Utensils,
  AlertTriangle
} from "lucide-react";

interface RecipeFormData {
  name: string;
  type: 'PREP' | 'PLATE';
  target_batch_qty: number;
  target_batch_unit: string;
  servings: number | null;
  prep_time_minutes: number | null;
  cooking_time_minutes: number | null;
  instructions: string;
  process_description: string;
  chef_notes: string;
  allergen_info: string[];
  target_price: number | null;
  margin_percentage: number | null;
}

interface RecipeLine {
  id?: string;
  component_type: 'ingredient' | 'recipe';
  ingredient_id?: string;
  component_recipe_id?: string;
  quantity: number;
  unit: string;
  step_order: number;
  preparation_method?: string;
  cooking_method?: string;
  timing_notes?: string;
  loss_pct: number;
  is_optional: boolean;
  temperature_celsius?: number;
}

interface Ingredient {
  id: string;
  name: string;
  unit_base: string;
  avg_price: number;
  category: string;
}

interface RecipeOption {
  id: string;
  name: string;
  type: string;
}

interface RecipeEditorProps {
  recipeId?: string;
  onSave: (recipe: any) => void;
  onCancel: () => void;
}

export const RecipeEditor = ({ recipeId, onSave, onCancel }: RecipeEditorProps) => {
  const [formData, setFormData] = useState<RecipeFormData>({
    name: '',
    type: 'PREP',
    target_batch_qty: 1,
    target_batch_unit: 'kg',
    servings: null,
    prep_time_minutes: null,
    cooking_time_minutes: null,
    instructions: '',
    process_description: '',
    chef_notes: '',
    allergen_info: [],
    target_price: null,
    margin_percentage: null
  });

  const [recipeLines, setRecipeLines] = useState<RecipeLine[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<RecipeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculatedCost, setCalculatedCost] = useState<number>(0);
  const [foodCostPercentage, setFoodCostPercentage] = useState<number>(0);

  const { currentOrganization } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (currentOrganization) {
      fetchIngredients();
      fetchRecipes();
      if (recipeId) {
        fetchRecipe();
      }
    }
  }, [currentOrganization, recipeId]);

  useEffect(() => {
    calculateCosts();
  }, [recipeLines, formData.target_price]);

  const fetchIngredients = async () => {
    if (!currentOrganization) return;

    const { data, error } = await supabase
      .from('ingredients')
      .select('id, name, unit_base, avg_price, category')
      .eq('organization_id', currentOrganization.organization_id)
      .order('name');

    if (error) {
      console.error('Error fetching ingredients:', error);
      return;
    }

    setIngredients(data || []);
  };

  const fetchRecipes = async () => {
    if (!currentOrganization) return;

    const { data, error } = await supabase
      .from('recipes')
      .select('id, name, type')
      .eq('organization_id', currentOrganization.organization_id)
      .eq('status', 'active')
      .neq('id', recipeId || '') // Exclude current recipe
      .order('name');

    if (error) {
      console.error('Error fetching recipes:', error);
      return;
    }

    setRecipes(data || []);
  };

  const fetchRecipe = async () => {
    if (!recipeId || !currentOrganization) return;

    setLoading(true);
    try {
      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', recipeId)
        .eq('organization_id', currentOrganization.organization_id)
        .single();

      if (recipeError) throw recipeError;

      setFormData({
        name: recipe.name,
        type: recipe.type,
        target_batch_qty: recipe.target_batch_qty,
        target_batch_unit: recipe.target_batch_unit,
        servings: recipe.servings,
        prep_time_minutes: recipe.prep_time_minutes,
        cooking_time_minutes: recipe.cooking_time_minutes,
        instructions: recipe.instructions || '',
        process_description: recipe.process_description || '',
        chef_notes: recipe.chef_notes || '',
        allergen_info: Array.isArray(recipe.allergen_info) ? recipe.allergen_info : [],
        target_price: recipe.target_price,
        margin_percentage: recipe.margin_percentage
      });

      const { data: lines, error: linesError } = await supabase
        .from('recipe_lines')
        .select('*')
        .eq('recipe_id', recipeId)
        .order('step_order');

      if (linesError) throw linesError;

      setRecipeLines(lines || []);
    } catch (error) {
      console.error('Error fetching recipe:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la receta",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateCosts = async () => {
    let totalCost = 0;

    for (const line of recipeLines) {
      if (line.component_type === 'ingredient' && line.ingredient_id) {
        const ingredient = ingredients.find(i => i.id === line.ingredient_id);
        if (ingredient && ingredient.avg_price) {
          const lineCost = line.quantity * ingredient.avg_price * (1 - line.loss_pct / 100);
          totalCost += lineCost;
        }
      }
      // TODO: Handle recipe components
    }

    setCalculatedCost(totalCost);

    if (formData.target_price && formData.target_price > 0) {
      const foodCost = (totalCost / formData.target_price) * 100;
      setFoodCostPercentage(foodCost);
    } else {
      setFoodCostPercentage(0);
    }
  };

  const addRecipeLine = () => {
    const newLine: RecipeLine = {
      component_type: 'ingredient',
      quantity: 0,
      unit: 'kg',
      step_order: recipeLines.length + 1,
      loss_pct: 0,
      is_optional: false
    };
    setRecipeLines([...recipeLines, newLine]);
  };

  const updateRecipeLine = (index: number, updates: Partial<RecipeLine>) => {
    const updatedLines = [...recipeLines];
    updatedLines[index] = { ...updatedLines[index], ...updates };
    setRecipeLines(updatedLines);
  };

  const removeRecipeLine = (index: number) => {
    const updatedLines = recipeLines.filter((_, i) => i !== index);
    setRecipeLines(updatedLines.map((line, i) => ({ ...line, step_order: i + 1 })));
  };

  const handleSave = async () => {
    if (!currentOrganization || !formData.name.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la receta es obligatorio",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const recipeData = {
        ...formData,
        organization_id: currentOrganization.organization_id,
        status: 'active' as const
      };

      let savedRecipe;
      if (recipeId) {
        const { data, error } = await supabase
          .from('recipes')
          .update(recipeData)
          .eq('id', recipeId)
          .select()
          .single();

        if (error) throw error;
        savedRecipe = data;

        // Delete existing lines
        await supabase
          .from('recipe_lines')
          .delete()
          .eq('recipe_id', recipeId);
      } else {
        const { data, error } = await supabase
          .from('recipes')
          .insert(recipeData)
          .select()
          .single();

        if (error) throw error;
        savedRecipe = data;
      }

      // Save recipe lines
      if (recipeLines.length > 0) {
        const linesData = recipeLines.map(line => ({
          ...line,
          recipe_id: savedRecipe.id
        }));

        const { error: linesError } = await supabase
          .from('recipe_lines')
          .insert(linesData);

        if (linesError) throw linesError;
      }

      // Calculate and save costs
      await supabase.functions.invoke('calculate-recipe-cost', {
        body: { recipe_id: savedRecipe.id }
      });

      toast({
        title: "Éxito",
        description: "Receta guardada correctamente",
      });

      onSave(savedRecipe);
    } catch (error) {
      console.error('Error saving recipe:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la receta",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getIngredientOptions = () => {
    return ingredients.map(ingredient => (
      <SelectItem key={ingredient.id} value={ingredient.id}>
        {ingredient.name} ({ingredient.unit_base}) - €{ingredient.avg_price?.toFixed(2) || '0.00'}
      </SelectItem>
    ));
  };

  const getRecipeOptions = () => {
    return recipes.map(recipe => (
      <SelectItem key={recipe.id} value={recipe.id}>
        {recipe.name} ({recipe.type})
      </SelectItem>
    ));
  };

  const allergenOptions = [
    'Gluten', 'Lactosa', 'Huevos', 'Pescado', 'Mariscos', 
    'Frutos secos', 'Cacahuetes', 'Soja', 'Apio', 'Mostaza', 
    'Sésamo', 'Sulfitos', 'Altramuces', 'Moluscos'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gradient">
            {recipeId ? 'Editar Receta' : 'Nueva Receta'}
          </h2>
          <p className="text-muted-foreground">
            {formData.type === 'PREP' ? 'Preparación base' : 'Plato terminado'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            Guardar
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recipe Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {formData.type === 'PREP' ? <ChefHat className="h-5 w-5" /> : <Utensils className="h-5 w-5" />}
                Información Básica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nombre de la receta</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Masa base pizza"
                  />
                </div>
                <div>
                  <Label htmlFor="type">Tipo</Label>
                  <Select value={formData.type} onValueChange={(value: 'PREP' | 'PLATE') => setFormData({ ...formData, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PREP">PREP - Preparación</SelectItem>
                      <SelectItem value="PLATE">PLATE - Plato</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="batch_qty">Cantidad objetivo</Label>
                  <Input
                    id="batch_qty"
                    type="number"
                    step="0.1"
                    value={formData.target_batch_qty}
                    onChange={(e) => setFormData({ ...formData, target_batch_qty: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="batch_unit">Unidad</Label>
                  <Select value={formData.target_batch_unit} onValueChange={(value) => setFormData({ ...formData, target_batch_unit: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="L">L</SelectItem>
                      <SelectItem value="ud">ud</SelectItem>
                      <SelectItem value="porciones">porciones</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.type === 'PLATE' && (
                  <div>
                    <Label htmlFor="servings">Porciones</Label>
                    <Input
                      id="servings"
                      type="number"
                      value={formData.servings || ''}
                      onChange={(e) => setFormData({ ...formData, servings: parseInt(e.target.value) || null })}
                    />
                  </div>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="prep_time">Tiempo preparación (min)</Label>
                  <Input
                    id="prep_time"
                    type="number"
                    value={formData.prep_time_minutes || ''}
                    onChange={(e) => setFormData({ ...formData, prep_time_minutes: parseInt(e.target.value) || null })}
                  />
                </div>
                <div>
                  <Label htmlFor="cooking_time">Tiempo cocción (min)</Label>
                  <Input
                    id="cooking_time"
                    type="number"
                    value={formData.cooking_time_minutes || ''}
                    onChange={(e) => setFormData({ ...formData, cooking_time_minutes: parseInt(e.target.value) || null })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="instructions">Instrucciones</Label>
                <Textarea
                  id="instructions"
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  placeholder="Describe paso a paso cómo elaborar la receta..."
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="chef_notes">Notas del chef</Label>
                <Textarea
                  id="chef_notes"
                  value={formData.chef_notes}
                  onChange={(e) => setFormData({ ...formData, chef_notes: e.target.value })}
                  placeholder="Consejos, variaciones, puntos críticos..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Recipe Lines */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Ingredientes y Componentes</CardTitle>
                <Button onClick={addRecipeLine} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Añadir línea
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recipeLines.length === 0 ? (
                <div className="text-center py-8">
                  <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No hay ingredientes añadidos</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Componente</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Unidad</TableHead>
                      <TableHead>Merma %</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recipeLines.map((line, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Select 
                            value={line.component_type} 
                            onValueChange={(value: 'ingredient' | 'recipe') => updateRecipeLine(index, { component_type: value })}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ingredient">Ingrediente</SelectItem>
                              <SelectItem value="recipe">Receta</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={line.component_type === 'ingredient' ? line.ingredient_id || '' : line.component_recipe_id || ''} 
                            onValueChange={(value) => updateRecipeLine(index, 
                              line.component_type === 'ingredient' 
                                ? { ingredient_id: value, component_recipe_id: undefined }
                                : { component_recipe_id: value, ingredient_id: undefined }
                            )}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                            <SelectContent>
                              {line.component_type === 'ingredient' ? getIngredientOptions() : getRecipeOptions()}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={line.quantity}
                            onChange={(e) => updateRecipeLine(index, { quantity: parseFloat(e.target.value) || 0 })}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={line.unit}
                            onChange={(e) => updateRecipeLine(index, { unit: e.target.value })}
                            className="w-16"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.1"
                            value={line.loss_pct}
                            onChange={(e) => updateRecipeLine(index, { loss_pct: parseFloat(e.target.value) || 0 })}
                            className="w-16"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeRecipeLine(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Cost Analysis & Pricing */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Análisis de Costes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Coste ingredientes:</span>
                  <span className="font-medium">€{calculatedCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Coste por unidad:</span>
                  <span className="font-medium">
                    €{formData.target_batch_qty > 0 ? (calculatedCost / formData.target_batch_qty).toFixed(2) : '0.00'}
                  </span>
                </div>
                {formData.servings && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Coste por porción:</span>
                    <span className="font-medium">€{(calculatedCost / formData.servings).toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="target_price">Precio objetivo €</Label>
                <Input
                  id="target_price"
                  type="number"
                  step="0.01"
                  value={formData.target_price || ''}
                  onChange={(e) => setFormData({ ...formData, target_price: parseFloat(e.target.value) || null })}
                />
              </div>

              {formData.target_price && formData.target_price > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Food Cost:</span>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${foodCostPercentage > 35 ? 'text-destructive' : foodCostPercentage > 25 ? 'text-warning' : 'text-success'}`}>
                        {foodCostPercentage.toFixed(1)}%
                      </span>
                      {foodCostPercentage > 35 && <AlertTriangle className="h-4 w-4 text-destructive" />}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {foodCostPercentage <= 25 && "Excelente margen"}
                    {foodCostPercentage > 25 && foodCostPercentage <= 35 && "Margen aceptable"}
                    {foodCostPercentage > 35 && "Margen bajo - revisar precio"}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="margin">Margen objetivo %</Label>
                <Input
                  id="margin"
                  type="number"
                  step="0.1"
                  value={formData.margin_percentage || ''}
                  onChange={(e) => setFormData({ ...formData, margin_percentage: parseFloat(e.target.value) || null })}
                />
              </div>

              {formData.margin_percentage && (
                <div className="p-3 bg-gradient-subtle rounded-lg">
                  <div className="text-sm text-muted-foreground">Precio sugerido:</div>
                  <div className="text-lg font-bold">
                    €{(calculatedCost / (1 - formData.margin_percentage / 100)).toFixed(2)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Allergens */}
          <Card>
            <CardHeader>
              <CardTitle>Alérgenos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {allergenOptions.map(allergen => (
                  <label key={allergen} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.allergen_info.includes(allergen)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ 
                            ...formData, 
                            allergen_info: [...formData.allergen_info, allergen] 
                          });
                        } else {
                          setFormData({ 
                            ...formData, 
                            allergen_info: formData.allergen_info.filter(a => a !== allergen) 
                          });
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{allergen}</span>
                  </label>
                ))}
              </div>
              
              {formData.allergen_info.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="text-sm font-medium">Alérgenos seleccionados:</div>
                  <div className="flex flex-wrap gap-1">
                    {formData.allergen_info.map(allergen => (
                      <Badge key={allergen} variant="secondary" className="text-xs">
                        {allergen}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};