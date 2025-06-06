/*
  # Add companies table and establish relationship with users

  1. New Tables
    - `companies`
      - `id` (uuid, primary key)
      - `name` (text, unique, not null)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Changes to existing tables
    - Add `company_id` column to `users` table
    - Remove `company_name` column from `users` table (replaced by foreign key relationship)
    - Add foreign key constraint linking users.company_id to companies.id

  3. Security
    - Enable RLS on `companies` table
    - Add policies for authenticated users to read companies
    - Add policies for admins to manage companies

  4. Data Migration
    - Create companies from existing company_name values
    - Update users to reference the new company records
*/

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on companies table
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for companies
CREATE POLICY "Authenticated users can read companies"
  ON companies
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert companies"
  ON companies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update companies"
  ON companies
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = uid() AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = uid() AND users.role = 'admin'
    )
  );

-- Add updated_at trigger for companies
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create a default company
INSERT INTO companies (name) VALUES ('Default Company') ON CONFLICT (name) DO NOTHING;

-- Add company_id column to users table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE users ADD COLUMN company_id uuid;
  END IF;
END $$;

-- Migrate existing company_name data to companies table and update users
DO $$
DECLARE
  user_record RECORD;
  company_id_var uuid;
  default_company_id uuid;
BEGIN
  -- Get the default company ID
  SELECT id INTO default_company_id FROM companies WHERE name = 'Default Company';
  
  -- Process each user with a company_name
  FOR user_record IN 
    SELECT id, company_name FROM users WHERE company_name IS NOT NULL AND company_name != ''
  LOOP
    -- Insert company if it doesn't exist and get its ID
    INSERT INTO companies (name) 
    VALUES (user_record.company_name) 
    ON CONFLICT (name) DO NOTHING;
    
    SELECT id INTO company_id_var FROM companies WHERE name = user_record.company_name;
    
    -- Update user with company_id
    UPDATE users SET company_id = company_id_var WHERE id = user_record.id;
  END LOOP;
  
  -- Set default company for users without company_name
  UPDATE users 
  SET company_id = default_company_id 
  WHERE company_id IS NULL;
END $$;

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_company_id_fkey'
  ) THEN
    ALTER TABLE users
    ADD CONSTRAINT users_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Remove company_name column if it exists (after migration)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'company_name'
  ) THEN
    ALTER TABLE users DROP COLUMN company_name;
  END IF;
END $$;