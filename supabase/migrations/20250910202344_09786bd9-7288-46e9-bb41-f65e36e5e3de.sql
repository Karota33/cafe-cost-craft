-- Add missing RLS policies for all tables

-- Suppliers policies
CREATE POLICY "Members can view suppliers" ON public.suppliers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.memberships 
      WHERE organization_id = suppliers.organization_id 
      AND user_id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY "Managers can manage suppliers" ON public.suppliers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.memberships 
      WHERE organization_id = suppliers.organization_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'manager')
      AND is_active = true
    )
  );

-- Ingredients policies
CREATE POLICY "Members can view ingredients" ON public.ingredients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.memberships 
      WHERE organization_id = ingredients.organization_id 
      AND user_id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY "Managers can manage ingredients" ON public.ingredients
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.memberships 
      WHERE organization_id = ingredients.organization_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'manager')
      AND is_active = true
    )
  );

-- Supplier products policies
CREATE POLICY "Members can view supplier products" ON public.supplier_products
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      JOIN public.suppliers s ON s.organization_id = m.organization_id
      WHERE s.id = supplier_products.supplier_id 
      AND m.user_id = auth.uid() 
      AND m.is_active = true
    )
  );

CREATE POLICY "Managers can manage supplier products" ON public.supplier_products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      JOIN public.suppliers s ON s.organization_id = m.organization_id
      WHERE s.id = supplier_products.supplier_id 
      AND m.user_id = auth.uid() 
      AND m.role IN ('owner', 'admin', 'manager')
      AND m.is_active = true
    )
  );

-- Supplier prices policies
CREATE POLICY "Members can view supplier prices" ON public.supplier_prices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      JOIN public.suppliers s ON s.organization_id = m.organization_id
      JOIN public.supplier_products sp ON sp.supplier_id = s.id
      WHERE sp.id = supplier_prices.supplier_product_id 
      AND m.user_id = auth.uid() 
      AND m.is_active = true
    )
  );

CREATE POLICY "Managers can manage supplier prices" ON public.supplier_prices
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      JOIN public.suppliers s ON s.organization_id = m.organization_id
      JOIN public.supplier_products sp ON sp.supplier_id = s.id
      WHERE sp.id = supplier_prices.supplier_product_id 
      AND m.user_id = auth.uid() 
      AND m.role IN ('owner', 'admin', 'manager')
      AND m.is_active = true
    )
  );

-- Recipes policies
CREATE POLICY "Members can view recipes" ON public.recipes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.memberships 
      WHERE organization_id = recipes.organization_id 
      AND user_id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY "Kitchen staff can manage recipes" ON public.recipes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.memberships 
      WHERE organization_id = recipes.organization_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'manager', 'kitchen_staff')
      AND is_active = true
    )
  );

-- Recipe lines policies
CREATE POLICY "Members can view recipe lines" ON public.recipe_lines
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      JOIN public.recipes r ON r.organization_id = m.organization_id
      WHERE r.id = recipe_lines.recipe_id 
      AND m.user_id = auth.uid() 
      AND m.is_active = true
    )
  );

CREATE POLICY "Kitchen staff can manage recipe lines" ON public.recipe_lines
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      JOIN public.recipes r ON r.organization_id = m.organization_id
      WHERE r.id = recipe_lines.recipe_id 
      AND m.user_id = auth.uid() 
      AND m.role IN ('owner', 'admin', 'manager', 'kitchen_staff')
      AND m.is_active = true
    )
  );

-- File uploads policies
CREATE POLICY "Members can view file uploads" ON public.file_uploads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.memberships 
      WHERE organization_id = file_uploads.organization_id 
      AND user_id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY "Managers can manage file uploads" ON public.file_uploads
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.memberships 
      WHERE organization_id = file_uploads.organization_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'manager')
      AND is_active = true
    )
  );

-- Departments policies
CREATE POLICY "HR managers can view departments" ON public.departments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.memberships 
      WHERE organization_id = departments.organization_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'hr_manager', 'manager')
      AND is_active = true
    )
  );

CREATE POLICY "HR managers can manage departments" ON public.departments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.memberships 
      WHERE organization_id = departments.organization_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'hr_manager')
      AND is_active = true
    )
  );

-- Employee schedules policies
CREATE POLICY "Users can view their own schedules" ON public.employee_schedules
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.memberships 
      WHERE organization_id = employee_schedules.organization_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'hr_manager', 'manager')
      AND is_active = true
    )
  );

CREATE POLICY "HR managers can manage schedules" ON public.employee_schedules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.memberships 
      WHERE organization_id = employee_schedules.organization_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'hr_manager', 'manager')
      AND is_active = true
    )
  );

-- Time tracking policies
CREATE POLICY "Users can view their own time tracking" ON public.time_tracking
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.memberships 
      WHERE organization_id = time_tracking.organization_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'hr_manager', 'manager')
      AND is_active = true
    )
  );

CREATE POLICY "Users can insert their own time tracking" ON public.time_tracking
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.memberships 
      WHERE organization_id = time_tracking.organization_id 
      AND user_id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY "HR managers can manage time tracking" ON public.time_tracking
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.memberships 
      WHERE organization_id = time_tracking.organization_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'hr_manager')
      AND is_active = true
    )
  );

-- Fix function search path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;