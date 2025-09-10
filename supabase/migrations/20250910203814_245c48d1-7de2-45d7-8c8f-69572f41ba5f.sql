-- Check current policies first and only add what's missing

-- Add policy for users to insert memberships when creating organizations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'memberships' 
    AND policyname = 'Users can create memberships when creating organizations'
  ) THEN
    CREATE POLICY "Users can create memberships when creating organizations"
    ON public.memberships 
    FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Add policy for owners to manage memberships
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'memberships' 
    AND policyname = 'Owners can manage memberships'
  ) THEN
    CREATE POLICY "Owners can manage memberships"
    ON public.memberships 
    FOR ALL
    TO authenticated
    USING (EXISTS (
      SELECT 1 FROM memberships m 
      WHERE m.organization_id = memberships.organization_id 
      AND m.user_id = auth.uid() 
      AND m.role IN ('owner', 'admin') 
      AND m.is_active = true
    ))
    WITH CHECK (EXISTS (
      SELECT 1 FROM memberships m 
      WHERE m.organization_id = memberships.organization_id 
      AND m.user_id = auth.uid() 
      AND m.role IN ('owner', 'admin') 
      AND m.is_active = true
    ));
  END IF;
END $$;

-- Fix the organizations view policy by recreating it correctly
DROP POLICY IF EXISTS "Members can view their organizations" ON public.organizations;

CREATE POLICY "Members can view their organizations" 
ON public.organizations 
FOR SELECT 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM memberships 
  WHERE memberships.organization_id = organizations.id 
  AND memberships.user_id = auth.uid() 
  AND memberships.is_active = true
));

-- Fix the organizations manage policy too
DROP POLICY IF EXISTS "Owners can manage organizations" ON public.organizations;

CREATE POLICY "Owners can manage organizations" 
ON public.organizations 
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM memberships 
  WHERE memberships.organization_id = organizations.id 
  AND memberships.user_id = auth.uid() 
  AND memberships.role = 'owner' 
  AND memberships.is_active = true
))
WITH CHECK (EXISTS (
  SELECT 1 FROM memberships 
  WHERE memberships.organization_id = organizations.id 
  AND memberships.user_id = auth.uid() 
  AND memberships.role = 'owner' 
  AND memberships.is_active = true
));