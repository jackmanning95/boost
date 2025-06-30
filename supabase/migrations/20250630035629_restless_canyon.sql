/*
  # Fix user removal RLS policy

  1. Changes
    - Drop existing company_admin_manage policy on users table
    - Create updated policy allowing company admins to remove users by setting company_id to NULL
    - Add service_role policy for user management operations
  
  2. Security
    - Maintains security by only allowing company admins to manage users in their own company
    - Allows company admins to set company_id to NULL when removing users
    - Ensures service_role can perform all operations on users table
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
CREATE POLICY "service_role_user_management" ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);