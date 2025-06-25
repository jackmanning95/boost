/*
  # Fix infinite recursion in users table RLS policies

  1. Security Changes
    - Drop existing problematic RLS policies on users table
    - Create new policies that avoid recursive queries
    - Use auth.uid() and auth.jwt() claims instead of querying users table
    - Implement helper functions to check roles without recursion

  2. New Approach
    - Use custom claims in JWT for role-based access
    - Avoid querying users table within users table policies
    - Create separate functions for role checking that use auth schema
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "User access control" ON users;
DROP POLICY IF EXISTS "User creation control" ON users;
DROP POLICY IF EXISTS "User deletion control" ON users;
DROP POLICY IF EXISTS "User update control" ON users;

-- Create a function to check if user is super admin using auth.users
CREATE OR REPLACE FUNCTION auth.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_user_meta_data->>'role' = 'super_admin'
  );
$$;

-- Create a function to get user's company_id from auth metadata
CREATE OR REPLACE FUNCTION auth.get_user_company_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT (raw_user_meta_data->>'company_id')::uuid 
  FROM auth.users 
  WHERE id = auth.uid();
$$;

-- Create a function to get user's role from auth metadata
CREATE OR REPLACE FUNCTION auth.get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(raw_user_meta_data->>'role', 'client')
  FROM auth.users 
  WHERE id = auth.uid();
$$;

-- Create new non-recursive policies for users table

-- Users can read their own data, company admins can read users in their company, super admins can read all
CREATE POLICY "Users can read accessible data"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    auth.is_super_admin() OR
    id = auth.uid() OR
    (
      auth.get_user_role() = 'admin' AND
      auth.get_user_company_id() IS NOT NULL AND
      company_id = auth.get_user_company_id()
    ) OR
    (
      auth.get_user_company_id() IS NOT NULL AND
      company_id = auth.get_user_company_id()
    )
  );

-- Users can create their own records, company admins can create users in their company, super admins can create any
CREATE POLICY "Users can create accessible records"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.is_super_admin() OR
    id = auth.uid() OR
    (
      auth.get_user_role() = 'admin' AND
      auth.get_user_company_id() IS NOT NULL AND
      company_id = auth.get_user_company_id()
    )
  );

-- Users can update their own data, company admins can update users in their company (except super admins), super admins can update any
CREATE POLICY "Users can update accessible records"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    auth.is_super_admin() OR
    id = auth.uid() OR
    (
      auth.get_user_role() = 'admin' AND
      auth.get_user_company_id() IS NOT NULL AND
      company_id = auth.get_user_company_id()
    )
  )
  WITH CHECK (
    auth.is_super_admin() OR
    id = auth.uid() OR
    (
      auth.get_user_role() = 'admin' AND
      auth.get_user_company_id() IS NOT NULL AND
      company_id = auth.get_user_company_id() AND
      role != 'super_admin'
    )
  );

-- Only super admins and company admins can delete users (but not themselves for company admins)
CREATE POLICY "Users can delete accessible records"
  ON users
  FOR DELETE
  TO authenticated
  USING (
    auth.is_super_admin() OR
    (
      auth.get_user_role() = 'admin' AND
      auth.get_user_company_id() IS NOT NULL AND
      company_id = auth.get_user_company_id() AND
      id != auth.uid()
    )
  );

-- Update the trigger function to sync user metadata
CREATE OR REPLACE FUNCTION handle_new_user_with_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Sync role and company_id from auth.users metadata if available
  IF NEW.role IS NULL THEN
    NEW.role := COALESCE(
      (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = NEW.id),
      'client'
    );
  END IF;
  
  IF NEW.company_id IS NULL THEN
    NEW.company_id := (
      SELECT (raw_user_meta_data->>'company_id')::uuid 
      FROM auth.users 
      WHERE id = NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;