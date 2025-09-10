-- Create transactional RPC to create organization and owner membership
CREATE OR REPLACE FUNCTION public.create_org_with_owner(
  p_name text,
  p_timezone text DEFAULT 'Atlantic/Canary',
  p_igic numeric DEFAULT 0.070
)
RETURNS public.organizations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org public.organizations;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.organizations(name, timezone, igic_default)
  VALUES (p_name, COALESCE(p_timezone, 'Atlantic/Canary'), COALESCE(p_igic, 0.070))
  RETURNING * INTO v_org;

  INSERT INTO public.memberships(user_id, organization_id, role, is_active, accepted_at)
  VALUES (auth.uid(), v_org.id, 'owner', true, now());

  RETURN v_org;
END;
$$;

-- Ensure authenticated users can execute
GRANT EXECUTE ON FUNCTION public.create_org_with_owner(text, text, numeric) TO authenticated;