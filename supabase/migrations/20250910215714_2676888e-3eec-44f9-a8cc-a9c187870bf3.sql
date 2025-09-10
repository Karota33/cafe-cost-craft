-- Remove single-user mode policies and revert to organization-based access
-- Drop all "App owner full access" policies

-- departments
DROP POLICY IF EXISTS "App owner full access" ON public.departments;

-- employee_schedules  
DROP POLICY IF EXISTS "App owner full access" ON public.employee_schedules;

-- file_uploads
DROP POLICY IF EXISTS "App owner full access" ON public.file_uploads;

-- ingredients
DROP POLICY IF EXISTS "App owner full access" ON public.ingredients;

-- memberships
DROP POLICY IF EXISTS "App owner full access" ON public.memberships;

-- ocr_processing
DROP POLICY IF EXISTS "App owner full access" ON public.ocr_processing;

-- organizations
DROP POLICY IF EXISTS "App owner full access" ON public.organizations;

-- price_alerts
DROP POLICY IF EXISTS "App owner full access" ON public.price_alerts;

-- profiles
DROP POLICY IF EXISTS "App owner full access" ON public.profiles;

-- recipe_cost_history
DROP POLICY IF EXISTS "App owner full access" ON public.recipe_cost_history;

-- recipe_costs
DROP POLICY IF EXISTS "App owner full access" ON public.recipe_costs;

-- recipe_lines
DROP POLICY IF EXISTS "App owner full access" ON public.recipe_lines;

-- recipes
DROP POLICY IF EXISTS "App owner full access" ON public.recipes;

-- supplier_prices
DROP POLICY IF EXISTS "App owner full access" ON public.supplier_prices;

-- supplier_products
DROP POLICY IF EXISTS "App owner full access" ON public.supplier_products;

-- suppliers
DROP POLICY IF EXISTS "App owner full access" ON public.suppliers;

-- time_tracking
DROP POLICY IF EXISTS "App owner full access" ON public.time_tracking;

-- Drop the single-user helper function
DROP FUNCTION IF EXISTS public.is_app_owner();