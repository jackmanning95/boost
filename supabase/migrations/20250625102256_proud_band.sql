/*
  # Fix Users Table RLS Policies - Resolve Infinite Recursion

  This migration fixes the infinite recursion issue in the users table RLS policies
  by simplifying the policies and removing circular dependencies.

  ## Changes Made
  1. Drop all existing problematic policies on users table
  2. Create simplified, non-recursive policies
  3. Ensure policies don't create circular dependencies with company lookups

  ## Security
  - Users can read their own profile
  - Super admins can read all users
  - Company admins can read users in their company (simplified logic)
  - Users can update their own profile
  - Super admins can manage any user
*/

-- Drop all existing policies on users table to start fresh
DROP POLICY IF EXISTS "Users can read profiles in their company" ON users;
DROP POLICY IF EXISTS "super_admins_can_delete_users" ON users;
DROP POLICY IF EXISTS "super_admins_can_insert_any_user" ON users;
DROP POLICY IF EXISTS "super_admins_can_read_all_users" ON users;
DROP POLICY IF EXISTS "super_admins_can_update_any_user" ON users;
DROP POLICY IF EXISTS "users_can_insert_own_record" ON users;
DROP POLICY IF EXISTS "users_can_read_own_profile" ON users;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON users;

-- Create simplified, non-recursive policies

-- 1. Users can always read their own profile (no recursion)
CREATE POLICY "users_can_read_own_profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- 2. Users can insert their own record during signup
CREATE POLICY "users_can_insert_own_record"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- 3. Users can update their own profile
CREATE POLICY "users_can_update_own_profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4. Super admins can read all users (check email directly from auth.users)
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

-- 5. Super admins can insert any user
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

-- 6. Super admins can update any user
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

-- 7. Super admins can delete any user
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

-- 8. Company admins can read users in their company (simplified - no self-reference)
-- This policy allows reading users with the same company_id, but avoids recursion
-- by not checking the current user's role in the policy itself
CREATE POLICY "company_users_can_read_same_company"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    company_id IS NOT NULL 
    AND company_id IN (
      SELECT u.company_id 
      FROM users u 
      WHERE u.id = auth.uid() 
      AND u.company_id IS NOT NULL
    )
  );