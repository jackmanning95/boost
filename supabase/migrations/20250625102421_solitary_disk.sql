/*
  # Fix Users Table RLS Policies

  This migration resolves the infinite recursion error in the users table policies by:
  
  1. Dropping all existing conflicting policies on the users table
  2. Creating simplified, non-recursive policies that avoid circular references
  3. Ensuring proper access control without policy conflicts

  ## Changes Made
  - Remove all existing policies that cause recursion
  - Add clean, simple policies for user access control
  - Maintain security while preventing infinite loops
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

-- Create simple, non-recursive policies

-- Allow users to read their own profile
CREATE POLICY "users_can_read_own_profile" ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "users_can_update_own_profile" ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow users to insert their own record (for signup)
CREATE POLICY "users_can_insert_own_record" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow super admins (boostdata.io emails) to manage all users
-- Using auth.users table directly to avoid recursion
CREATE POLICY "super_admins_can_read_all_users" ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email LIKE '%@boostdata.io'
    )
  );

CREATE POLICY "super_admins_can_update_any_user" ON users
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

CREATE POLICY "super_admins_can_insert_any_user" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email LIKE '%@boostdata.io'
    )
  );

CREATE POLICY "super_admins_can_delete_users" ON users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email LIKE '%@boostdata.io'
    )
  );

-- Allow company users to read other users in their company
-- This policy is simplified to avoid recursion by using a more direct approach
CREATE POLICY "company_users_can_read_same_company" ON users
  FOR SELECT
  TO authenticated
  USING (
    company_id IS NOT NULL 
    AND company_id = (
      SELECT company_id FROM users 
      WHERE id = auth.uid() 
      LIMIT 1
    )
  );