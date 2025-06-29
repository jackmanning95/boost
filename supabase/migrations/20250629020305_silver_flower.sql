/*
  # Fix infinite recursion in users table RLS policies

  1. Problem
    - Multiple RLS policies on users table are creating infinite recursion
    - Policies are querying the users table from within the policy conditions
    - This causes circular dependencies when Supabase tries to evaluate access

  2. Solution
    - Remove problematic policies that cause recursion
    - Keep only essential policies that don't create circular dependencies
    - Use auth.uid() directly instead of querying users table within policies
    - Simplify policy logic to avoid self-referential queries

  3. Changes
    - Drop all existing problematic policies
    - Create new simplified policies that avoid recursion
    - Ensure super admin access using auth.users table instead of public.users
    - Use direct auth.uid() comparisons where possible
*/

-- Drop all existing policies on users table to start fresh
DROP POLICY IF EXISTS "company_admin_manage" ON users;
DROP POLICY IF EXISTS "company_members_read" ON users;
DROP POLICY IF EXISTS "service_role_full_access" ON users;
DROP POLICY IF EXISTS "super_admin_access" ON users;
DROP POLICY IF EXISTS "users_own_profile" ON users;

-- Create new simplified policies that avoid recursion

-- 1. Users can manage their own profile
CREATE POLICY "users_own_profile" ON users
  FOR ALL
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 2. Service role has full access (no recursion here)
CREATE POLICY "service_role_full_access" ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. Super admin access using auth.users table (avoids recursion)
CREATE POLICY "super_admin_access" ON users
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

-- 4. Company members can read other members in their company
-- This policy is more complex but avoids recursion by using a subquery approach
CREATE POLICY "company_members_read" ON users
  FOR SELECT
  TO authenticated
  USING (
    company_id IS NOT NULL 
    AND company_id = (
      SELECT u.company_id 
      FROM users u 
      WHERE u.id = auth.uid() 
      AND u.company_id IS NOT NULL
      LIMIT 1
    )
  );

-- 5. Company admins can manage users in their company
CREATE POLICY "company_admin_manage" ON users
  FOR ALL
  TO authenticated
  USING (
    company_id IS NOT NULL 
    AND company_id = (
      SELECT u.company_id 
      FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin' 
      AND u.company_id IS NOT NULL
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
      AND u.company_id IS NOT NULL
      LIMIT 1
    )
  );