-- Single-user mode: allow only specific user full access regardless of organization
-- 1) Helper function
CREATE OR REPLACE FUNCTION public.is_app_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() = '69e24753-46aa-46c2-9f7a-da0fbe1d4c89'::uuid;
$$;

-- 2) Add permissive policies for the app owner on all relevant tables
-- Note: Using PERMISSIVE default; these add to existing policies

-- Utility to drop policy if exists (Postgres doesn't support IF EXISTS for CREATE POLICY names across all tables),
-- so we just create with unique names; if they exist, we drop first.

-- departments
DROP POLICY IF EXISTS "App owner full access" ON public.departments;
CREATE POLICY "App owner full access"
ON public.departments
FOR ALL
USING (public.is_app_owner())
WITH CHECK (public.is_app_owner());

-- employee_schedules
DROP POLICY IF EXISTS "App owner full access" ON public.employee_schedules;
CREATE POLICY "App owner full access"
ON public.employee_schedules
FOR ALL
USING (public.is_app_owner())
WITH CHECK (public.is_app_owner());

-- file_uploads
DROP POLICY IF EXISTS "App owner full access" ON public.file_uploads;
CREATE POLICY "App owner full access"
ON public.file_uploads
FOR ALL
USING (public.is_app_owner())
WITH CHECK (public.is_app_owner());

-- ingredients
DROP POLICY IF EXISTS "App owner full access" ON public.ingredients;
CREATE POLICY "App owner full access"
ON public.ingredients
FOR ALL
USING (public.is_app_owner())
WITH CHECK (public.is_app_owner());

-- memberships
DROP POLICY IF EXISTS "App owner full access" ON public.memberships;
CREATE POLICY "App owner full access"
ON public.memberships
FOR ALL
USING (public.is_app_owner())
WITH CHECK (public.is_app_owner());

-- ocr_processing
DROP POLICY IF EXISTS "App owner full access" ON public.ocr_processing;
CREATE POLICY "App owner full access"
ON public.ocr_processing
FOR ALL
USING (public.is_app_owner())
WITH CHECK (public.is_app_owner());

-- organizations
DROP POLICY IF EXISTS "App owner full access" ON public.organizations;
CREATE POLICY "App owner full access"
ON public.organizations
FOR ALL
USING (public.is_app_owner())
WITH CHECK (public.is_app_owner());

-- price_alerts
DROP POLICY IF EXISTS "App owner full access" ON public.price_alerts;
CREATE POLICY "App owner full access"
ON public.price_alerts
FOR ALL
USING (public.is_app_owner())
WITH CHECK (public.is_app_owner());

-- profiles
DROP POLICY IF EXISTS "App owner full access" ON public.profiles;
CREATE POLICY "App owner full access"
ON public.profiles
FOR ALL
USING (public.is_app_owner())
WITH CHECK (public.is_app_owner());

-- recipe_cost_history
DROP POLICY IF EXISTS "App owner full access" ON public.recipe_cost_history;
CREATE POLICY "App owner full access"
ON public.recipe_cost_history
FOR ALL
USING (public.is_app_owner())
WITH CHECK (public.is_app_owner());

-- recipe_costs
DROP POLICY IF EXISTS "App owner full access" ON public.recipe_costs;
CREATE POLICY "App owner full access"
ON public.recipe_costs
FOR ALL
USING (public.is_app_owner())
WITH CHECK (public.is_app_owner());

-- recipe_lines
DROP POLICY IF EXISTS "App owner full access" ON public.recipe_lines;
CREATE POLICY "App owner full access"
ON public.recipe_lines
FOR ALL
USING (public.is_app_owner())
WITH CHECK (public.is_app_owner());

-- recipes
DROP POLICY IF EXISTS "App owner full access" ON public.recipes;
CREATE POLICY "App owner full access"
ON public.recipes
FOR ALL
USING (public.is_app_owner())
WITH CHECK (public.is_app_owner());

-- supplier_prices
DROP POLICY IF EXISTS "App owner full access" ON public.supplier_prices;
CREATE POLICY "App owner full access"
ON public.supplier_prices
FOR ALL
USING (public.is_app_owner())
WITH CHECK (public.is_app_owner());

-- supplier_products
DROP POLICY IF EXISTS "App owner full access" ON public.supplier_products;
CREATE POLICY "App owner full access"
ON public.supplier_products
FOR ALL
USING (public.is_app_owner())
WITH CHECK (public.is_app_owner());

-- suppliers
DROP POLICY IF EXISTS "App owner full access" ON public.suppliers;
CREATE POLICY "App owner full access"
ON public.suppliers
FOR ALL
USING (public.is_app_owner())
WITH CHECK (public.is_app_owner());

-- time_tracking
DROP POLICY IF EXISTS "App owner full access" ON public.time_tracking;
CREATE POLICY "App owner full access"
ON public.time_tracking
FOR ALL
USING (public.is_app_owner())
WITH CHECK (public.is_app_owner());