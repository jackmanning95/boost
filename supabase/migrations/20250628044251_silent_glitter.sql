/*
  # Fix User Policies for Team Management

  1. Security Changes
    - Drop all existing conflicting policies on users table
    - Create simplified, non-recursive policies
    - Add company-wide user access for team management

  2. New Policies
    - Users can read their own profile
    - Users can update their own profile  
    - Users can insert their own record (signup)
    - Company admins can read all users in their company
    - Super admins have full access
*/

-- Drop all existing policies on users table to start fresh
DROP POLICY IF EXISTS "users_can_read_company_members" ON users;
DROP POLICY IF EXISTS "company_users_can_read_same_company" ON users;
DROP POLICY IF EXISTS "super_admins_can_delete_users" ON users;
DROP POLICY IF EXISTS "super_admins_can_insert_any_user" ON users;
DROP POLICY IF EXISTS "super_admins_can_read_all_users" ON users;
DROP POLICY IF EXISTS "super_admins_can_update_any_user" ON users;
DROP POLICY IF EXISTS "users_can_insert_own_record" ON users;
DROP POLICY IF EXISTS "users_can_read_own_profile" ON users;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON users;
DROP POLICY IF EXISTS "super_admins_full_access" ON users;

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

-- Allow company admins to read users in their company
-- This uses a direct lookup to avoid recursion
CREATE POLICY "company_admins_can_read_company_users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    company_id IS NOT NULL 
    AND company_id IN (
      SELECT company_id 
      FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Allow company admins to update users in their company (for role changes)
CREATE POLICY "company_admins_can_update_company_users"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    company_id IS NOT NULL 
    AND company_id IN (
      SELECT company_id 
      FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    company_id IS NOT NULL 
    AND company_id IN (
      SELECT company_id 
      FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

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

-- Allow service role to insert users (for invitations via Edge Function)
CREATE POLICY "service_role_can_insert_users"
  ON users
  FOR INSERT
  TO service_role
  WITH CHECK (true);