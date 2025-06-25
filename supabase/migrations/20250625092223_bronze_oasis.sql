/*
  # Fix Company Account IDs RLS Policies

  1. Security
    - Enable RLS on company_account_ids table
    - Add policies for users to read their company's accounts
    - Add policies for company admins to manage their company's accounts
    - Add policies for super admins to manage all accounts

  2. Performance
    - Add indexes for better query performance
    - Optimize for common access patterns

  3. Changes
    - Use safe alias 'u' instead of reserved keyword 'current_user'
    - Ensure all policies work correctly with authentication
*/

-- Enable RLS on company_account_ids table
ALTER TABLE company_account_ids ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read their company accounts" ON company_account_ids;
DROP POLICY IF EXISTS "Company admins can manage their company accounts" ON company_account_ids;
DROP POLICY IF EXISTS "Super admins can manage all accounts" ON company_account_ids;
DROP POLICY IF EXISTS "company_account_ids_select_policy" ON company_account_ids;
DROP POLICY IF EXISTS "company_account_ids_insert_policy" ON company_account_ids;
DROP POLICY IF EXISTS "company_account_ids_update_policy" ON company_account_ids;
DROP POLICY IF EXISTS "company_account_ids_delete_policy" ON company_account_ids;
DROP POLICY IF EXISTS "Company admins can insert their company accounts" ON company_account_ids;
DROP POLICY IF EXISTS "Company admins can update their company accounts" ON company_account_ids;
DROP POLICY IF EXISTS "Company admins can delete their company accounts" ON company_account_ids;

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