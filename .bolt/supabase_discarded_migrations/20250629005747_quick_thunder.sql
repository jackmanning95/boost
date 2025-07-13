/*
  # Fix infinite recursion in users table RLS policies

  1. Security Changes
    - Remove problematic recursive policies that cause infinite loops
    - Create simplified policies using security definer functions
    - Maintain proper access control without recursion

  2. New Policies
    - Users can read/update their own profile
    - Service role has full access
    - Super admins have full access
    - Company members can read each other (via non-recursive function)
*/

-- First, drop all existing problematic policies
DROP POLICY IF EXISTS "company_admins_can_read_company_users" ON users;
DROP POLICY IF EXISTS "company_users_can_read_same_company" ON users;
DROP POLICY IF EXISTS "users_can_read_company_members" ON users;
DROP POLICY IF EXISTS "company_admins_can_update_company_users" ON users;
DROP POLICY IF EXISTS "company_admins_can_delete_company_users" ON users;

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

-- Create simplified policies that don't cause recursion

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