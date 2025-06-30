/*
  # Fix RLS policies for company_account_ids table

  1. Changes
     - Ensures service_role has full access to company_account_ids table
     - Fixes policies for company admins and members
     - Adds helper functions for permission checks
  
  2. Security
     - Enables row level security on company_account_ids table
     - Creates appropriate policies for different user roles
*/

-- Ensure RLS is enabled on company_account_ids table
ALTER TABLE public.company_account_ids ENABLE ROW LEVEL SECURITY;

-- Create service_role policy if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'company_account_ids' 
    AND schemaname = 'public' 
    AND policyname = 'service_role_full_access'
  ) THEN
    CREATE POLICY service_role_full_access ON public.company_account_ids
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
      
    RAISE NOTICE 'Created service_role_full_access policy on company_account_ids table';
  ELSE
    RAISE NOTICE 'service_role_full_access policy already exists on company_account_ids table';
  END IF;
END $$;

-- Create or replace policy for company admins
DROP POLICY IF EXISTS company_admin_manage ON public.company_account_ids;
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

-- Create or replace policy for company members to read
DROP POLICY IF EXISTS company_members_read ON public.company_account_ids;
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

-- Create or replace policy for super admins
DROP POLICY IF EXISTS super_admin_full_access ON public.company_account_ids;
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
CREATE OR REPLACE FUNCTION public.check_company_account_ids_permissions()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  current_user_company_id uuid;
  result jsonb;
BEGIN
  -- Get current user ID from auth.uid()
  current_user_id := auth.uid();
  
  -- Get user company ID
  SELECT company_id INTO current_user_company_id
  FROM public.users
  WHERE id = current_user_id;
  
  -- Build result JSON
  result := jsonb_build_object(
    'user_id', current_user_id,
    'company_id', current_user_company_id,
    'permissions', jsonb_build_object(
      'can_read', has_table_privilege(current_user_id::text, 'public.company_account_ids', 'SELECT'),
      'can_insert', has_table_privilege(current_user_id::text, 'public.company_account_ids', 'INSERT'),
      'can_update', has_table_privilege(current_user_id::text, 'public.company_account_ids', 'UPDATE'),
      'can_delete', has_table_privilege(current_user_id::text, 'public.company_account_ids', 'DELETE')
    ),
    'policies', (
      SELECT jsonb_agg(jsonb_build_object(
        'policy_name', policyname,
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
GRANT EXECUTE ON FUNCTION public.check_company_account_ids_permissions() TO authenticated;

-- Output a success message
SELECT 'RLS policies for company_account_ids table have been fixed successfully' as result;