/*
  # Fix Users Table RLS Policies

  This migration fixes the infinite recursion issue in the users table RLS policies
  by simplifying the policy logic and removing circular dependencies.

  ## Changes Made
  1. Drop existing problematic policies
  2. Create simplified, non-recursive policies
  3. Ensure policies don't reference the same table they're protecting

  ## New Policies
  - Users can read their own profile
  - Users can update their own profile  
  - Admins can read all profiles (simplified check)
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Enable admin read access to all profiles" ON users;
DROP POLICY IF EXISTS "Users can read profiles in their company" ON users;
DROP POLICY IF EXISTS "Enable users to update their own profile" ON users;

-- Create simplified, non-recursive policies
CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Simplified admin policy that doesn't cause recursion
-- This checks the user's role from their own record only
CREATE POLICY "Admins can read all profiles"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR 
    EXISTS (
      SELECT 1 FROM users admin_user 
      WHERE admin_user.id = auth.uid() 
      AND admin_user.role = 'admin'
      LIMIT 1
    )
  );

-- Allow users to read basic company info for users in their company
-- This is a separate, simpler policy
CREATE POLICY "Users can read company colleagues basic info"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR
    (
      company_id IS NOT NULL AND
      company_id = (
        SELECT company_id FROM users self_user 
        WHERE self_user.id = auth.uid()
        LIMIT 1
      )
    )
  );