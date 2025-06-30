-- This migration fixes the company_account_ids table RLS policies
-- to ensure users can properly access their company's platform IDs

-- Ensure RLS is enabled on company_account_ids table
ALTER TABLE public.company_account_ids ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS company_admin_manage ON public.company_account_ids;
DROP POLICY IF EXISTS company_members_read ON public.company_account_ids;
DROP POLICY IF EXISTS super_admin_full_access ON public.company_account_ids;
DROP POLICY IF EXISTS service_role_full_access ON public.company_account_ids;

-- Create service_role policy
CREATE POLICY service_role_full_access ON public.company_account_ids
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create policy for company admins
CREATE POLICY company_admin_manage ON public.company_account_ids
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.company_id = company_account_ids.company_id
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.company_id = company_account_ids.company_id
      AND users.role = 'admin'
    )
  );

-- Create policy for company members to read
CREATE POLICY company_members_read ON public.company_account_ids
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.company_id = company_account_ids.company_id
    )
  );

-- Create policy for super admins
CREATE POLICY super_admin_full_access ON public.company_account_ids
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE users.id = auth.uid() AND (users.email)::text ~~ '%@boostdata.io'::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE users.id = auth.uid() AND (users.email)::text ~~ '%@boostdata.io'::text
    )
  );

-- Create a simple debug function that doesn't use SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.debug_company_account_permissions()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Build the result
  result := jsonb_build_object(
    'auth_uid', auth.uid(),
    'auth_role', auth.role(),
    'current_user', current_user,
    'timestamp', now()
  );

  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', true,
      'error_message', SQLERRM,
      'timestamp', now()
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.debug_company_account_permissions() TO authenticated;

-- Output a success message
SELECT 'RLS policies for company_account_ids table have been fixed successfully' as result;