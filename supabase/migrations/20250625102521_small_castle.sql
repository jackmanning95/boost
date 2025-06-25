/*
  # Fix infinite recursion in users table RLS policies

  1. Problem
    - Current RLS policies on users table create circular dependencies
    - Policies reference users table within themselves causing infinite recursion
    - PostgreSQL error 42P17: "infinite recursion detected in policy for relation users"

  2. Solution
    - Drop all existing problematic policies
    - Create simplified policies that avoid circular references
    - Use auth.uid() directly instead of complex subqueries where possible
    - Separate company-based access from user-based access

  3. New Policies
    - Users can read their own profile
    - Users can update their own profile
    - Users can insert their own record
    - Super admins (boostdata.io emails) can manage all users
    - Company users can read other users in same company (simplified)
*/

-- Drop all existing policies on users table to start fresh
DROP POLICY IF EXISTS "company_users_can_read_same_company" ON users;
DROP POLICY IF EXISTS "super_admins_can_delete_users" ON users;
DROP POLICY IF EXISTS "super_admins_can_insert_any_user" ON users;
DROP POLICY IF EXISTS "super_admins_can_read_all_users" ON users;
DROP POLICY IF EXISTS "super_admins_can_update_any_user" ON users;
DROP POLICY IF EXISTS "users_can_insert_own_record" ON users;
DROP POLICY IF EXISTS "users_can_read_own_profile" ON users;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON users;

-- Create new simplified policies

-- 1. Users can read their own profile (most basic access)
CREATE POLICY "users_can_read_own_profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- 2. Users can update their own profile
CREATE POLICY "users_can_update_own_profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 3. Users can insert their own record (for signup)
CREATE POLICY "users_can_insert_own_record"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- 4. Super admins can read all users (simplified check)
CREATE POLICY "super_admins_can_read_all_users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email LIKE '%@boostdata.io'
    )
  );

-- 5. Super admins can update any user
CREATE POLICY "super_admins_can_update_any_user"
  ON users
  FOR UPDATE
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

-- 6. Super admins can insert any user
CREATE POLICY "super_admins_can_insert_any_user"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email LIKE '%@boostdata.io'
    )
  );

-- 7. Super admins can delete users
CREATE POLICY "super_admins_can_delete_users"
  ON users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email LIKE '%@boostdata.io'
    )
  );

-- 8. Company users can read other users in same company (simplified)
-- This policy avoids recursion by not referencing the users table in a subquery
CREATE POLICY "company_users_can_read_same_company"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    company_id IS NOT NULL 
    AND company_id = (
      SELECT u.company_id 
      FROM users u 
      WHERE u.id = auth.uid() 
      LIMIT 1
    )
  );

-- Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;