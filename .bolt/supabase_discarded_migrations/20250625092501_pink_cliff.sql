/*
  # Fix PostgreSQL Reserved Keyword Error

  This migration fixes the SQL syntax error caused by using 'current_user' as a table alias,
  which is a reserved keyword in PostgreSQL. We're replacing it with a safe alias 'u'.

  ## Changes
  1. Enable RLS on company_account_ids table
  2. Create policies using safe alias 'u' instead of reserved keywords
  3. Add performance indexes
  4. Add helpful comments

  ## Security
  - Users can read accounts for their own company
  - Company admins can manage accounts for their company
  - Super admins can manage accounts for any company
*/

-- Enable RLS on company_account_ids table
ALTER TABLE company_account_ids ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can read their company accounts" ON company_account_ids;
DROP POLICY IF EXISTS "Company admins can insert their company accounts" ON company_account_ids;
DROP POLICY IF EXISTS "Company admins can update their company accounts" ON company_account_ids;
DROP POLICY IF EXISTS "Company admins can delete their company accounts" ON company_account_ids;
DROP POLICY IF EXISTS "company_account_ids_select_policy" ON company_account_ids;
DROP POLICY IF EXISTS "company_account_ids_insert_policy" ON company_account_ids;
DROP POLICY IF EXISTS "company_account_ids_update_policy" ON company_account_ids;
DROP POLICY IF EXISTS "company_account_ids_delete_policy" ON company_account_ids;

-- Policy 1: Users can read accounts for their own company
CREATE POLICY "Users can read their company accounts"
  ON company_account_ids
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM users u 
      WHERE u.id = auth.uid() 
        AND u.company_id = company_account_ids.company_id
    )
  );

-- Policy 2: Company admins can insert accounts for their company
CREATE POLICY "Company admins can insert their company accounts"
  ON company_account_ids
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM users u 
      WHERE u.id = auth.uid() 
        AND u.company_id = company_account_ids.company_id
        AND u.role = 'admin'
    )
    OR
    -- Super admins can insert for any company
    EXISTS (
      SELECT 1 
      FROM users u 
      WHERE u.id = auth.uid() 
        AND (u.role = 'super_admin' OR u.email LIKE '%@boostdata.io')
    )
  );

-- Policy 3: Company admins can update accounts for their company
CREATE POLICY "Company admins can update their company accounts"
  ON company_account_ids
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM users u 
      WHERE u.id = auth.uid() 
        AND u.company_id = company_account_ids.company_id
        AND u.role = 'admin'
    )
    OR
    -- Super admins can update any company's accounts
    EXISTS (
      SELECT 1 
      FROM users u 
      WHERE u.id = auth.uid() 
        AND (u.role = 'super_admin' OR u.email LIKE '%@boostdata.io')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM users u 
      WHERE u.id = auth.uid() 
        AND u.company_id = company_account_ids.company_id
        AND u.role = 'admin'
    )
    OR
    -- Super admins can update any company's accounts
    EXISTS (
      SELECT 1 
      FROM users u 
      WHERE u.id = auth.uid() 
        AND (u.role = 'super_admin' OR u.email LIKE '%@boostdata.io')
    )
  );

-- Policy 4: Company admins can delete accounts for their company
CREATE POLICY "Company admins can delete their company accounts"
  ON company_account_ids
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM users u 
      WHERE u.id = auth.uid() 
        AND u.company_id = company_account_ids.company_id
        AND u.role = 'admin'
    )
    OR
    -- Super admins can delete any company's accounts
    EXISTS (
      SELECT 1 
      FROM users u 
      WHERE u.id = auth.uid() 
        AND (u.role = 'super_admin' OR u.email LIKE '%@boostdata.io')
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_company_account_ids_company_id_active 
  ON company_account_ids (company_id, is_active) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_company_account_ids_platform_company 
  ON company_account_ids (platform, company_id);

-- Add helpful comments
COMMENT ON TABLE company_account_ids IS 'Stores platform account IDs for companies. Each company can have multiple account IDs across different platforms.';
COMMENT ON COLUMN company_account_ids.company_id IS 'References the company that owns this account ID';
COMMENT ON COLUMN company_account_ids.platform IS 'The platform name (e.g., Meta, DV360, etc.)';
COMMENT ON COLUMN company_account_ids.account_id IS 'The actual account ID on the platform';
COMMENT ON COLUMN company_account_ids.account_name IS 'Human-readable name for the advertiser/account';
COMMENT ON COLUMN company_account_ids.is_active IS 'Whether this account ID is currently active and should be shown in dropdowns';