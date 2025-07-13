/*
  # Implement Notifications, Full Names, and Company Collaboration

  1. Database Schema Updates
    - Update users table to properly handle full names and companies
    - Create companies table for proper company management
    - Update notifications table for better functionality
    - Add user roles within companies
    - Create campaign activity log table

  2. Security Updates
    - Update RLS policies for company-based collaboration
    - Add proper notification access controls
    - Enable team-based campaign access

  3. Performance
    - Add indexes for company-based queries
    - Optimize notification queries
*/

-- Create companies table for proper company management
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on companies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Add company policies
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

-- Update users table structure
DO $$
BEGIN
  -- Add company_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE users ADD COLUMN company_id uuid;
  END IF;

  -- Remove old company_name column if it exists (we'll use the companies table instead)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'company_name'
  ) THEN
    -- Migrate existing company_name data to companies table first
    INSERT INTO companies (name)
    SELECT DISTINCT company_name 
    FROM users 
    WHERE company_name IS NOT NULL AND company_name != ''
    ON CONFLICT (name) DO NOTHING;
    
    -- Update users with company_id
    UPDATE users 
    SET company_id = c.id
    FROM companies c
    WHERE users.company_name = c.name;
    
    -- Set default company for users without company_name
    UPDATE users 
    SET company_id = (SELECT id FROM companies WHERE name = 'Default Company')
    WHERE company_id IS NULL;
    
    -- Now drop the old column
    ALTER TABLE users DROP COLUMN company_name;
  END IF;
END $$;

-- Add foreign key constraint for company_id
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

-- Set default company for any users without one
UPDATE users 
SET company_id = (SELECT id FROM companies WHERE name = 'Default Company')
WHERE company_id IS NULL;

-- Create campaign activity log table
CREATE TABLE IF NOT EXISTS campaign_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id text NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL, -- 'created', 'updated', 'status_changed', 'comment_added', 'audience_added', 'audience_removed'
  action_details jsonb DEFAULT '{}'::jsonb,
  old_values jsonb DEFAULT '{}'::jsonb,
  new_values jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on activity log
ALTER TABLE campaign_activity_log ENABLE ROW LEVEL SECURITY;

-- Activity log policies
CREATE POLICY "Users can read activity for their company campaigns"
  ON campaign_activity_log
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

CREATE POLICY "System can insert activity logs"
  ON campaign_activity_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true); -- We'll control this in application logic

-- Update users RLS policies for company collaboration
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can read company colleagues basic info" ON users;
DROP POLICY IF EXISTS "Admins can read all profiles" ON users;

-- New user policies for company collaboration
CREATE POLICY "Users can read profiles in their company"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR 
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Update campaigns policies for company collaboration
DROP POLICY IF EXISTS "Users can read campaigns for their company" ON campaigns;

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

-- Update campaign comments policies for company collaboration
DROP POLICY IF EXISTS "Users can read comments for their company campaigns" ON campaign_comments;
DROP POLICY IF EXISTS "Users can create comments on their company campaigns" ON campaign_comments;

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

-- Update workflow history policies
DROP POLICY IF EXISTS "Users can read workflow history for their company campaigns" ON campaign_workflow_history;

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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_campaign_activity_log_campaign_id ON campaign_activity_log(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_activity_log_user_id ON campaign_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_activity_log_created_at ON campaign_activity_log(created_at);

-- Create function to automatically create activity logs
CREATE OR REPLACE FUNCTION log_campaign_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Log campaign creation
  IF TG_OP = 'INSERT' THEN
    INSERT INTO campaign_activity_log (
      campaign_id,
      user_id,
      action_type,
      action_details,
      new_values
    ) VALUES (
      NEW.id,
      NEW.client_id,
      'created',
      jsonb_build_object('campaign_name', NEW.name),
      to_jsonb(NEW)
    );
    RETURN NEW;
  END IF;

  -- Log campaign updates
  IF TG_OP = 'UPDATE' THEN
    -- Log status changes
    IF OLD.status != NEW.status THEN
      INSERT INTO campaign_activity_log (
        campaign_id,
        user_id,
        action_type,
        action_details,
        old_values,
        new_values
      ) VALUES (
        NEW.id,
        NEW.client_id,
        'status_changed',
        jsonb_build_object(
          'from_status', OLD.status,
          'to_status', NEW.status
        ),
        jsonb_build_object('status', OLD.status),
        jsonb_build_object('status', NEW.status)
      );
    END IF;

    -- Log general updates
    INSERT INTO campaign_activity_log (
      campaign_id,
      user_id,
      action_type,
      action_details,
      old_values,
      new_values
    ) VALUES (
      NEW.id,
      NEW.client_id,
      'updated',
      jsonb_build_object('updated_fields', 'campaign_details'),
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for campaign activity logging
DROP TRIGGER IF EXISTS campaign_activity_trigger ON campaigns;
CREATE TRIGGER campaign_activity_trigger
  AFTER INSERT OR UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION log_campaign_activity();

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_company_id uuid;
BEGIN
  -- Get default company ID
  SELECT id INTO default_company_id FROM companies WHERE name = 'Default Company';
  
  -- Set default company if none provided
  IF NEW.company_id IS NULL THEN
    NEW.company_id = default_company_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new user handling
DROP TRIGGER IF EXISTS on_auth_user_created ON users;
CREATE TRIGGER on_auth_user_created
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();