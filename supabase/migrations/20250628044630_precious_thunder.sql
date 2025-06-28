/*
  # Fix infinite recursion in users table RLS policies

  1. Problem
    - Multiple RLS policies on the users table are causing infinite recursion
    - Policies are referencing the users table within their own conditions
    - This creates circular dependencies when Supabase tries to evaluate access

  2. Solution
    - Remove problematic policies that cause recursion
    - Simplify policies to avoid self-referential queries
    - Keep essential policies for basic user access control
    - Use auth.uid() directly instead of complex subqueries

  3. Changes
    - Drop all existing problematic policies
    - Create simplified, non-recursive policies
    - Ensure users can access their own data
    - Allow service role full access for system operations
*/

-- Drop all existing policies on users table to start fresh
DROP POLICY IF EXISTS "company_admins_can_read_company_users" ON users;
DROP POLICY IF EXISTS "company_admins_can_update_company_users" ON users;
DROP POLICY IF EXISTS "service_role_can_insert_users" ON users;
DROP POLICY IF EXISTS "super_admins_full_access" ON users;
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

-- Allow service role full access for system operations
CREATE POLICY "service_role_full_access"
  ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow super admins (boostdata.io emails) full access
-- This policy checks auth.users directly to avoid recursion
CREATE POLICY "super_admins_full_access"
  ON users
  FOR ALL
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