/*
  # Debug and Fix Company Account IDs RLS

  This migration adds debugging information and ensures proper RLS policies
  for the company_account_ids table to resolve loading issues.

  1. Check current RLS policies
  2. Add comprehensive RLS policies for company_account_ids
  3. Ensure users can read their company's account IDs
  4. Add debugging function to test permissions
*/

-- First, let's check if RLS is enabled on company_account_ids
DO $$
BEGIN
  RAISE NOTICE 'Checking RLS status for company_account_ids table...';
  
  -- Check if table exists and RLS status
  IF EXISTS (
    SELECT 1 FROM pg_class c 
    JOIN pg_namespace n ON n.oid = c.relnamespace 
    WHERE c.relname = 'company_account_ids' AND n.nspname = 'public'
  ) THEN
    RAISE NOTICE 'company_account_ids table exists';
    
    -- Check RLS status
    IF EXISTS (
      SELECT 1 FROM pg_class c 
      JOIN pg_namespace n ON n.oid = c.relnamespace 
      WHERE c.relname = 'company_account_ids' 
      AND n.nspname = 'public' 
      AND c.relrowsecurity = true
    ) THEN
      RAISE NOTICE 'RLS is ENABLED on company_account_ids';
    ELSE
      RAISE NOTICE 'RLS is DISABLED on company_account_ids';
    END IF;
  ELSE
    RAISE NOTICE 'company_account_ids table does NOT exist';
  END IF;
END $$;

-- Enable RLS on company_account_ids if not already enabled
ALTER TABLE company_account_ids ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "company_account_ids_select_policy" ON company_account_ids;
DROP POLICY IF EXISTS "company_account_ids_insert_policy" ON company_account_ids;
DROP POLICY IF EXISTS "company_account_ids_update_policy" ON company_account_ids;
DROP POLICY IF EXISTS "company_account_ids_delete_policy" ON company_account_ids;

-- Create comprehensive RLS policies for company_account_ids

-- SELECT policy: Users can read account IDs for their company OR super admins can read all
CREATE POLICY "company_account_ids_select_policy" ON company_account_ids
  FOR SELECT
  TO authenticated
  USING (
    -- Super admins (boost team) can read all account IDs
    (EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email LIKE '%@boostdata.io'
    ))
    OR
    -- Users can read account IDs for their company
    (EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.company_id = company_account_ids.company_id
    ))
  );

-- INSERT policy: Users can create account IDs for their company OR super admins can create for any company
CREATE POLICY "company_account_ids_insert_policy" ON company_account_ids
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Super admins can create account IDs for any company
    (EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email LIKE '%@boostdata.io'
    ))
    OR
    -- Company admins can create account IDs for their company
    (EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.company_id = company_account_ids.company_id 
      AND users.role = 'admin'
    ))
  );

-- UPDATE policy: Users can update account IDs for their company OR super admins can update any
CREATE POLICY "company_account_ids_update_policy" ON company_account_ids
  FOR UPDATE
  TO authenticated
  USING (
    -- Super admins can update any account ID
    (EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email LIKE '%@boostdata.io'
    ))
    OR
    -- Company admins can update account IDs for their company
    (EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.company_id = company_account_ids.company_id 
      AND users.role = 'admin'
    ))
  )
  WITH CHECK (
    -- Same conditions for the updated row
    (EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email LIKE '%@boostdata.io'
    ))
    OR
    (EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.company_id = company_account_ids.company_id 
      AND users.role = 'admin'
    ))
  );

-- DELETE policy: Users can delete account IDs for their company OR super admins can delete any
CREATE POLICY "company_account_ids_delete_policy" ON company_account_ids
  FOR DELETE
  TO authenticated
  USING (
    -- Super admins can delete any account ID
    (EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email LIKE '%@boostdata.io'
    ))
    OR
    -- Company admins can delete account IDs for their company
    (EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.company_id = company_account_ids.company_id 
      AND users.role = 'admin'
    ))
  );

-- Create a debugging function to test permissions
CREATE OR REPLACE FUNCTION debug_company_account_permissions(test_company_id UUID DEFAULT NULL)
RETURNS TABLE (
  test_name TEXT,
  result BOOLEAN,
  details TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
  current_user_email TEXT;
  current_user_company_id UUID;
  current_user_role TEXT;
  target_company_id UUID;
BEGIN
  -- Get current user info
  current_user_id := auth.uid();
  
  SELECT email INTO current_user_email 
  FROM auth.users 
  WHERE id = current_user_id;
  
  SELECT company_id, role INTO current_user_company_id, current_user_role
  FROM users 
  WHERE id = current_user_id;
  
  -- Use provided company ID or user's company ID
  target_company_id := COALESCE(test_company_id, current_user_company_id);
  
  -- Test 1: Basic user info
  RETURN QUERY SELECT 
    'User Info'::TEXT,
    (current_user_id IS NOT NULL)::BOOLEAN,
    format('User ID: %s, Email: %s, Company: %s, Role: %s', 
           current_user_id, current_user_email, current_user_company_id, current_user_role)::TEXT;
  
  -- Test 2: Can read company_account_ids table
  BEGIN
    PERFORM 1 FROM company_account_ids LIMIT 1;
    RETURN QUERY SELECT 
      'Table Access'::TEXT,
      TRUE::BOOLEAN,
      'Can access company_account_ids table'::TEXT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      'Table Access'::TEXT,
      FALSE::BOOLEAN,
      format('Cannot access table: %s', SQLERRM)::TEXT;
  END;
  
  -- Test 3: Can read account IDs for target company
  BEGIN
    PERFORM 1 FROM company_account_ids 
    WHERE company_id = target_company_id 
    LIMIT 1;
    RETURN QUERY SELECT 
      'Company Filter'::TEXT,
      TRUE::BOOLEAN,
      format('Can read account IDs for company %s', target_company_id)::TEXT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      'Company Filter'::TEXT,
      FALSE::BOOLEAN,
      format('Cannot read account IDs for company %s: %s', target_company_id, SQLERRM)::TEXT;
  END;
  
  -- Test 4: Count total accessible records
  DECLARE
    accessible_count INTEGER;
  BEGIN
    SELECT COUNT(*) INTO accessible_count 
    FROM company_account_ids;
    RETURN QUERY SELECT 
      'Total Access'::TEXT,
      TRUE::BOOLEAN,
      format('Can access %s total account ID records', accessible_count)::TEXT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      'Total Access'::TEXT,
      FALSE::BOOLEAN,
      format('Cannot count records: %s', SQLERRM)::TEXT;
  END;
  
  -- Test 5: Check if user is super admin
  RETURN QUERY SELECT 
    'Super Admin Check'::TEXT,
    (current_user_email LIKE '%@boostdata.io')::BOOLEAN,
    format('Email %s %s super admin pattern', 
           current_user_email, 
           CASE WHEN current_user_email LIKE '%@boostdata.io' THEN 'matches' ELSE 'does not match' END)::TEXT;
END;
$$;

-- Grant execute permission on the debug function
GRANT EXECUTE ON FUNCTION debug_company_account_permissions TO authenticated;

-- Add some helpful comments
COMMENT ON POLICY "company_account_ids_select_policy" ON company_account_ids IS 
'Allows users to read account IDs for their company, super admins can read all';

COMMENT ON POLICY "company_account_ids_insert_policy" ON company_account_ids IS 
'Allows company admins to create account IDs for their company, super admins can create for any company';

COMMENT ON FUNCTION debug_company_account_permissions IS 
'Debug function to test company account ID permissions for the current user';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Company Account IDs RLS policies have been updated successfully';
  RAISE NOTICE 'Use SELECT * FROM debug_company_account_permissions() to test permissions';
END $$;