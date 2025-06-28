/*
  # Fix infinite recursion in users table RLS policies

  1. Problem
    - Multiple overlapping policies on users table causing infinite recursion
    - Policies are trying to query users table from within users table policies
    - This creates circular dependency when fetching user data

  2. Solution
    - Drop all existing problematic policies
    - Create simplified, non-recursive policies
    - Use auth.uid() directly instead of querying users table
    - Separate super admin access from regular user access

  3. Security
    - Users can only access their own records
    - Super admins (boostdata.io emails) have full access
    - Service role has full access for system operations
*/

-- Drop all existing policies on users table to start fresh
DROP POLICY IF EXISTS "service_role_full_access" ON users;
DROP POLICY IF EXISTS "super_admins_full_access" ON users;
DROP POLICY IF EXISTS "users_can_insert_own_record" ON users;
DROP POLICY IF EXISTS "users_can_read_own_profile" ON users;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON users;

-- Create simplified, non-recursive policies

-- Service role has full access (for system operations)
CREATE POLICY "service_role_full_access" ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Super admins (boostdata.io emails) have full access
-- Use auth.users table directly to avoid recursion
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

-- Users can read their own profile
CREATE POLICY "users_can_read_own_profile" ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can insert their own record (for signup)
CREATE POLICY "users_can_insert_own_record" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "users_can_update_own_profile" ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);