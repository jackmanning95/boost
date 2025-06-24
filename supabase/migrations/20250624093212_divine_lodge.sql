/*
  # Fix infinite recursion in users table RLS policies

  1. Problem
    - Current policies have circular references causing infinite recursion
    - Policies are referencing the users table within their own conditions
    - This creates loops when Supabase tries to evaluate access permissions

  2. Solution
    - Remove problematic policies that cause recursion
    - Create simplified, safe policies using auth.uid() directly
    - Ensure super admin policies use auth.users table instead of public.users
    - Maintain proper access control without circular references

  3. Changes
    - Drop all existing problematic policies
    - Create new safe policies for user access
    - Use auth.uid() for self-access
    - Use auth.users table for super admin checks to avoid recursion
*/

-- Drop all existing policies on users table to start fresh
DROP POLICY IF EXISTS "super_admins_can_delete_users" ON users;
DROP POLICY IF EXISTS "super_admins_can_insert_any_user" ON users;
DROP POLICY IF EXISTS "super_admins_can_read_all_users" ON users;
DROP POLICY IF EXISTS "super_admins_can_update_any_user" ON users;
DROP POLICY IF EXISTS "users_can_insert_own_record" ON users;
DROP POLICY IF EXISTS "users_can_read_own_profile" ON users;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON users;

-- Create safe policies that don't cause recursion

-- Users can read their own profile
CREATE POLICY "users_can_read_own_profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "users_can_update_own_profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can insert their own record (for initial signup)
CREATE POLICY "users_can_insert_own_record"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Super admins can read all users (using auth.users to avoid recursion)
CREATE POLICY "super_admins_can_read_all_users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email LIKE '%@boostdata.io'
    )
  );

-- Super admins can update any user (using auth.users to avoid recursion)
CREATE POLICY "super_admins_can_update_any_user"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email LIKE '%@boostdata.io'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email LIKE '%@boostdata.io'
    )
  );

-- Super admins can insert any user (using auth.users to avoid recursion)
CREATE POLICY "super_admins_can_insert_any_user"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email LIKE '%@boostdata.io'
    )
  );

-- Super admins can delete users (using auth.users to avoid recursion)
CREATE POLICY "super_admins_can_delete_users"
  ON users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email LIKE '%@boostdata.io'
    )
  );