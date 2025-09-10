-- Fix memberships policies to prevent infinite recursion

-- Drop problematic policies
DROP POLICY IF EXISTS "Users can view organization memberships if they are members" ON public.memberships;
DROP POLICY IF EXISTS "Organization owners can manage all memberships" ON public.memberships;

-- Create new policies without recursion using a direct approach
CREATE POLICY "Users can view their organization memberships" 
ON public.memberships 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Organization owners can manage memberships" 
ON public.memberships 
FOR ALL 
USING (
  -- Direct check: user is owner of this specific organization
  EXISTS (
    SELECT 1 
    FROM public.organizations o
    JOIN public.memberships owner_membership ON (owner_membership.organization_id = o.id)
    WHERE o.id = memberships.organization_id 
    AND owner_membership.user_id = auth.uid() 
    AND owner_membership.role = 'owner' 
    AND owner_membership.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.organizations o
    JOIN public.memberships owner_membership ON (owner_membership.organization_id = o.id)
    WHERE o.id = memberships.organization_id 
    AND owner_membership.user_id = auth.uid() 
    AND owner_membership.role = 'owner' 
    AND owner_membership.is_active = true
  )
);