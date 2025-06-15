/*
  # Enhanced Company-based User Roles & Access Management

  1. Schema Updates
    - Update companies table with account_id field
    - Update users table structure
    - Add proper foreign key relationships
    
  2. Security
    - Enable RLS on all tables
    - Add policies for company-based access control
    - Add policies for Boost super admin access
    
  3. Functions
    - Add function to automatically assign first user as company admin
    - Add function to handle user invitations
*/

-- Update companies table to include account_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'account_id'
  ) THEN
    ALTER TABLE companies ADD COLUMN account_id text;
  END IF;
END $$;

-- Update users table structure and constraints
DO $$
BEGIN
  -- Update role constraint to include new roles
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'users' AND constraint_name = 'valid_role'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT valid_role;
  END IF;
  
  ALTER TABLE users ADD CONSTRAINT valid_role 
    CHECK (role = ANY (ARRAY['admin'::text, 'user'::text, 'super_admin'::text]));
  
  -- Ensure company_id foreign key exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'users' AND constraint_name = 'users_company_id_fkey'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_company_id_fkey 
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_email text)
RETURNS boolean AS $$
BEGIN
  RETURN user_email LIKE '%@boostdata.io';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user is company admin
CREATE OR REPLACE FUNCTION is_company_admin(user_id uuid, target_company_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = user_id 
    AND company_id = target_company_id 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle new user registration and auto-assign company admin
CREATE OR REPLACE FUNCTION handle_new_user_with_company()
RETURNS trigger AS $$
DECLARE
  user_count integer;
  target_company_id uuid;
BEGIN
  -- Get the company_id from the new user
  target_company_id := NEW.company_id;
  
  -- If no company_id is set, skip company admin logic
  IF target_company_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Count existing users in the company
  SELECT COUNT(*) INTO user_count
  FROM users 
  WHERE company_id = target_company_id;
  
  -- If this is the first user in the company, make them admin
  IF user_count = 0 THEN
    NEW.role := 'admin';
  ELSE
    -- Default role for subsequent users
    NEW.role := COALESCE(NEW.role, 'user');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the existing trigger or create new one
DROP TRIGGER IF EXISTS on_auth_user_created ON users;
CREATE TRIGGER on_auth_user_created
  BEFORE INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_with_company();

-- Enhanced RLS Policies for Companies table
DROP POLICY IF EXISTS "Users can read own company" ON companies;
DROP POLICY IF EXISTS "Admins can insert companies" ON companies;
DROP POLICY IF EXISTS "Admins can update companies" ON companies;

-- Companies SELECT policy
CREATE POLICY "Company access control"
  ON companies
  FOR SELECT
  TO authenticated
  USING (
    -- Super admins can see all companies
    is_super_admin((SELECT email FROM auth.users WHERE id = auth.uid()))
    OR
    -- Users can see their own company
    id IN (
      SELECT company_id FROM users WHERE id = auth.uid() AND company_id IS NOT NULL
    )
  );

-- Companies INSERT policy
CREATE POLICY "Super admins can insert companies"
  ON companies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_super_admin((SELECT email FROM auth.users WHERE id = auth.uid()))
  );

-- Companies UPDATE policy
CREATE POLICY "Company update control"
  ON companies
  FOR UPDATE
  TO authenticated
  USING (
    -- Super admins can update any company
    is_super_admin((SELECT email FROM auth.users WHERE id = auth.uid()))
    OR
    -- Company admins can update their own company (except account_id)
    (
      is_company_admin(auth.uid(), id)
      AND NOT (OLD.account_id IS DISTINCT FROM NEW.account_id)
    )
  )
  WITH CHECK (
    -- Super admins can update any company
    is_super_admin((SELECT email FROM auth.users WHERE id = auth.uid()))
    OR
    -- Company admins can update their own company (except account_id)
    (
      is_company_admin(auth.uid(), id)
      AND NOT (OLD.account_id IS DISTINCT FROM NEW.account_id)
    )
  );

-- Enhanced RLS Policies for Users table
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Users SELECT policy
CREATE POLICY "User access control"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    -- Super admins can see all users
    is_super_admin((SELECT email FROM auth.users WHERE id = auth.uid()))
    OR
    -- Users can see their own profile
    id = auth.uid()
    OR
    -- Company admins can see users in their company
    (
      company_id IN (
        SELECT company_id FROM users 
        WHERE id = auth.uid() AND role = 'admin' AND company_id IS NOT NULL
      )
    )
    OR
    -- Users can see other users in their company
    (
      company_id IN (
        SELECT company_id FROM users 
        WHERE id = auth.uid() AND company_id IS NOT NULL
      )
    )
  );

-- Users INSERT policy
CREATE POLICY "User creation control"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Super admins can create any user
    is_super_admin((SELECT email FROM auth.users WHERE id = auth.uid()))
    OR
    -- Company admins can create users in their company
    (
      company_id IN (
        SELECT company_id FROM users 
        WHERE id = auth.uid() AND role = 'admin' AND company_id IS NOT NULL
      )
    )
    OR
    -- Self-registration (user creating their own profile)
    id = auth.uid()
  );

-- Users UPDATE policy
CREATE POLICY "User update control"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    -- Super admins can update any user
    is_super_admin((SELECT email FROM auth.users WHERE id = auth.uid()))
    OR
    -- Users can update their own profile (except role and company_id)
    (
      id = auth.uid()
      AND OLD.role = NEW.role
      AND OLD.company_id = NEW.company_id
    )
    OR
    -- Company admins can update users in their company
    (
      company_id IN (
        SELECT company_id FROM users 
        WHERE id = auth.uid() AND role = 'admin' AND company_id IS NOT NULL
      )
      AND NEW.role != 'super_admin'
    )
  )
  WITH CHECK (
    -- Super admins can update any user
    is_super_admin((SELECT email FROM auth.users WHERE id = auth.uid()))
    OR
    -- Users can update their own profile (except role and company_id)
    (
      id = auth.uid()
      AND OLD.role = NEW.role
      AND OLD.company_id = NEW.company_id
    )
    OR
    -- Company admins can update users in their company
    (
      company_id IN (
        SELECT company_id FROM users 
        WHERE id = auth.uid() AND role = 'admin' AND company_id IS NOT NULL
      )
      AND NEW.role != 'super_admin'
    )
  );

-- Users DELETE policy
CREATE POLICY "User deletion control"
  ON users
  FOR DELETE
  TO authenticated
  USING (
    -- Super admins can delete any user
    is_super_admin((SELECT email FROM auth.users WHERE id = auth.uid()))
    OR
    -- Company admins can delete users in their company (except themselves)
    (
      id != auth.uid()
      AND company_id IN (
        SELECT company_id FROM users 
        WHERE id = auth.uid() AND role = 'admin' AND company_id IS NOT NULL
      )
    )
  );

-- Enhanced RLS Policies for Campaigns table
DROP POLICY IF EXISTS "Users can read own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Admins can read all campaigns" ON campaigns;
DROP POLICY IF EXISTS "Users can insert own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Admins can insert any campaign" ON campaigns;
DROP POLICY IF EXISTS "Users can update own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Admins can update any campaign" ON campaigns;
DROP POLICY IF EXISTS "Users can delete own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Admins can delete any campaign" ON campaigns;

-- Campaigns SELECT policy
CREATE POLICY "Campaign access control"
  ON campaigns
  FOR SELECT
  TO authenticated
  USING (
    -- Super admins can see all campaigns
    is_super_admin((SELECT email FROM auth.users WHERE id = auth.uid()))
    OR
    -- Users can see their own campaigns
    client_id = auth.uid()
    OR
    -- Company members can see campaigns from their company
    client_id IN (
      SELECT id FROM users 
      WHERE company_id = (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
      AND company_id IS NOT NULL
    )
  );

-- Campaigns INSERT policy
CREATE POLICY "Campaign creation control"
  ON campaigns
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Super admins can create campaigns for anyone
    is_super_admin((SELECT email FROM auth.users WHERE id = auth.uid()))
    OR
    -- Users can create their own campaigns
    client_id = auth.uid()
    OR
    -- Company admins can create campaigns for users in their company
    (
      client_id IN (
        SELECT id FROM users 
        WHERE company_id = (
          SELECT company_id FROM users WHERE id = auth.uid() AND role = 'admin'
        )
        AND company_id IS NOT NULL
      )
    )
  );

-- Campaigns UPDATE policy
CREATE POLICY "Campaign update control"
  ON campaigns
  FOR UPDATE
  TO authenticated
  USING (
    -- Super admins can update any campaign
    is_super_admin((SELECT email FROM auth.users WHERE id = auth.uid()))
    OR
    -- Users can update their own campaigns
    client_id = auth.uid()
    OR
    -- Company admins can update campaigns from their company
    client_id IN (
      SELECT id FROM users 
      WHERE company_id = (
        SELECT company_id FROM users WHERE id = auth.uid() AND role = 'admin'
      )
      AND company_id IS NOT NULL
    )
  )
  WITH CHECK (
    -- Super admins can update any campaign
    is_super_admin((SELECT email FROM auth.users WHERE id = auth.uid()))
    OR
    -- Users can update their own campaigns
    client_id = auth.uid()
    OR
    -- Company admins can update campaigns from their company
    client_id IN (
      SELECT id FROM users 
      WHERE company_id = (
        SELECT company_id FROM users WHERE id = auth.uid() AND role = 'admin'
      )
      AND company_id IS NOT NULL
    )
  );

-- Campaigns DELETE policy
CREATE POLICY "Campaign deletion control"
  ON campaigns
  FOR DELETE
  TO authenticated
  USING (
    -- Super admins can delete any campaign
    is_super_admin((SELECT email FROM auth.users WHERE id = auth.uid()))
    OR
    -- Users can delete their own campaigns
    client_id = auth.uid()
    OR
    -- Company admins can delete campaigns from their company
    client_id IN (
      SELECT id FROM users 
      WHERE company_id = (
        SELECT company_id FROM users WHERE id = auth.uid() AND role = 'admin'
      )
      AND company_id IS NOT NULL
    )
  );

-- Enhanced RLS Policies for Audience Requests table
DROP POLICY IF EXISTS "Users can read own requests" ON audience_requests;
DROP POLICY IF EXISTS "Admins can read all requests" ON audience_requests;
DROP POLICY IF EXISTS "Users can insert own requests" ON audience_requests;
DROP POLICY IF EXISTS "Admins can update any request" ON audience_requests;
DROP POLICY IF EXISTS "Users can update own requests" ON audience_requests;
DROP POLICY IF EXISTS "Users can delete own requests" ON audience_requests;
DROP POLICY IF EXISTS "Admins can delete any request" ON audience_requests;

-- Audience Requests SELECT policy
CREATE POLICY "Request access control"
  ON audience_requests
  FOR SELECT
  TO authenticated
  USING (
    -- Super admins can see all requests
    is_super_admin((SELECT email FROM auth.users WHERE id = auth.uid()))
    OR
    -- Users can see their own requests
    client_id = auth.uid()
    OR
    -- Company members can see requests from their company
    client_id IN (
      SELECT id FROM users 
      WHERE company_id = (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
      AND company_id IS NOT NULL
    )
  );

-- Audience Requests INSERT policy
CREATE POLICY "Request creation control"
  ON audience_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Super admins can create requests for anyone
    is_super_admin((SELECT email FROM auth.users WHERE id = auth.uid()))
    OR
    -- Users can create their own requests
    client_id = auth.uid()
  );

-- Audience Requests UPDATE policy
CREATE POLICY "Request update control"
  ON audience_requests
  FOR UPDATE
  TO authenticated
  USING (
    -- Super admins can update any request
    is_super_admin((SELECT email FROM auth.users WHERE id = auth.uid()))
    OR
    -- Users can update their own requests
    client_id = auth.uid()
    OR
    -- Company admins can update requests from their company
    client_id IN (
      SELECT id FROM users 
      WHERE company_id = (
        SELECT company_id FROM users WHERE id = auth.uid() AND role = 'admin'
      )
      AND company_id IS NOT NULL
    )
  )
  WITH CHECK (
    -- Super admins can update any request
    is_super_admin((SELECT email FROM auth.users WHERE id = auth.uid()))
    OR
    -- Users can update their own requests
    client_id = auth.uid()
    OR
    -- Company admins can update requests from their company
    client_id IN (
      SELECT id FROM users 
      WHERE company_id = (
        SELECT company_id FROM users WHERE id = auth.uid() AND role = 'admin'
      )
      AND company_id IS NOT NULL
    )
  );

-- Audience Requests DELETE policy
CREATE POLICY "Request deletion control"
  ON audience_requests
  FOR DELETE
  TO authenticated
  USING (
    -- Super admins can delete any request
    is_super_admin((SELECT email FROM auth.users WHERE id = auth.uid()))
    OR
    -- Users can delete their own requests
    client_id = auth.uid()
    OR
    -- Company admins can delete requests from their company
    client_id IN (
      SELECT id FROM users 
      WHERE company_id = (
        SELECT company_id FROM users WHERE id = auth.uid() AND role = 'admin'
      )
      AND company_id IS NOT NULL
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_company_role ON users(company_id, role);
CREATE INDEX IF NOT EXISTS idx_companies_account_id ON companies(account_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_client_company ON campaigns(client_id);
CREATE INDEX IF NOT EXISTS idx_requests_client_company ON audience_requests(client_id);