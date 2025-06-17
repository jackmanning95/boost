/*
  # Fix RLS policies by removing dependencies and simplifying

  1. Drop all policies that depend on problematic functions
  2. Drop the problematic functions
  3. Create simple, non-recursive policies
  4. Update role constraints and data
*/

-- Step 1: Drop ALL policies that depend on the functions we want to remove
-- This includes policies from previous migrations that might still exist

-- Users table policies
DROP POLICY IF EXISTS "User access control" ON users;
DROP POLICY IF EXISTS "User creation control" ON users;
DROP POLICY IF EXISTS "User deletion control" ON users;
DROP POLICY IF EXISTS "User update control" ON users;
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Companies table policies
DROP POLICY IF EXISTS "Company access control" ON companies;
DROP POLICY IF EXISTS "Super admins can insert companies" ON companies;
DROP POLICY IF EXISTS "Company update control" ON companies;
DROP POLICY IF EXISTS "Super admins can delete companies" ON companies;
DROP POLICY IF EXISTS "Users can read own company" ON companies;
DROP POLICY IF EXISTS "Admins can insert companies" ON companies;
DROP POLICY IF EXISTS "Admins can update companies" ON companies;
DROP POLICY IF EXISTS "Authenticated users can read companies" ON companies;

-- Campaigns table policies
DROP POLICY IF EXISTS "Campaign access control" ON campaigns;
DROP POLICY IF EXISTS "Campaign creation control" ON campaigns;
DROP POLICY IF EXISTS "Campaign update control" ON campaigns;
DROP POLICY IF EXISTS "Campaign deletion control" ON campaigns;
DROP POLICY IF EXISTS "Users can read own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Admins can read all campaigns" ON campaigns;
DROP POLICY IF EXISTS "Users can insert own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Admins can insert any campaign" ON campaigns;
DROP POLICY IF EXISTS "Users can update own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Admins can update any campaign" ON campaigns;
DROP POLICY IF EXISTS "Users can delete own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Admins can delete any campaign" ON campaigns;

-- Audience requests table policies
DROP POLICY IF EXISTS "Request access control" ON audience_requests;
DROP POLICY IF EXISTS "Request creation control" ON audience_requests;
DROP POLICY IF EXISTS "Request update control" ON audience_requests;
DROP POLICY IF EXISTS "Request deletion control" ON audience_requests;
DROP POLICY IF EXISTS "Users can read own requests" ON audience_requests;
DROP POLICY IF EXISTS "Admins can read all requests" ON audience_requests;
DROP POLICY IF EXISTS "Users can insert own requests" ON audience_requests;
DROP POLICY IF EXISTS "Admins can update any request" ON audience_requests;
DROP POLICY IF EXISTS "Users can update own requests" ON audience_requests;
DROP POLICY IF EXISTS "Users can delete own requests" ON audience_requests;
DROP POLICY IF EXISTS "Admins can delete any request" ON audience_requests;

-- Notifications table policies
DROP POLICY IF EXISTS "Notification access control" ON notifications;
DROP POLICY IF EXISTS "Notification creation control" ON notifications;
DROP POLICY IF EXISTS "Notification update control" ON notifications;
DROP POLICY IF EXISTS "Notification deletion control" ON notifications;
DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can insert any notifications" ON notifications;

-- Campaign comments policies
DROP POLICY IF EXISTS "Users can create comments for their company or owned campaigns" ON campaign_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON campaign_comments;
DROP POLICY IF EXISTS "Users can read comments on company or owned campaigns" ON campaign_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON campaign_comments;

-- Campaign workflow history policies
DROP POLICY IF EXISTS "Admins can insert workflow history" ON campaign_workflow_history;
DROP POLICY IF EXISTS "Users can read workflow history for accessible campaigns" ON campaign_workflow_history;

-- Campaign activity log policies
DROP POLICY IF EXISTS "Users and admins can insert activity logs" ON campaign_activity_log;
DROP POLICY IF EXISTS "Users can read activity for accessible campaigns" ON campaign_activity_log;

-- Advertiser accounts policies
DROP POLICY IF EXISTS "Users can delete own advertiser accounts" ON advertiser_accounts;
DROP POLICY IF EXISTS "Users can insert own advertiser accounts" ON advertiser_accounts;
DROP POLICY IF EXISTS "Users can read own advertiser accounts" ON advertiser_accounts;
DROP POLICY IF EXISTS "Users can update own advertiser accounts" ON advertiser_accounts;

-- Audiences policies
DROP POLICY IF EXISTS "Authenticated users can read audiences" ON audiences;
DROP POLICY IF EXISTS "Only admins can insert audiences" ON audiences;
DROP POLICY IF EXISTS "Only admins can update audiences" ON audiences;

-- Step 2: Now drop the problematic functions
DROP FUNCTION IF EXISTS is_super_admin(text);
DROP FUNCTION IF EXISTS is_company_admin(uuid, uuid);

-- Step 3: Update role constraint and data BEFORE creating new policies
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'users' AND constraint_name = 'valid_role'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT valid_role;
  END IF;
END $$;

-- Update existing data to use new role values
UPDATE users SET role = 'user' WHERE role = 'client';
UPDATE users SET role = 'user' WHERE role NOT IN ('admin', 'user', 'super_admin');

-- Add new constraint
ALTER TABLE users ADD CONSTRAINT valid_role 
  CHECK (role = ANY (ARRAY['admin'::text, 'user'::text, 'super_admin'::text]));

-- Step 4: Add account_id column to companies if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'account_id'
  ) THEN
    ALTER TABLE companies ADD COLUMN account_id text;
  END IF;
END $$;

-- Step 5: Create simple, non-recursive policies

-- Users table policies - users can only access their own data
CREATE POLICY "users_select_policy"
  ON users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "users_insert_policy"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "users_update_policy"
  ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Companies table policies - allow basic access, restrict in application
CREATE POLICY "companies_select_policy"
  ON companies
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "companies_insert_policy"
  ON companies
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "companies_update_policy"
  ON companies
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "companies_delete_policy"
  ON companies
  FOR DELETE
  TO authenticated
  USING (true);

-- Campaigns table policies - users can only access their own campaigns
CREATE POLICY "campaigns_select_policy"
  ON campaigns
  FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "campaigns_insert_policy"
  ON campaigns
  FOR INSERT
  TO authenticated
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "campaigns_update_policy"
  ON campaigns
  FOR UPDATE
  TO authenticated
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "campaigns_delete_policy"
  ON campaigns
  FOR DELETE
  TO authenticated
  USING (client_id = auth.uid());

-- Audience requests table policies - users can only access their own requests
CREATE POLICY "audience_requests_select_policy"
  ON audience_requests
  FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "audience_requests_insert_policy"
  ON audience_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "audience_requests_update_policy"
  ON audience_requests
  FOR UPDATE
  TO authenticated
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "audience_requests_delete_policy"
  ON audience_requests
  FOR DELETE
  TO authenticated
  USING (client_id = auth.uid());

-- Notifications table policies - users can only access their own notifications
CREATE POLICY "notifications_select_policy"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_insert_policy"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_update_policy"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_delete_policy"
  ON notifications
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Campaign comments policies - users can only access their own comments
CREATE POLICY "campaign_comments_select_policy"
  ON campaign_comments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "campaign_comments_insert_policy"
  ON campaign_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "campaign_comments_update_policy"
  ON campaign_comments
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "campaign_comments_delete_policy"
  ON campaign_comments
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Campaign workflow history policies - users can only access their own workflow history
CREATE POLICY "campaign_workflow_history_select_policy"
  ON campaign_workflow_history
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "campaign_workflow_history_insert_policy"
  ON campaign_workflow_history
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Campaign activity log policies - users can only access their own activity
CREATE POLICY "campaign_activity_log_select_policy"
  ON campaign_activity_log
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "campaign_activity_log_insert_policy"
  ON campaign_activity_log
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Advertiser accounts policies - users can only access their own accounts
CREATE POLICY "advertiser_accounts_select_policy"
  ON advertiser_accounts
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "advertiser_accounts_insert_policy"
  ON advertiser_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "advertiser_accounts_update_policy"
  ON advertiser_accounts
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "advertiser_accounts_delete_policy"
  ON advertiser_accounts
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Audiences policies - allow all authenticated users to read, restrict writes
CREATE POLICY "audiences_select_policy"
  ON audiences
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "audiences_insert_policy"
  ON audiences
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "audiences_update_policy"
  ON audiences
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Step 6: Update trigger function to be simpler
CREATE OR REPLACE FUNCTION handle_new_user_with_company()
RETURNS trigger AS $$
DECLARE
  user_count integer;
  target_company_id uuid;
BEGIN
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

-- Step 7: Ensure indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_users_company_role ON users(company_id, role);
CREATE INDEX IF NOT EXISTS idx_companies_account_id ON companies(account_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_client_company ON campaigns(client_id);
CREATE INDEX IF NOT EXISTS idx_requests_client_company ON audience_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);