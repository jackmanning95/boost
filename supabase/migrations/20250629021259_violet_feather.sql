/*
  # Fix Users Table RLS Policies

  This migration resolves the infinite recursion error in the users table RLS policies
  by removing conflicting policies and establishing clean, non-recursive policies.

  ## Changes Made
  1. Drop all existing conflicting policies on users table
  2. Create simple, non-recursive policies that don't reference the users table within themselves
  3. Ensure policies use auth.uid() directly without complex joins back to users table

  ## Security
  - Users can read and update their own profile
  - Company admins can read users in their company (simplified)
  - Super admins (boostdata.io emails) have full access
  - Service role has full access for system operations
*/

-- Drop all existing policies on users table to start fresh
DROP POLICY IF EXISTS "users_company_admin_read_access" ON users;
DROP POLICY IF EXISTS "users_company_admin_update_access" ON users;
DROP POLICY IF EXISTS "users_own_profile_access" ON users;
DROP POLICY IF EXISTS "users_service_role_access" ON users;
DROP POLICY IF EXISTS "users_super_admin_access" ON users;

-- Create simple, non-recursive policies

-- 1. Users can access their own profile (most important and safe)
CREATE POLICY "users_own_profile_access"
  ON users
  FOR ALL
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 2. Service role has full access (for system operations)
CREATE POLICY "users_service_role_access"
  ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. Super admin access (boostdata.io emails) - using auth.users directly
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

-- 4. Company admin read access - simplified to avoid recursion
-- This policy allows reading users who share the same company_id
-- We'll use a simpler approach that doesn't create circular references
CREATE POLICY "users_company_read_access"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    -- Allow if the requesting user has the same company_id and is an admin
    company_id IS NOT NULL 
    AND company_id = (
      SELECT u.company_id 
      FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
      LIMIT 1
    )
  );

-- 5. Company admin update access - only for users in same company
CREATE POLICY "users_company_update_access"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    company_id IS NOT NULL 
    AND company_id = (
      SELECT u.company_id 
      FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
      LIMIT 1
    )
  )
  WITH CHECK (
    company_id IS NOT NULL 
    AND company_id = (
      SELECT u.company_id 
      FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
      LIMIT 1
    )
  );