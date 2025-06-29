/*
  # Fix Users Table RLS Policies

  1. Changes
     - Drop all existing policies on users table
     - Create new non-recursive policies
     - Use security definer functions to avoid recursion
     - Ensure service role has full access for Edge Functions

  2. Security
     - Enable RLS on users table
     - Create policies for authenticated users to access their own data
     - Create policies for company admins to manage users in their company
     - Create policies for super admins to access all data
     - Ensure service role has full access for system operations
*/

-- Drop ALL existing policies on users table to start fresh
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'users' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON public.users';
    END LOOP;
END $$;

-- Drop any existing helper functions
DROP FUNCTION IF EXISTS get_user_company_id(uuid);
DROP FUNCTION IF EXISTS is_user_company_admin(uuid);

-- Create security definer functions to avoid recursion
-- These functions run with elevated privileges and don't trigger RLS
CREATE OR REPLACE FUNCTION get_user_company_id(user_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT company_id FROM public.users WHERE id = user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION is_user_company_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = user_id 
    AND role = 'admin'
    AND company_id IS NOT NULL
  );
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_company_id(uuid) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION is_user_company_admin(uuid) TO authenticated, service_role, anon;

-- Create simple, non-recursive policies

-- 1. Service role has full access (CRITICAL for invite-user function)
CREATE POLICY "service_role_full_access"
  ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. Users can manage their own profile (simple, no recursion)
CREATE POLICY "users_own_profile_access"
  ON users
  FOR ALL
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 3. Super admins have full access (uses auth.users, no recursion)
CREATE POLICY "super_admin_full_access"
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

-- 4. Company members can read other company members (uses security definer function)
CREATE POLICY "company_members_read"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    company_id IS NOT NULL 
    AND company_id = get_user_company_id(auth.uid())
  );

-- 5. Company admins can manage company users (uses security definer function)
CREATE POLICY "company_admin_manage"
  ON users
  FOR ALL
  TO authenticated
  USING (
    is_user_company_admin(auth.uid())
    AND company_id IS NOT NULL 
    AND company_id = get_user_company_id(auth.uid())
  )
  WITH CHECK (
    is_user_company_admin(auth.uid())
    AND company_id IS NOT NULL 
    AND company_id = get_user_company_id(auth.uid())
  );

-- Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Verify policies were created successfully
SELECT 
  policyname,
  cmd,
  roles,
  permissive
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public'
ORDER BY policyname;