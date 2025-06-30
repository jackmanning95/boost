-- This migration fixes RLS policies for the company_account_ids table
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

-- Create a function to check company account IDs permissions
CREATE OR REPLACE FUNCTION public.debug_company_account_permissions()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  current_user_company_id uuid;
  current_user_role text;
  current_user_email text;
  result jsonb;
BEGIN
  -- Get current user ID from auth.uid()
  current_user_id := auth.uid();
  
  -- Get user details
  SELECT 
    company_id, 
    role,
    email
  INTO 
    current_user_company_id,
    current_user_role,
    current_user_email
  FROM public.users
  WHERE id = current_user_id;
  
  -- Build result JSON
  result := jsonb_build_object(
    'user_id', current_user_id,
    'company_id', current_user_company_id,
    'role', current_user_role,
    'email', current_user_email,
    'timestamp', now(),
    'permissions', jsonb_build_object(
      'can_read_company_accounts', has_table_privilege(current_user_id::text, 'public.company_account_ids', 'SELECT'),
      'can_insert_company_accounts', has_table_privilege(current_user_id::text, 'public.company_account_ids', 'INSERT'),
      'can_update_company_accounts', has_table_privilege(current_user_id::text, 'public.company_account_ids', 'UPDATE'),
      'can_delete_company_accounts', has_table_privilege(current_user_id::text, 'public.company_account_ids', 'DELETE')
    ),
    'rls_policies', (
      SELECT jsonb_agg(jsonb_build_object(
        'policy_name', policyname,
        'table', tablename,
        'command', cmd,
        'roles', roles
      ))
      FROM pg_policies
      WHERE tablename = 'company_account_ids'
      AND schemaname = 'public'
    )
  );
  
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.debug_company_account_permissions() TO authenticated;

-- Output a success message
SELECT 'RLS policies for company_account_ids table have been fixed successfully' as result;