-- Simplify memberships policies to eliminate all recursion

-- Drop all current policies
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.memberships;
DROP POLICY IF EXISTS "Users can view their organization memberships" ON public.memberships;
DROP POLICY IF EXISTS "Organization owners can manage memberships" ON public.memberships;
DROP POLICY IF EXISTS "Users can create their own membership" ON public.memberships;

-- Simple policies without any recursion
CREATE POLICY "Users can view their own memberships only" 
ON public.memberships 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own memberships only" 
ON public.memberships 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- For updates and deletes, only allow on own records
CREATE POLICY "Users can update their own memberships only" 
ON public.memberships 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own memberships only" 
ON public.memberships 
FOR DELETE 
USING (user_id = auth.uid());