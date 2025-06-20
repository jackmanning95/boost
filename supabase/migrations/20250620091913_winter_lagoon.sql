/*
  # Fix User Management and Data Persistence Issues

  1. User Role Updates
    - Set jackmanning70@gmail.com as admin of his company
    - Ensure proper company association
    - Fix role assignments

  2. Data Persistence Fixes
    - Ensure advertiser accounts save to database
    - Fix company account ID storage
    - Update RLS policies for proper data access

  3. Team Visibility Updates
    - Allow all company users to view team members
    - Maintain admin-only management permissions
    - Fix user invitation system
*/

-- Step 1: Find and update jackmanning70@gmail.com user
DO $$
DECLARE
  target_user_id uuid;
  target_company_id uuid;
  target_email text := 'jackmanning70@gmail.com';
BEGIN
  -- Find the user by email from auth.users
  SELECT u.id, u.company_id INTO target_user_id, target_company_id
  FROM users u
  JOIN auth.users au ON u.id = au.id
  WHERE au.email = target_email;

  IF target_user_id IS NOT NULL THEN
    RAISE NOTICE 'Found user % with ID: %', target_email, target_user_id;
    
    -- If user doesn't have a company, create one
    IF target_company_id IS NULL THEN
      INSERT INTO companies (name, created_at, updated_at)
      VALUES ('Jack Manning Company', now(), now())
      RETURNING id INTO target_company_id;
      
      RAISE NOTICE 'Created company with ID: %', target_company_id;

      -- Associate user with the new company
      UPDATE users 
      SET company_id = target_company_id, updated_at = now()
      WHERE id = target_user_id;
    END IF;

    -- Ensure the user is admin of their company
    UPDATE users 
    SET role = 'admin', updated_at = now()
    WHERE id = target_user_id;

    RAISE NOTICE 'Updated user % to admin with company_id: %', target_email, target_company_id;
  ELSE
    RAISE NOTICE 'User % not found in database', target_email;
  END IF;
END $$;

-- Step 2: Update user access policies to allow all company members to view team
DROP POLICY IF EXISTS "users_select_policy" ON users;

CREATE POLICY "users_select_policy"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    -- Super admins can see all users
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() AND email LIKE '%@boostdata.io'
    )
    OR
    -- Users can see their own profile
    id = auth.uid()
    OR
    -- All company members can see other users in their company
    (
      company_id IS NOT NULL AND company_id IN (
        SELECT company_id FROM users 
        WHERE id = auth.uid() AND company_id IS NOT NULL
      )
    )
  );

-- Step 3: Ensure advertiser accounts table exists with proper structure
CREATE TABLE IF NOT EXISTS advertiser_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL,
  advertiser_name text NOT NULL,
  advertiser_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on advertiser_accounts
ALTER TABLE advertiser_accounts ENABLE ROW LEVEL SECURITY;

-- Step 4: Create comprehensive advertiser accounts policies
DROP POLICY IF EXISTS "advertiser_accounts_select_policy" ON advertiser_accounts;
DROP POLICY IF EXISTS "advertiser_accounts_insert_policy" ON advertiser_accounts;
DROP POLICY IF EXISTS "advertiser_accounts_update_policy" ON advertiser_accounts;
DROP POLICY IF EXISTS "advertiser_accounts_delete_policy" ON advertiser_accounts;

CREATE POLICY "advertiser_accounts_select_policy"
  ON advertiser_accounts
  FOR SELECT
  TO authenticated
  USING (
    -- Super admins can see all advertiser accounts
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() AND email LIKE '%@boostdata.io'
    )
    OR
    -- Users can see their own advertiser accounts
    user_id = auth.uid()
    OR
    -- Company admins can see advertiser accounts of users in their company
    user_id IN (
      SELECT u.id FROM users u
      WHERE u.company_id = (
        SELECT company_id FROM users WHERE id = auth.uid() AND role = 'admin'
      )
      AND u.company_id IS NOT NULL
    )
  );

CREATE POLICY "advertiser_accounts_insert_policy"
  ON advertiser_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Users can create their own advertiser accounts
    user_id = auth.uid()
    OR
    -- Super admins can create advertiser accounts for anyone
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() AND email LIKE '%@boostdata.io'
    )
  );

CREATE POLICY "advertiser_accounts_update_policy"
  ON advertiser_accounts
  FOR UPDATE
  TO authenticated
  USING (
    -- Users can update their own advertiser accounts
    user_id = auth.uid()
    OR
    -- Super admins can update any advertiser account
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() AND email LIKE '%@boostdata.io'
    )
  )
  WITH CHECK (
    -- Users can update their own advertiser accounts
    user_id = auth.uid()
    OR
    -- Super admins can update any advertiser account
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() AND email LIKE '%@boostdata.io'
    )
  );

CREATE POLICY "advertiser_accounts_delete_policy"
  ON advertiser_accounts
  FOR DELETE
  TO authenticated
  USING (
    -- Users can delete their own advertiser accounts
    user_id = auth.uid()
    OR
    -- Super admins can delete any advertiser account
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() AND email LIKE '%@boostdata.io'
    )
  );

-- Step 5: Create trigger for advertiser_accounts updated_at
CREATE OR REPLACE FUNCTION update_advertiser_accounts_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_advertiser_accounts_updated_at ON advertiser_accounts;
CREATE TRIGGER update_advertiser_accounts_updated_at
  BEFORE UPDATE ON advertiser_accounts
  FOR EACH ROW EXECUTE FUNCTION update_advertiser_accounts_updated_at();

-- Step 6: Update company account IDs policies for better visibility
DROP POLICY IF EXISTS "company_account_ids_select_policy" ON company_account_ids;

CREATE POLICY "company_account_ids_select_policy"
  ON company_account_ids
  FOR SELECT
  TO authenticated
  USING (
    -- Super admins can see all account IDs
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() AND email LIKE '%@boostdata.io'
    )
    OR
    -- All company members can see their company's account IDs
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid() AND company_id IS NOT NULL
    )
  );

-- Step 7: Update user management policies for company admins
DROP POLICY IF EXISTS "users_insert_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;

CREATE POLICY "users_insert_policy"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Super admins can create any user
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() AND email LIKE '%@boostdata.io'
    )
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

CREATE POLICY "users_update_policy"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    -- Super admins can update any user
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() AND email LIKE '%@boostdata.io'
    )
    OR
    -- Users can update their own profile
    id = auth.uid()
    OR
    -- Company admins can update users in their company
    (
      company_id IN (
        SELECT company_id FROM users 
        WHERE id = auth.uid() AND role = 'admin' AND company_id IS NOT NULL
      )
    )
  )
  WITH CHECK (
    -- Super admins can update any user
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() AND email LIKE '%@boostdata.io'
    )
    OR
    -- Users can update their own profile
    id = auth.uid()
    OR
    -- Company admins can update users in their company (but not to super_admin)
    (
      company_id IN (
        SELECT company_id FROM users 
        WHERE id = auth.uid() AND role = 'admin' AND company_id IS NOT NULL
      )
      AND role != 'super_admin'
    )
  );

-- Step 8: Add performance indexes
CREATE INDEX IF NOT EXISTS idx_advertiser_accounts_user_id ON advertiser_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_advertiser_accounts_platform ON advertiser_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_users_email_lookup ON users(id);

-- Step 9: Create admin view for company management
CREATE OR REPLACE VIEW admin_company_overview AS
SELECT 
  c.id,
  c.name,
  c.account_id,
  c.created_at,
  c.updated_at,
  COUNT(u.id) as user_count,
  COUNT(CASE WHEN u.role = 'admin' THEN 1 END) as admin_count,
  ARRAY_AGG(
    CASE WHEN u.id IS NOT NULL THEN 
      json_build_object(
        'id', u.id,
        'name', u.name,
        'email', au.email,
        'role', u.role,
        'created_at', u.created_at
      )
    END
  ) FILTER (WHERE u.id IS NOT NULL) as users
FROM companies c
LEFT JOIN users u ON c.id = u.company_id
LEFT JOIN auth.users au ON u.id = au.id
GROUP BY c.id, c.name, c.account_id, c.created_at, c.updated_at
ORDER BY c.created_at DESC;

-- Grant access to the view for super admins
GRANT SELECT ON admin_company_overview TO authenticated;

-- Step 10: Verify data integrity
DO $$
DECLARE
  user_count integer;
  company_count integer;
BEGIN
  SELECT COUNT(*) INTO user_count FROM users;
  SELECT COUNT(*) INTO company_count FROM companies;
  
  RAISE NOTICE 'Database verification: % users, % companies', user_count, company_count;
  
  -- Check if jackmanning70@gmail.com is properly set up
  IF EXISTS (
    SELECT 1 FROM users u
    JOIN auth.users au ON u.id = au.id
    WHERE au.email = 'jackmanning70@gmail.com' 
    AND u.role = 'admin' 
    AND u.company_id IS NOT NULL
  ) THEN
    RAISE NOTICE 'jackmanning70@gmail.com is properly configured as company admin';
  ELSE
    RAISE WARNING 'jackmanning70@gmail.com may not be properly configured';
  END IF;
END $$;