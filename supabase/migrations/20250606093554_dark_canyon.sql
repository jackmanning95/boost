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
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update companies"
  ON companies
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
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
ALTER TABLE campaign_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_workflow_history ENABLE ROW LEVEL SECURITY;

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
      JOIN users user_self ON user_self.id = auth.uid()
      WHERE u.company_id = user_self.company_id
        OR user_self.role = 'admin'
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
      JOIN users user_self ON user_self.id = auth.uid()
      WHERE u.company_id = user_self.company_id
        OR user_self.role = 'admin'
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
      JOIN users user_self ON user_self.id = auth.uid()
      WHERE u.company_id = user_self.company_id
        OR user_self.role = 'admin'
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
      JOIN users user_self ON user_self.id = auth.uid()
      WHERE u.company_id = user_self.company_id
    ) OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add triggers for updated_at
CREATE TRIGGER update_campaign_comments_updated_at
  BEFORE UPDATE ON campaign_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaign_comments_campaign_id ON campaign_comments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_comments_parent_id ON campaign_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_workflow_history_campaign_id ON campaign_workflow_history(campaign_id);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);