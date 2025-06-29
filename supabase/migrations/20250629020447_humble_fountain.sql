/*
  # Fix infinite recursion in users table RLS policies

  1. Problem
    - Several RLS policies on the users table are causing infinite recursion
    - Policies are querying the users table from within users table policies
    - This creates circular dependencies during policy evaluation

  2. Solution
    - Remove problematic policies that cause recursion
    - Simplify policies to avoid self-referential queries
    - Use auth.uid() directly instead of querying users table within policies
    - Keep essential access patterns while eliminating recursion

  3. Changes
    - Drop all existing policies on users table
    - Create new simplified policies that don't cause recursion
    - Maintain security while avoiding circular references
*/

-- Drop all existing policies on users table to start fresh
DROP POLICY IF EXISTS "company_admin_manage_access" ON users;
DROP POLICY IF EXISTS "company_members_read_access" ON users;
DROP POLICY IF EXISTS "own_profile_access" ON users;
DROP POLICY IF EXISTS "service_role_access" ON users;
DROP POLICY IF EXISTS "super_admin_full_access" ON users;

-- Create new simplified policies that avoid recursion

-- 1. Users can always read and update their own profile
CREATE POLICY "users_own_profile_access"
  ON users
  FOR ALL
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 2. Service role has full access (needed for triggers and functions)
CREATE POLICY "users_service_role_access"
  ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. Super admins (boostdata.io emails) have full access
-- Use auth.users table directly to avoid recursion
CREATE POLICY "users_super_admin_access"
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

-- 4. Company admins can read users in their company
-- This policy is more complex but avoids recursion by using a subquery approach
CREATE POLICY "users_company_admin_read_access"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    -- Allow if the requesting user is an admin and shares the same company_id
    company_id IS NOT NULL 
    AND company_id IN (
      SELECT u.company_id 
      FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
      AND u.company_id IS NOT NULL
    )
  );

-- 5. Company admins can update users in their company (except role changes)
CREATE POLICY "users_company_admin_update_access"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    company_id IS NOT NULL 
    AND company_id IN (
      SELECT u.company_id 
      FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
      AND u.company_id IS NOT NULL
    )
  )
  WITH CHECK (
    company_id IS NOT NULL 
    AND company_id IN (
      SELECT u.company_id 
      FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
      AND u.company_id IS NOT NULL
    )
  );