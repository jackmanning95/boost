/*
  # Fix Company Account IDs RLS Policies

  1. Changes
     - Simplifies RLS policies for company_account_ids table
     - Ensures all users can read their company's account IDs
     - Adds explicit policy for authenticated users to view their company's accounts
     - Removes complex conditions that were causing permission issues

  2. Security
     - Maintains proper security boundaries between companies
     - Allows company admins to manage account IDs
     - Ensures users can only see account IDs for their own company
*/

-- First, drop existing policies that might be causing issues
DROP POLICY IF EXISTS "company_admins_can_manage" ON public.company_account_ids;
DROP POLICY IF EXISTS "service_role_full_access" ON public.company_account_ids;
DROP POLICY IF EXISTS "super_admins_full_access" ON public.company_account_ids;
DROP POLICY IF EXISTS "users_can_read_company_accounts" ON public.company_account_ids;

-- Create simplified policies with clear permissions

-- Allow all authenticated users to read account IDs for their company
CREATE POLICY "users_can_read_company_accounts" 
ON public.company_account_ids
FOR SELECT 
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM public.users
    WHERE id = auth.uid()
  )
);

-- Allow company admins to manage account IDs for their company
CREATE POLICY "company_admins_can_manage" 
ON public.company_account_ids
FOR ALL 
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Allow super admins full access
CREATE POLICY "super_admins_full_access" 
ON public.company_account_ids
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- Create a helper function to check if a user belongs to a company
CREATE OR REPLACE FUNCTION public.user_belongs_to_company(company_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND users.company_id = company_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a helper function to check if a user is a company admin
CREATE OR REPLACE FUNCTION public.is_company_admin(company_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND users.company_id = company_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;