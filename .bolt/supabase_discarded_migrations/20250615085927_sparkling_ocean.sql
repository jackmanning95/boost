/*
  # Company & User Management System Migration

  This migration implements a comprehensive company and user management system with:
  1. Updated user roles (admin, user, super_admin)
  2. Company account_id field
  3. Enhanced RLS policies for multi-tenancy
  4. Automatic role assignment based on email domain and company membership
*/

-- Step 1: Temporarily disable triggers to prevent constraint violations during migration
ALTER TABLE users DISABLE TRIGGER ALL;

-- Step 2: Update existing data BEFORE applying constraints
UPDATE users SET role = 'user' WHERE role = 'client';
UPDATE users SET role = 'user' WHERE role NOT IN ('admin', 'user', 'super_admin');

-- Step 3: Add account_id column to companies table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'account_id'
  ) THEN
    ALTER TABLE companies ADD COLUMN account_id text;
  END IF;
END $$;

-- Step 4: Update users table constraints (drop old constraint first)
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'users' AND constraint_name = 'valid_role'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT valid_role;
  END IF;
END $$;

-- Step 5: Add new constraint with updated roles
ALTER TABLE users ADD CONSTRAINT valid_role 
  CHECK (role = ANY (ARRAY['admin'::text, 'user'::text, 'super_admin'::text]));

-- Step 6: Ensure company_id foreign key exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'users' AND constraint_name = 'users_company_id_fkey'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_company_id_fkey 
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Step 7: Create helper functions
CREATE OR REPLACE FUNCTION is_super_admin(user_email text)
RETURNS boolean AS $$
BEGIN
  RETURN user_email LIKE '%@boostdata.io';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- Step 8: Create trigger function for new user registration
CREATE OR REPLACE FUNCTION handle_new_user_with_company()
RETURNS trigger AS $$
DECLARE
  user_count integer;
  target_company_id uuid;
  user_email text;
BEGIN
  -- Get user email from auth.users
  SELECT email INTO user_email FROM auth.users WHERE id = NEW.id;
  
  -- Check if user is super admin based on email
  IF is_super_admin(user_email) THEN
    NEW.role := 'super_admin';
    RETURN NEW;
  END IF;
  
  -- Get the company_id from the new user
  target_company_id := NEW.company_id;
  
  -- If no company_id is set, default to user role
  IF target_company_id IS NULL THEN
    NEW.role := COALESCE(NEW.role, 'user');
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

-- Step 9: Update existing super admin users BEFORE re-enabling triggers
UPDATE users 
SET role = 'super_admin' 
WHERE id IN (
  SELECT u.id 
  FROM users u 
  JOIN auth.users au ON u.id = au.id 
  WHERE au.email LIKE '%@boostdata.io'
);

-- Step 10: Re-enable triggers and update trigger
ALTER TABLE users ENABLE TRIGGER ALL;

DROP TRIGGER IF EXISTS on_auth_user_created ON users;
CREATE TRIGGER on_auth_user_created
  BEFORE INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_with_company();

-- Step 11: Drop existing policies for Companies
DROP POLICY IF EXISTS "Users can read own company" ON companies;
DROP POLICY IF EXISTS "Admins can insert companies" ON companies;
DROP POLICY IF EXISTS "Admins can update companies" ON companies;
DROP POLICY IF EXISTS "Authenticated users can read companies" ON companies;

-- Step 12: Create new Companies policies
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

CREATE POLICY "Super admins can insert companies"
  ON companies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_super_admin((SELECT email FROM auth.users WHERE id = auth.uid()))
  );

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

CREATE POLICY "Super admins can delete companies"
  ON companies
  FOR DELETE
  TO authenticated
  USING (
    is_super_admin((SELECT email FROM auth.users WHERE id = auth.uid()))
  );

-- Step 13: Drop existing Users policies
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Step 14: Create new Users policies
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

-- Step 15: Drop existing Campaign policies
DROP POLICY IF EXISTS "Users can read own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Admins can read all campaigns" ON campaigns;
DROP POLICY IF EXISTS "Users can insert own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Admins can insert any campaign" ON campaigns;
DROP POLICY IF EXISTS "Users can update own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Admins can update any campaign" ON campaigns;
DROP POLICY IF EXISTS "Users can delete own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Admins can delete any campaign" ON campaigns;

-- Step 16: Create new Campaign policies
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

-- Step 17: Drop existing Audience Request policies
DROP POLICY IF EXISTS "Users can read own requests" ON audience_requests;
DROP POLICY IF EXISTS "Admins can read all requests" ON audience_requests;
DROP POLICY IF EXISTS "Users can insert own requests" ON audience_requests;
DROP POLICY IF EXISTS "Admins can update any request" ON audience_requests;
DROP POLICY IF EXISTS "Users can update own requests" ON audience_requests;
DROP POLICY IF EXISTS "Users can delete own requests" ON audience_requests;
DROP POLICY IF EXISTS "Admins can delete any request" ON audience_requests;

-- Step 18: Create new Audience Request policies
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

-- Step 19: Drop existing Notification policies
DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can insert any notifications" ON notifications;

-- Step 20: Create new Notification policies
CREATE POLICY "Notification access control"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (
    -- Super admins can see all notifications
    is_super_admin((SELECT email FROM auth.users WHERE id = auth.uid()))
    OR
    -- Users can see their own notifications
    user_id = auth.uid()
  );

CREATE POLICY "Notification creation control"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Super admins can create notifications for anyone
    is_super_admin((SELECT email FROM auth.users WHERE id = auth.uid()))
    OR
    -- Users can create notifications for themselves
    user_id = auth.uid()
    OR
    -- Company admins can create notifications for users in their company
    user_id IN (
      SELECT id FROM users 
      WHERE company_id = (
        SELECT company_id FROM users WHERE id = auth.uid() AND role = 'admin'
      )
      AND company_id IS NOT NULL
    )
  );

CREATE POLICY "Notification update control"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (
    -- Super admins can update any notification
    is_super_admin((SELECT email FROM auth.users WHERE id = auth.uid()))
    OR
    -- Users can update their own notifications
    user_id = auth.uid()
  )
  WITH CHECK (
    -- Super admins can update any notification
    is_super_admin((SELECT email FROM auth.users WHERE id = auth.uid()))
    OR
    -- Users can update their own notifications
    user_id = auth.uid()
  );

CREATE POLICY "Notification deletion control"
  ON notifications
  FOR DELETE
  TO authenticated
  USING (
    -- Super admins can delete any notification
    is_super_admin((SELECT email FROM auth.users WHERE id = auth.uid()))
    OR
    -- Users can delete their own notifications
    user_id = auth.uid()
  );

-- Step 21: Create performance indexes
CREATE INDEX IF NOT EXISTS idx_users_company_role ON users(company_id, role);
CREATE INDEX IF NOT EXISTS idx_companies_account_id ON companies(account_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_client_company ON campaigns(client_id);
CREATE INDEX IF NOT EXISTS idx_requests_client_company ON audience_requests(client_id);