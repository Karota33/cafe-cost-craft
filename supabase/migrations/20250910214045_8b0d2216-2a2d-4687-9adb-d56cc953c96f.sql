-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view memberships in their organizations" ON public.memberships;
DROP POLICY IF EXISTS "Owners can manage memberships" ON public.memberships;
DROP POLICY IF EXISTS "Users can create memberships when creating organizations" ON public.memberships;

-- Create new policies without recursion
CREATE POLICY "Users can view their own memberships" 
ON public.memberships 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view organization memberships if they are members" 
ON public.memberships 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.memberships m2 
    WHERE m2.organization_id = memberships.organization_id 
    AND m2.user_id = auth.uid() 
    AND m2.is_active = true
  )
);

CREATE POLICY "Organization owners can manage all memberships" 
ON public.memberships 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 
    FROM public.memberships m2 
    WHERE m2.organization_id = memberships.organization_id 
    AND m2.user_id = auth.uid() 
    AND m2.role = 'owner' 
    AND m2.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.memberships m2 
    WHERE m2.organization_id = memberships.organization_id 
    AND m2.user_id = auth.uid() 
    AND m2.role = 'owner' 
    AND m2.is_active = true
  )
);

CREATE POLICY "Users can create their own membership" 
ON public.memberships 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);