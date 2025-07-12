/*
  # Fix company_account_ids permissions

  1. Fixes
    - Simplifies RLS policies for company_account_ids table
    - Adds a safer debug function that doesn't require specific roles
    - Ensures all users can read their company's account IDs

  2. Security
    - Maintains proper access control
    - Prevents infinite recursion in RLS policies
*/

-- Drop the problematic debug function if it exists
DROP FUNCTION IF EXISTS debug_company_account_permissions();

-- Create a new safer debug function
CREATE OR REPLACE FUNCTION public.debug_account_permissions()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Get current user info
  WITH user_info AS (
    SELECT 
      auth.uid() as user_id,
      (SELECT company_id FROM public.users WHERE id = auth.uid()) as company_id,
      (SELECT role FROM public.users WHERE id = auth.uid()) as user_role
  )
  SELECT 
    jsonb_build_object(
      'user_id', user_id,
      'company_id', company_id,
      'role', user_role,
      'timestamp', now()
    ) INTO result
  FROM user_info;
  
  RETURN result;
END;
$$;

-- Simplify RLS policies for company_account_ids
ALTER TABLE public.company_account_ids DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_account_ids ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "company_account_ids_delete_policy" ON public.company_account_ids;
DROP POLICY IF EXISTS "company_account_ids_insert_policy" ON public.company_account_ids;
DROP POLICY IF EXISTS "company_account_ids_select_policy" ON public.company_account_ids;
DROP POLICY IF EXISTS "company_account_ids_update_policy" ON public.company_account_ids;
DROP POLICY IF EXISTS "company_admin_manage" ON public.company_account_ids;
DROP POLICY IF EXISTS "company_members_read" ON public.company_account_ids;
DROP POLICY IF EXISTS "service_role_full_access" ON public.company_account_ids;
DROP POLICY IF EXISTS "super_admin_full_access" ON public.company_account_ids;

-- Create simplified policies

-- 1. Allow users to read account IDs for their company
CREATE POLICY "users_can_read_company_accounts" ON public.company_account_ids
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

-- 2. Allow company admins to manage their company's account IDs
CREATE POLICY "company_admins_can_manage" ON public.company_account_ids
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 3. Allow super admins to manage all account IDs
CREATE POLICY "super_admins_full_access" ON public.company_account_ids
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- 4. Service role always has full access
CREATE POLICY "service_role_full_access" ON public.company_account_ids
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);