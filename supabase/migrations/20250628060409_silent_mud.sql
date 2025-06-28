-- Fix RLS policies to ensure Edge Function can work properly
-- This migration addresses the Auth 500 error by ensuring proper permissions

-- Drop all existing policies on users table
DROP POLICY IF EXISTS "service_role_full_access" ON users;
DROP POLICY IF EXISTS "super_admins_full_access" ON users;
DROP POLICY IF EXISTS "users_can_insert_own_record" ON users;
DROP POLICY IF EXISTS "users_can_read_own_profile" ON users;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON users;

-- Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 1. Service role has full access (CRITICAL for Edge Functions)
CREATE POLICY "service_role_full_access" ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. Super admins (boostdata.io emails) have full access
CREATE POLICY "super_admins_full_access" ON users
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

-- 3. Users can read their own profile
CREATE POLICY "users_can_read_own_profile" ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- 4. Users can insert their own record (for signup)
CREATE POLICY "users_can_insert_own_record" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- 5. Users can update their own profile
CREATE POLICY "users_can_update_own_profile" ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 6. Company admins can read users in their company
-- Using a subquery to avoid recursion issues
CREATE POLICY "company_admins_can_read_company_users" ON users
  FOR SELECT
  TO authenticated
  USING (
    company_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM users admin_user
      WHERE admin_user.id = auth.uid()
      AND admin_user.company_id = users.company_id
      AND admin_user.role IN ('admin', 'super_admin')
    )
  );

-- 7. Company admins can update users in their company (for role changes)
CREATE POLICY "company_admins_can_update_company_users" ON users
  FOR UPDATE
  TO authenticated
  USING (
    company_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM users admin_user
      WHERE admin_user.id = auth.uid()
      AND admin_user.company_id = users.company_id
      AND admin_user.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    company_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM users admin_user
      WHERE admin_user.id = auth.uid()
      AND admin_user.company_id = users.company_id
      AND admin_user.role IN ('admin', 'super_admin')
    )
  );

-- Verify the policies were created correctly
SELECT 
  policyname,
  cmd,
  roles,
  qual IS NOT NULL as has_using_clause,
  with_check IS NOT NULL as has_with_check_clause
FROM pg_policies 
WHERE tablename = 'users' 
ORDER BY policyname;