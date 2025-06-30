/*
  # Fix RLS policies for user management
  
  1. Changes
    - Update company_admin_manage policy to allow removing users (setting company_id to NULL)
    - Add service_role_user_management policy for full access
  
  2. Security
    - Ensures company admins can remove users from their company
    - Grants service_role full access to users table
*/

-- Drop the existing company_admin_manage policy
DROP POLICY IF EXISTS "company_admin_manage" ON users;

-- Create an updated policy that allows company admins to remove users
CREATE POLICY "company_admin_manage" ON users
  FOR ALL
  TO authenticated
  USING (
    is_user_company_admin(auth.uid()) AND 
    (
      (company_id IS NOT NULL AND company_id = get_user_company_id(auth.uid())) OR
      -- Allow reading users that are being removed (company_id set to NULL)
      (company_id IS NULL)
    )
  )
  WITH CHECK (
    is_user_company_admin(auth.uid()) AND 
    (
      (company_id IS NOT NULL AND company_id = get_user_company_id(auth.uid())) OR
      -- Allow setting company_id to NULL when removing users
      (company_id IS NULL)
    )
  );

-- Also ensure service role can perform these operations
CREATE POLICY "service_role_user_management" ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);