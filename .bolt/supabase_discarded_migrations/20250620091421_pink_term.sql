/*
  # Fix User Data and Permissions

  1. Data Updates
    - Set jackmanning70@gmail.com as admin of his company
    - Ensure proper company associations
    - Fix advertiser data persistence

  2. Security Updates
    - Allow all users to view team lists
    - Restrict management to admins only

  3. Database Improvements
    - Ensure proper foreign key relationships
    - Add missing indexes for performance
*/

-- Step 1: Find and update jackmanning70@gmail.com user
DO $$
DECLARE
  target_user_id uuid;
  target_company_id uuid;
BEGIN
  -- Find the user by email from auth.users
  SELECT u.id, u.company_id INTO target_user_id, target_company_id
  FROM users u
  JOIN auth.users au ON u.id = au.id
  WHERE au.email = 'jackmanning70@gmail.com';

  IF target_user_id IS NOT NULL THEN
    -- Update user to admin role
    UPDATE users 
    SET role = 'admin', updated_at = now()
    WHERE id = target_user_id;

    -- If user doesn't have a company, create one
    IF target_company_id IS NULL THEN
      INSERT INTO companies (name, created_at, updated_at)
      VALUES ('Jack Manning Company', now(), now())
      RETURNING id INTO target_company_id;

      -- Associate user with the new company
      UPDATE users 
      SET company_id = target_company_id, updated_at = now()
      WHERE id = target_user_id;
    END IF;

    -- Ensure the user is admin of their company
    UPDATE users 
    SET role = 'admin', updated_at = now()
    WHERE id = target_user_id;

    RAISE NOTICE 'Updated user jackmanning70@gmail.com to admin with company_id: %', target_company_id;
  ELSE
    RAISE NOTICE 'User jackmanning70@gmail.com not found';
  END IF;
END $$;

-- Step 2: Update user access policies to allow viewing team members
DROP POLICY IF EXISTS "User access control" ON users;

CREATE POLICY "User access control"
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
    -- Users can see other users in their company (not just admins)
    (
      company_id IS NOT NULL AND company_id IN (
        SELECT company_id FROM users 
        WHERE id = auth.uid() AND company_id IS NOT NULL
      )
    )
  );

-- Step 3: Ensure advertiser accounts table exists and has proper structure
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

-- Create policies for advertiser_accounts to ensure data persistence
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

-- Step 4: Create trigger for advertiser_accounts updated_at
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

-- Step 5: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_advertiser_accounts_user_id ON advertiser_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_advertiser_accounts_platform ON advertiser_accounts(platform);

-- Step 6: Ensure company_account_ids policies allow viewing by all company members
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

-- Step 7: Update user creation control to allow company admins to invite users
DROP POLICY IF EXISTS "User creation control" ON users;

CREATE POLICY "User creation control"
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

-- Step 8: Update user update control to allow company admins to manage users
DROP POLICY IF EXISTS "User update control" ON users;

CREATE POLICY "User update control"
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

-- Step 9: Ensure proper foreign key constraints exist
DO $$
BEGIN
  -- Add foreign key for users.company_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'users' AND constraint_name = 'users_company_id_fkey'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_company_id_fkey 
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Step 10: Create a view for admin dashboard to see all companies with user counts
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

-- Grant access to the view
GRANT SELECT ON admin_company_overview TO authenticated;

-- Step 11: Create RLS policy for the view
CREATE POLICY "admin_company_overview_select_policy"
  ON admin_company_overview
  FOR SELECT
  TO authenticated
  USING (
    -- Super admins can see all companies
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() AND email LIKE '%@boostdata.io'
    )
  );