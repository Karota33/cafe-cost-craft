-- Fix RLS policies for organizations and memberships

-- Allow users to insert organizations (they become owner automatically)
CREATE POLICY "Users can create organizations" 
ON public.organizations 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Allow users to insert memberships when creating organizations
CREATE POLICY "Users can create memberships when creating organizations"
ON public.memberships 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow owners and admins to manage memberships in their organizations
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

-- Fix organizations RLS policy - the table name should be organizations.id not memberships.id
DROP POLICY "Members can view their organizations" ON public.organizations;

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

-- Fix owners policy too
DROP POLICY "Owners can manage organizations" ON public.organizations;

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