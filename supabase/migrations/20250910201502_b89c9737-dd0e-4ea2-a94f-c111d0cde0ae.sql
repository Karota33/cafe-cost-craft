-- Create storage bucket for file uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', true);

-- Create SupplierPrices table for price management
CREATE TABLE public.supplier_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_product_id UUID NOT NULL REFERENCES public.supplier_products(id) ON DELETE CASCADE,
  pack_description TEXT NOT NULL,
  pack_net_qty DECIMAL(10,4) NOT NULL CHECK (pack_net_qty > 0),
  pack_unit TEXT NOT NULL, -- kg, L, ud
  pack_price DECIMAL(10,4) NOT NULL CHECK (pack_price > 0),
  discount_pct DECIMAL(5,3) DEFAULT 0.000 CHECK (discount_pct >= 0 AND discount_pct < 1),
  tax_pct DECIMAL(5,3) DEFAULT 0.070, -- IGIC 7%
  is_active BOOLEAN DEFAULT true,
  effective_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
  effective_to TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Recipes table for PREP/PLATE
CREATE TYPE public.recipe_type AS ENUM ('PREP', 'PLATE');
CREATE TYPE public.recipe_status AS ENUM ('draft', 'active', 'archived');

CREATE TABLE public.recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type public.recipe_type NOT NULL,
  target_batch_qty DECIMAL(10,4) NOT NULL CHECK (target_batch_qty > 0),
  target_batch_unit TEXT NOT NULL,
  servings INTEGER CHECK (servings > 0),
  process_description TEXT,
  version INTEGER DEFAULT 1,
  status public.recipe_status DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create RecipeLines table for recipe components
CREATE TYPE public.component_type AS ENUM ('ingredient', 'recipe');

CREATE TABLE public.recipe_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  component_type public.component_type NOT NULL,
  ingredient_id UUID REFERENCES public.ingredients(id),
  component_recipe_id UUID REFERENCES public.recipes(id),
  quantity DECIMAL(10,4) NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL,
  loss_pct DECIMAL(5,3) DEFAULT 0.000 CHECK (loss_pct >= 0 AND loss_pct < 1),
  step_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT recipe_component_check CHECK (
    (component_type = 'ingredient' AND ingredient_id IS NOT NULL AND component_recipe_id IS NULL) OR
    (component_type = 'recipe' AND ingredient_id IS NULL AND component_recipe_id IS NOT NULL)
  )
);

-- Create FileUploads table to track processed files
CREATE TABLE public.file_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- CSV, XLSX, PDF, IMAGE
  file_size BIGINT NOT NULL,
  file_path TEXT NOT NULL,
  processing_status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  processed_records INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on new tables
ALTER TABLE public.supplier_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;

-- Create public access policies for testing
CREATE POLICY "Allow public access to supplier_prices" ON public.supplier_prices FOR ALL USING (true);
CREATE POLICY "Allow public access to recipes" ON public.recipes FOR ALL USING (true);
CREATE POLICY "Allow public access to recipe_lines" ON public.recipe_lines FOR ALL USING (true);
CREATE POLICY "Allow public access to file_uploads" ON public.file_uploads FOR ALL USING (true);

-- Create storage policies for uploads bucket
CREATE POLICY "Allow public uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'uploads');
CREATE POLICY "Allow public downloads" ON storage.objects FOR SELECT USING (bucket_id = 'uploads');
CREATE POLICY "Allow public deletes" ON storage.objects FOR DELETE USING (bucket_id = 'uploads');

-- Create triggers for new tables
CREATE TRIGGER update_supplier_prices_updated_at
  BEFORE UPDATE ON public.supplier_prices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data for ingredients
WITH demo_org AS (
  SELECT id FROM public.organizations WHERE name = 'DRAGO COFFEE - Demo' LIMIT 1
)
INSERT INTO public.ingredients (organization_id, name, family, subfamily, allergens)
SELECT demo_org.id, ingredient_name, family_name, subfamily_name, allergens_json
FROM demo_org,
(VALUES 
  ('Café en grano Arábica Premium', 'Café', 'Granos', '[]'::jsonb),
  ('Leche UHT Entera', 'Lácteos', 'Leche', '["Lactosa"]'::jsonb),
  ('Azúcar Blanco Refinado', 'Básicos', 'Azúcares', '[]'::jsonb),
  ('Harina de Trigo 000', 'Básicos', 'Harinas', '["Gluten"]'::jsonb),
  ('Aceite de Oliva Virgen Extra', 'Aceites', 'Oliva', '[]'::jsonb),
  ('Huevos Frescos Clase A', 'Proteínas', 'Huevos', '["Huevo"]'::jsonb),
  ('Tomate Triturado', 'Conservas', 'Tomate', '[]'::jsonb),
  ('Queso Gouda Curado', 'Lácteos', 'Quesos', '["Lactosa"]'::jsonb),
  ('Pan de Molde Integral', 'Panadería', 'Pan', '["Gluten"]'::jsonb),
  ('Coca Cola Original', 'Bebidas', 'Refrescos', '[]'::jsonb)
) AS ingredients(ingredient_name, family_name, subfamily_name, allergens_json);