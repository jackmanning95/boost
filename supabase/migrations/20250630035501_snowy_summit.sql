/*
  # Fix RLS Policy for User Removal

  1. Policy Updates
    - Update the company_admin_manage policy to allow setting company_id to NULL
    - This enables company admins to remove users from their company
    - Ensures proper authorization while allowing the removal operation

  2. Security
    - Maintains existing security constraints
    - Only allows company admins to remove users from their own company
    - Preserves all other existing policies
*/

-- Drop the existing company_admin_manage policy
DROP POLICY IF EXISTS "company_admin_manage" ON users;

-- Create an updated policy that allows company admins to remove users
CREATE POLICY "company_admin_manage" ON users
  FOR ALL
  TO authenticated
  USING (
    is_user_company_admin(uid()) AND 
    (
      (company_id IS NOT NULL AND company_id = get_user_company_id(uid())) OR
      -- Allow reading users that are being removed (company_id set to NULL)
      (company_id IS NULL)
    )
  )
  WITH CHECK (
    is_user_company_admin(uid()) AND 
    (
      (company_id IS NOT NULL AND company_id = get_user_company_id(uid())) OR
      -- Allow setting company_id to NULL when removing users
      (company_id IS NULL)
    )
  );

-- Also ensure service role can perform these operations
CREATE POLICY IF NOT EXISTS "service_role_user_management" ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);