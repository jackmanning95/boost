/*
  # Campaign Workflow Dashboard Schema

  1. New Tables
    - `companies` - Company management for team access
    - `campaign_comments` - Threaded comments system
    - `campaign_workflow_history` - Status change tracking

  2. Schema Updates
    - Update `users` table to link to companies
    - Add workflow status tracking
    - Enable threaded comments

  3. Security
    - Update RLS policies for team access
    - Secure comment access by company
    - Admin-only status updates
*/

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add company_id to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE users ADD COLUMN company_id uuid REFERENCES companies(id);
  END IF;
END $$;

-- Create campaign_comments table
CREATE TABLE IF NOT EXISTS campaign_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id text NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_comment_id uuid REFERENCES campaign_comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create campaign_workflow_history table
CREATE TABLE IF NOT EXISTS campaign_workflow_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id text NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_workflow_history ENABLE ROW LEVEL SECURITY;

-- Companies policies
CREATE POLICY "Users can read their own company"
  ON companies
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Only admins can manage companies"
  ON companies
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Update users policies for team access
DROP POLICY IF EXISTS "Enable read access for users to their own profile" ON users;
CREATE POLICY "Users can read profiles in their company"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR 
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Campaign comments policies
CREATE POLICY "Users can read comments for their company campaigns"
  ON campaign_comments
  FOR SELECT
  TO authenticated
  USING (
    campaign_id IN (
      SELECT c.id FROM campaigns c
      JOIN users u ON c.client_id = u.id
      JOIN users current_user ON current_user.id = auth.uid()
      WHERE u.company_id = current_user.company_id
        OR current_user.role = 'admin'
    )
  );

CREATE POLICY "Users can create comments on their company campaigns"
  ON campaign_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    campaign_id IN (
      SELECT c.id FROM campaigns c
      JOIN users u ON c.client_id = u.id
      JOIN users current_user ON current_user.id = auth.uid()
      WHERE u.company_id = current_user.company_id
        OR current_user.role = 'admin'
    )
  );

CREATE POLICY "Users can update their own comments"
  ON campaign_comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Workflow history policies
CREATE POLICY "Users can read workflow history for their company campaigns"
  ON campaign_workflow_history
  FOR SELECT
  TO authenticated
  USING (
    campaign_id IN (
      SELECT c.id FROM campaigns c
      JOIN users u ON c.client_id = u.id
      JOIN users current_user ON current_user.id = auth.uid()
      WHERE u.company_id = current_user.company_id
        OR current_user.role = 'admin'
    )
  );

CREATE POLICY "Only admins can create workflow history"
  ON campaign_workflow_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Update campaigns policies for team access
DROP POLICY IF EXISTS "Enable read access for all users" ON campaigns;
CREATE POLICY "Users can read campaigns for their company"
  ON campaigns
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT u.id FROM users u
      JOIN users current_user ON current_user.id = auth.uid()
      WHERE u.company_id = current_user.company_id
    ) OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_comments_updated_at
  BEFORE UPDATE ON campaign_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaign_comments_campaign_id ON campaign_comments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_comments_parent_id ON campaign_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_workflow_history_campaign_id ON campaign_workflow_history(campaign_id);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);

-- Insert default company for existing users
INSERT INTO companies (name) VALUES ('Default Company') ON CONFLICT (name) DO NOTHING;

-- Update existing users to have a company
UPDATE users 
SET company_id = (SELECT id FROM companies WHERE name = 'Default Company')
WHERE company_id IS NULL;