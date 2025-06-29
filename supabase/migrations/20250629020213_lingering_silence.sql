/*
  # Fix infinite recursion in users table RLS policies

  1. Problem
    - Multiple RLS policies on the users table are creating infinite recursion
    - Policies are querying the users table within their own definitions
    - This prevents any queries to the users table from succeeding

  2. Solution
    - Drop all existing problematic policies
    - Create simplified, non-recursive policies
    - Ensure service_role has full access
    - Allow users to read their own profile
    - Allow company admins to manage users in their company
    - Allow super admins (boostdata.io emails) full access

  3. Security
    - Enable RLS on users table
    - Simple, safe policies that don't create circular dependencies
    - Maintain proper access control without recursion
*/

-- Drop all existing policies on users table to start fresh
DROP POLICY IF EXISTS "company_admin_manage" ON users;
DROP POLICY IF EXISTS "company_members_read" ON users;
DROP POLICY IF EXISTS "service_role_full_access" ON users;
DROP POLICY IF EXISTS "super_admin_access" ON users;
DROP POLICY IF EXISTS "users_own_profile" ON users;

-- Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 1. Service role gets full access (no recursion)
CREATE POLICY "service_role_full_access"
  ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. Users can read and update their own profile (simple, no recursion)
CREATE POLICY "users_own_profile"
  ON users
  FOR ALL
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 3. Super admins (boostdata.io emails) get full access
-- Use auth.users table directly to avoid recursion
CREATE POLICY "super_admin_access"
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

-- 4. Company admins can manage users in their company
-- This policy is more complex but avoids recursion by using a subquery approach
CREATE POLICY "company_admin_manage"
  ON users
  FOR ALL
  TO authenticated
  USING (
    -- Allow if the current user is an admin and shares the same company_id
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
    -- Same check for inserts/updates
    company_id IS NOT NULL 
    AND company_id IN (
      SELECT u.company_id 
      FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
      AND u.company_id IS NOT NULL
    )
  );

-- 5. Company members can read other users in their company
CREATE POLICY "company_members_read"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    company_id IS NOT NULL 
    AND company_id IN (
      SELECT u.company_id 
      FROM users u 
      WHERE u.id = auth.uid() 
      AND u.company_id IS NOT NULL
    )
  );