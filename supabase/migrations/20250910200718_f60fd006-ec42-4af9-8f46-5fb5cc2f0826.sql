-- Create Organizations table (multi-tenant support)
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  igic_default DECIMAL(5,3) DEFAULT 0.070, -- 7% IGIC por defecto en Canarias
  timezone TEXT DEFAULT 'Atlantic/Canary',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Suppliers table (shared between kitchen and dining areas)
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact TEXT,
  lead_time_days INTEGER DEFAULT 1 CHECK (lead_time_days > 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Ingredients table (master product data)
CREATE TABLE public.ingredients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  family TEXT,
  subfamily TEXT,
  yield_rate DECIMAL(5,4) DEFAULT 1.0000 CHECK (yield_rate > 0 AND yield_rate <= 1),
  allergens JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create SupplierProducts table (products from suppliers)
CREATE TABLE public.supplier_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  area TEXT NOT NULL CHECK (area IN ('kitchen', 'dining', 'both')),
  family TEXT,
  subfamily TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(supplier_id, ingredient_id, area)
);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_products ENABLE ROW LEVEL SECURITY;

-- Create policies for testing (public access for now)
CREATE POLICY "Allow public access to organizations" ON public.organizations FOR ALL USING (true);
CREATE POLICY "Allow public access to suppliers" ON public.suppliers FOR ALL USING (true);
CREATE POLICY "Allow public access to ingredients" ON public.ingredients FOR ALL USING (true);
CREATE POLICY "Allow public access to supplier_products" ON public.supplier_products FOR ALL USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ingredients_updated_at
  BEFORE UPDATE ON public.ingredients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_supplier_products_updated_at
  BEFORE UPDATE ON public.supplier_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert seed data
INSERT INTO public.organizations (name) VALUES 
  ('DRAGO COFFEE - Demo'),
  ('DRAGO COFFEE - Test');

-- Get the demo organization ID for suppliers
WITH demo_org AS (
  SELECT id FROM public.organizations WHERE name = 'DRAGO COFFEE - Demo' LIMIT 1
)
INSERT INTO public.suppliers (organization_id, name, contact, lead_time_days)
SELECT demo_org.id, supplier_name, contact_info, lead_days
FROM demo_org,
(VALUES 
  ('Cafés El Tostador', '+34 928 123 456', 2),
  ('Distribuciones Canarias S.L.', '+34 922 987 654', 1),
  ('Lácteos La Palma', '+34 928 555 123', 3),
  ('Harinas y Cereales Norte', '+34 922 444 789', 5)
) AS suppliers(supplier_name, contact_info, lead_days);