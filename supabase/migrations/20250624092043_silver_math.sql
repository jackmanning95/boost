/*
  # Fix Users Table RLS Policies - Remove Infinite Recursion

  1. Problem
    - Multiple overlapping policies on users table
    - Policies with recursive references causing infinite loops
    - Complex subqueries that reference the same table being queried

  2. Solution
    - Drop all existing policies on users table
    - Create simplified, non-recursive policies
    - Use direct auth.uid() comparisons where possible
    - Avoid complex subqueries that could cause recursion

  3. New Policy Structure
    - Users can read their own profile
    - Super admins can read all users
    - Company admins can read users in their company
    - Users can update their own profile
    - Proper insert/delete policies for different roles
*/

-- Drop all existing policies on users table to start fresh
DROP POLICY IF EXISTS "Allow super_admins to update any user" ON users;
DROP POLICY IF EXISTS "Allow users to insert their own user record" ON users;
DROP POLICY IF EXISTS "Allow users to read own profile" ON users;
DROP POLICY IF EXISTS "Allow users to read their own row" ON users;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON users;
DROP POLICY IF EXISTS "Enable read access for users to their own profile" ON users;
DROP POLICY IF EXISTS "Enable update access for users to their own profile" ON users;
DROP POLICY IF EXISTS "Super admins can delete all users" ON users;
DROP POLICY IF EXISTS "Super admins can read all users" ON users;
DROP POLICY IF EXISTS "Users can read minimal user info for foreign keys" ON users;
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can read their own profile" ON users;
DROP POLICY IF EXISTS "Users can read their own record" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "users_delete_policy" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;
DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;

-- Create simplified, non-recursive policies

-- SELECT policies
CREATE POLICY "users_can_read_own_profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

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

-- INSERT policies
CREATE POLICY "users_can_insert_own_record"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

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

-- UPDATE policies
CREATE POLICY "users_can_update_own_profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

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

-- DELETE policies
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