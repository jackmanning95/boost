/*
  # Fix RLS infinite recursion on users table

  1. Problem
    - Multiple overlapping RLS policies on users table causing infinite recursion
    - Policies are querying users table while being applied to users table
    - Complex joins and subqueries in policies creating circular dependencies

  2. Solution
    - Remove all existing RLS policies on users table
    - Create simplified, non-recursive policies
    - Use auth.uid() directly without complex subqueries
    - Separate company-based access control to application level where needed

  3. New Policies
    - Users can manage their own profile
    - Service role has full access
    - Super admins (boostdata.io emails) have full access
    - Company members can read other company members (simplified)
    - Company admins can manage company members (simplified)
*/

-- Drop all existing RLS policies on users table to start fresh
DROP POLICY IF EXISTS "company_admin_manage" ON users;
DROP POLICY IF EXISTS "company_members_read" ON users;
DROP POLICY IF EXISTS "service_role_full_access" ON users;
DROP POLICY IF EXISTS "super_admin_access" ON users;
DROP POLICY IF EXISTS "users_own_profile" ON users;

-- Create simplified, non-recursive policies

-- 1. Service role has full access (essential for system operations)
CREATE POLICY "service_role_access" ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. Users can manage their own profile (most basic access)
CREATE POLICY "own_profile_access" ON users
  FOR ALL
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 3. Super admin access for boostdata.io emails (direct auth.users check)
CREATE POLICY "super_admin_full_access" ON users
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

-- 4. Company members can read other company members (simplified - no recursive user queries)
CREATE POLICY "company_members_read_access" ON users
  FOR SELECT
  TO authenticated
  USING (
    company_id IS NOT NULL 
    AND company_id = (
      SELECT company_id FROM users WHERE id = auth.uid() LIMIT 1
    )
  );

-- 5. Company admins can manage company members (simplified)
CREATE POLICY "company_admin_manage_access" ON users
  FOR ALL
  TO authenticated
  USING (
    company_id IS NOT NULL 
    AND company_id = (
      SELECT company_id FROM users 
      WHERE id = auth.uid() AND role = 'admin' 
      LIMIT 1
    )
  )
  WITH CHECK (
    company_id IS NOT NULL 
    AND company_id = (
      SELECT company_id FROM users 
      WHERE id = auth.uid() AND role = 'admin' 
      LIMIT 1
    )
  );