/*
  # Company Account IDs Management

  1. New Tables
    - `company_account_ids`
      - `id` (uuid, primary key)
      - `company_id` (uuid, foreign key to companies)
      - `platform` (text)
      - `account_id` (text)
      - `account_name` (text, optional)
      - `is_active` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `company_account_ids` table
    - Add policies for company admins and super admins to manage account IDs
    - Add indexes for performance

  3. Changes
    - Support multiple account IDs per company
    - Allow company admins to manage their own company's account IDs
    - Super admins can manage all account IDs
*/

-- Create company_account_ids table
CREATE TABLE IF NOT EXISTS company_account_ids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  platform text NOT NULL,
  account_id text NOT NULL,
  account_name text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE company_account_ids ENABLE ROW LEVEL SECURITY;

-- Create policies for company_account_ids
CREATE POLICY "company_account_ids_select_policy"
  ON company_account_ids
  FOR SELECT
  TO authenticated
  USING (
    -- Super admins can see all account IDs
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
    OR
    -- Company admins can see their company's account IDs
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid() AND role = 'admin' AND company_id IS NOT NULL
    )
    OR
    -- Users can see their company's account IDs
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid() AND company_id IS NOT NULL
    )
  );

CREATE POLICY "company_account_ids_insert_policy"
  ON company_account_ids
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Super admins can create account IDs for any company
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
    OR
    -- Company admins can create account IDs for their company
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid() AND role = 'admin' AND company_id IS NOT NULL
    )
  );

CREATE POLICY "company_account_ids_update_policy"
  ON company_account_ids
  FOR UPDATE
  TO authenticated
  USING (
    -- Super admins can update any account ID
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
    OR
    -- Company admins can update their company's account IDs
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid() AND role = 'admin' AND company_id IS NOT NULL
    )
  )
  WITH CHECK (
    -- Super admins can update any account ID
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
    OR
    -- Company admins can update their company's account IDs
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid() AND role = 'admin' AND company_id IS NOT NULL
    )
  );

CREATE POLICY "company_account_ids_delete_policy"
  ON company_account_ids
  FOR DELETE
  TO authenticated
  USING (
    -- Super admins can delete any account ID
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
    OR
    -- Company admins can delete their company's account IDs
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid() AND role = 'admin' AND company_id IS NOT NULL
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_company_account_ids_company_id ON company_account_ids(company_id);
CREATE INDEX IF NOT EXISTS idx_company_account_ids_platform ON company_account_ids(platform);
CREATE INDEX IF NOT EXISTS idx_company_account_ids_active ON company_account_ids(is_active) WHERE is_active = true;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_company_account_ids_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_company_account_ids_updated_at
  BEFORE UPDATE ON company_account_ids
  FOR EACH ROW EXECUTE FUNCTION update_company_account_ids_updated_at();

-- Add unique constraint to prevent duplicate platform/account_id combinations per company
ALTER TABLE company_account_ids 
ADD CONSTRAINT unique_company_platform_account 
UNIQUE (company_id, platform, account_id);