/*
  # Fix Users Table RLS Policies

  1. Security Functions
    - `get_current_user_company_id()` - safely get current user's company ID
    - `is_current_user_company_admin()` - check if current user is company admin

  2. RLS Policies
    - Drop all existing problematic policies that cause recursion
    - Create new non-recursive policies for user access control
    - Allow users to read own profile and company members
    - Allow company admins to manage company users
    - Allow super admins and service role full access

  3. Security
    - All policies avoid recursion by using security definer functions
    - Super admin check uses auth.users table to avoid recursion
    - Company-based access control without infinite loops
*/

-- First, drop ALL existing policies on users table to start fresh
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'users' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON users';
    END LOOP;
END $$;

-- Drop existing helper functions if they exist
DROP FUNCTION IF EXISTS get_current_user_company_id();
DROP FUNCTION IF EXISTS is_current_user_company_admin();

-- Create a security definer function to get current user's company_id
-- This avoids recursion by being executed with elevated privileges
CREATE OR REPLACE FUNCTION get_current_user_company_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

-- Create a security definer function to check if current user is company admin
CREATE OR REPLACE FUNCTION is_current_user_company_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'admin'
    AND company_id IS NOT NULL
  );
$$;

-- Create new policies that don't cause recursion

-- Policy 1: Users can read their own profile
CREATE POLICY "users_can_read_own_profile" 
  ON users 
  FOR SELECT 
  TO authenticated 
  USING (id = auth.uid());

-- Policy 2: Users can update their own profile
CREATE POLICY "users_can_update_own_profile" 
  ON users 
  FOR UPDATE 
  TO authenticated 
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Policy 3: Users can insert their own record (for signup)
CREATE POLICY "users_can_insert_own_record" 
  ON users 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (id = auth.uid());

-- Policy 4: Service role has full access
CREATE POLICY "service_role_full_access" 
  ON users 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- Policy 5: Super admins have full access (using auth.users table to avoid recursion)
CREATE POLICY "super_admins_full_access" 
  ON users 
  FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND email LIKE '%@boostdata.io'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND email LIKE '%@boostdata.io'
    )
  );

-- Policy 6: Company members can read each other (non-recursive)
CREATE POLICY "company_members_can_read_each_other" 
  ON users 
  FOR SELECT 
  TO authenticated 
  USING (
    company_id IS NOT NULL 
    AND company_id = get_current_user_company_id()
  );

-- Policy 7: Company admins can manage company users (non-recursive)
CREATE POLICY "company_admins_can_manage_users" 
  ON users 
  FOR ALL 
  TO authenticated 
  USING (
    is_current_user_company_admin() 
    AND company_id = get_current_user_company_id()
  )
  WITH CHECK (
    is_current_user_company_admin() 
    AND company_id = get_current_user_company_id()
  );

-- Grant execute permissions on the helper functions
GRANT EXECUTE ON FUNCTION get_current_user_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION is_current_user_company_admin() TO authenticated;

-- Ensure RLS is enabled on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;