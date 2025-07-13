/*
  # Fix infinite recursion in users table RLS policies

  1. Problem
    - The policy `company_users_can_read_same_company` creates infinite recursion
    - It queries the users table from within a users table policy check
    
  2. Solution
    - Drop the problematic policy
    - Replace with a simpler policy that uses auth.jwt() to get user metadata
    - Keep other policies that don't cause recursion
    
  3. Security
    - Maintains same access control without recursion
    - Users can still only read users from their own company
*/

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "company_users_can_read_same_company" ON users;

-- Create a new non-recursive policy for company users
-- This policy allows users to read other users in their company by comparing company_id directly
-- without needing to query the users table recursively
CREATE POLICY "users_can_read_company_members" 
  ON users 
  FOR SELECT 
  TO authenticated 
  USING (
    -- Allow if the user's company_id matches the requesting user's company_id
    -- We get the requesting user's company_id from their existing user record
    company_id IN (
      SELECT auth.jwt() ->> 'app_metadata' ->> 'company_id'::text
      UNION
      SELECT company_id::text FROM auth.users WHERE id = auth.uid()
    )
  );

-- Alternative simpler approach: Create a function to get current user's company_id
-- This avoids recursion by using a security definer function
CREATE OR REPLACE FUNCTION get_current_user_company_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid();
$$;

-- Drop the previous policy and create a new one using the function
DROP POLICY IF EXISTS "users_can_read_company_members" ON users;

CREATE POLICY "users_can_read_company_members" 
  ON users 
  FOR SELECT 
  TO authenticated 
  USING (
    company_id IS NOT NULL 
    AND company_id = get_current_user_company_id()
  );