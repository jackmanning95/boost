/*
  # Fix infinite recursion in users table RLS policies

  1. Problem
    - The existing policy "company_users_can_read_same_company" creates infinite recursion
    - When checking if a user can read from users table, it queries users table again
    - This causes "infinite recursion detected in policy for relation users" error

  2. Solution
    - Drop the problematic recursive policy
    - Create a security definer function to safely get current user's company_id
    - Create new non-recursive policy using this function
    - Maintain existing security model without recursion
*/

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "company_users_can_read_same_company" ON users;

-- Create a security definer function to get current user's company_id
-- This function bypasses RLS when fetching the current user's company_id
-- preventing the infinite recursion issue
CREATE OR REPLACE FUNCTION get_current_user_company_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid();
$$;

-- Create a new non-recursive policy for company users
-- This allows users to read other users in their company without causing recursion
CREATE POLICY "users_can_read_company_members" 
  ON users 
  FOR SELECT 
  TO authenticated 
  USING (
    -- Allow users to read other users in the same company
    company_id IS NOT NULL 
    AND company_id = get_current_user_company_id()
  );