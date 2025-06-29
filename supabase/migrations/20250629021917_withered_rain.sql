/*
  # Final RLS Fix for Users Table - Eliminate All Recursion

  1. Security Changes
    - Drop all existing policies that cause recursion
    - Create security definer functions to avoid RLS triggers
    - Implement simple, non-recursive policies
    - Ensure service_role has full access for invite-user function

  2. Key Features
    - Service role full access (critical for Edge Functions)
    - User own profile access (basic requirement)
    - Super admin access via auth.users (no recursion)
    - Company-based access using helper functions
*/

-- Drop ALL existing policies on users table
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'users' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON public.users';
    END LOOP;
END $$;

-- Drop any existing helper functions
DROP FUNCTION IF EXISTS get_user_company_id(uuid);
DROP FUNCTION IF EXISTS is_user_company_admin(uuid);
DROP FUNCTION IF EXISTS get_current_user_company_id();
DROP FUNCTION IF EXISTS is_current_user_company_admin();

-- Create security definer functions that run with elevated privileges
-- These avoid RLS recursion by bypassing row-level security
CREATE OR REPLACE FUNCTION get_user_company_id(user_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT company_id FROM public.users WHERE id = user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION is_user_company_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = user_id 
    AND role = 'admin'
    AND company_id IS NOT NULL
  );
$$;

-- Grant execute permissions to all relevant roles
GRANT EXECUTE ON FUNCTION get_user_company_id(uuid) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION is_user_company_admin(uuid) TO authenticated, service_role, anon;

-- Create simple, non-recursive RLS policies

-- 1. CRITICAL: Service role must have full access for invite-user function
CREATE POLICY "service_role_full_access"
  ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. Users can manage their own profile (basic requirement)
CREATE POLICY "own_profile_access"
  ON users
  FOR ALL
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 3. Super admins have full access (uses auth.users to avoid recursion)
CREATE POLICY "super_admin_full_access"
  ON users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email LIKE '%@boostdata.io'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email LIKE '%@boostdata.io'
    )
  );

-- 4. Company members can read other company members
CREATE POLICY "company_members_read"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    company_id IS NOT NULL 
    AND company_id = get_user_company_id(auth.uid())
  );

-- 5. Company admins can manage company users
CREATE POLICY "company_admin_manage"
  ON users
  FOR ALL
  TO authenticated
  USING (
    is_user_company_admin(auth.uid())
    AND company_id IS NOT NULL 
    AND company_id = get_user_company_id(auth.uid())
  )
  WITH CHECK (
    is_user_company_admin(auth.uid())
    AND company_id IS NOT NULL 
    AND company_id = get_user_company_id(auth.uid())
  );

-- Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Test the policies by selecting from the table
-- This should not cause recursion errors
SELECT COUNT(*) FROM users WHERE id = auth.uid();