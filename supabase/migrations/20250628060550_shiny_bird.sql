/*
  # Fix infinite recursion in users table RLS policies

  1. Problem
    - Multiple policies on the users table are causing infinite recursion
    - Policies are trying to query the users table from within users table policies
    - This creates circular references during policy evaluation

  2. Solution
    - Remove problematic policies that cause recursion
    - Simplify policies to avoid self-referential queries
    - Keep essential policies for basic access control
    - Use auth.uid() directly instead of complex subqueries

  3. Changes
    - Drop all existing policies on users table
    - Create simplified, non-recursive policies
    - Ensure users can read/update their own records
    - Allow service role full access
    - Allow super admins (boostdata.io emails) full access via auth.users
*/

-- Drop all existing policies on users table to start fresh
DROP POLICY IF EXISTS "company_admins_can_read_company_users" ON users;
DROP POLICY IF EXISTS "company_admins_can_update_company_users" ON users;
DROP POLICY IF EXISTS "service_role_full_access" ON users;
DROP POLICY IF EXISTS "super_admins_full_access" ON users;
DROP POLICY IF EXISTS "users_can_insert_own_record" ON users;
DROP POLICY IF EXISTS "users_can_read_own_profile" ON users;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON users;

-- Create simplified, non-recursive policies

-- 1. Users can read their own profile
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

-- 4. Service role has full access
CREATE POLICY "service_role_full_access"
  ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. Super admins (boostdata.io emails) have full access
-- Use auth.users table directly to avoid recursion
CREATE POLICY "super_admins_full_access"
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

-- Note: Company admin policies are intentionally removed to prevent recursion
-- Company-based access control should be handled at the application level
-- as mentioned in the table comment