/*
  # Fix Company Account IDs RLS Policies

  1. Changes
     - Simplify RLS policies for company_account_ids table
     - Add clear policies for authenticated users to view their company's account IDs
     - Fix potential recursion issues in RLS policies
     - Ensure service_role has full access

  2. Security
     - Enable RLS on company_account_ids table
     - Users can only view account IDs for their own company
     - Company admins can manage account IDs for their company
*/

-- First, drop existing policies to start fresh
DROP POLICY IF EXISTS "company_admins_can_manage" ON "public"."company_account_ids";
DROP POLICY IF EXISTS "super_admins_full_access" ON "public"."company_account_ids";
DROP POLICY IF EXISTS "users_can_read_company_accounts" ON "public"."company_account_ids";

-- Create simpler, more effective policies

-- Allow all authenticated users to read account IDs for their company
CREATE POLICY "users_can_read_company_accounts" 
ON "public"."company_account_ids"
FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM users
    WHERE id = auth.uid()
  )
);

-- Allow company admins to manage account IDs for their company
CREATE POLICY "company_admins_can_manage" 
ON "public"."company_account_ids"
FOR ALL
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM users
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  company_id IN (
    SELECT company_id FROM users
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Allow super admins full access to all account IDs
CREATE POLICY "super_admins_full_access" 
ON "public"."company_account_ids"
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- Service role full access policy
CREATE POLICY "service_role_full_access" 
ON "public"."company_account_ids"
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);