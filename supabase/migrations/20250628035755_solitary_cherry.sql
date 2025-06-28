/*
  # Fix infinite recursion in users table RLS policies

  1. Problem
    - Multiple policies on users table are creating circular references
    - Policies that join users table with itself cause infinite recursion
    - Company-based access policies are particularly problematic

  2. Solution
    - Remove problematic policies that cause recursion
    - Simplify policies to use direct auth.uid() checks
    - Keep essential policies for basic user access control
    - Remove complex company-based joins that cause recursion

  3. Security
    - Maintain basic user access control
    - Users can read/update their own profiles
    - Super admins maintain full access
    - Remove complex company-based policies that cause recursion
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

-- Create simplified, non-recursive policies

-- Allow users to read their own profile
CREATE POLICY "users_can_read_own_profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "users_can_update_own_profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow users to insert their own record (for signup)
CREATE POLICY "users_can_insert_own_record"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow super admins (boostdata.io emails) full access
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