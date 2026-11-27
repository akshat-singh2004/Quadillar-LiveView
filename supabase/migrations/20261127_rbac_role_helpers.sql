-- Sprint 15C: Server-Controlled RBAC Role Assignment Helper for Supabase Auth (app_metadata.role)
-- Usage in Supabase SQL Editor (replace email and role with DIRECTOR | SITE_ENGINEER | AUDITOR):
--   SELECT public.assign_quadillar_operator_role('director@quadillar.in', 'DIRECTOR');

CREATE OR REPLACE FUNCTION public.assign_quadillar_operator_role(
  target_email TEXT,
  target_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  normalized_role TEXT := UPPER(TRIM(target_role));
  updated_id UUID;
BEGIN
  IF normalized_role NOT IN ('DIRECTOR', 'SITE_ENGINEER', 'AUDITOR') THEN
    RAISE EXCEPTION 'Invalid Quadillar RBAC role: %. Allowed: DIRECTOR, SITE_ENGINEER, AUDITOR', target_role;
  END IF;

  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', normalized_role)
  WHERE LOWER(email) = LOWER(TRIM(target_email))
  RETURNING id INTO updated_id;

  IF updated_id IS NULL THEN
    RAISE EXCEPTION 'No Supabase Auth user found for email: %', target_email;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'user_id', updated_id,
    'email', LOWER(TRIM(target_email)),
    'role', normalized_role
  );
END;
$$;

-- Restrict execution strictly to service_role / postgres admin (never anon or authenticated)
REVOKE ALL ON FUNCTION public.assign_quadillar_operator_role(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_quadillar_operator_role(TEXT, TEXT) TO service_role;
