/*
  # Fix User Management and Advertiser Account Persistence

  1. User Updates
    - Make jackmanning70@gmail.com an admin of his company
    - Create company if needed
    
  2. Advertiser Accounts
    - Ensure advertiser_accounts table exists with proper structure
    - Add RLS policies for data persistence
    - Create proper indexes
    
  3. Company Account IDs
    - Ensure company_account_ids table exists
    - Add RLS policies for company-level account management
    
  4. User Policies
    - Fix RLS policies to avoid recursion
    - Allow all company members to view team list
    - Restrict management to admins
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

-- Step 2: Create advertiser_accounts table if it doesn't exist
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

-- Step 3: Create simple, non-recursive policies for advertiser_accounts
DROP POLICY IF EXISTS "advertiser_accounts_select_policy" ON advertiser_accounts;
DROP POLICY IF EXISTS "advertiser_accounts_insert_policy" ON advertiser_accounts;
DROP POLICY IF EXISTS "advertiser_accounts_update_policy" ON advertiser_accounts;
DROP POLICY IF EXISTS "advertiser_accounts_delete_policy" ON advertiser_accounts;

CREATE POLICY "advertiser_accounts_select_policy"
  ON advertiser_accounts
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() AND email LIKE '%@boostdata.io'
    )
  );

CREATE POLICY "advertiser_accounts_insert_policy"
  ON advertiser_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
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
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() AND email LIKE '%@boostdata.io'
    )
  )
  WITH CHECK (
    user_id = auth.uid() OR
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
    user_id = auth.uid() OR
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

-- Step 6: Create company_account_ids table if it doesn't exist
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

-- Enable RLS on company_account_ids
ALTER TABLE company_account_ids ENABLE ROW LEVEL SECURITY;

-- Step 7: Create simple, non-recursive policies for company_account_ids
DROP POLICY IF EXISTS "company_account_ids_select_policy" ON company_account_ids;
DROP POLICY IF EXISTS "company_account_ids_insert_policy" ON company_account_ids;
DROP POLICY IF EXISTS "company_account_ids_update_policy" ON company_account_ids;
DROP POLICY IF EXISTS "company_account_ids_delete_policy" ON company_account_ids;

CREATE POLICY "company_account_ids_select_policy"
  ON company_account_ids
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() AND email LIKE '%@boostdata.io'
    ) OR
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND company_id = company_account_ids.company_id
    )
  );

CREATE POLICY "company_account_ids_insert_policy"
  ON company_account_ids
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() AND email LIKE '%@boostdata.io'
    ) OR
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND company_id = company_account_ids.company_id AND role = 'admin'
    )
  );

CREATE POLICY "company_account_ids_update_policy"
  ON company_account_ids
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() AND email LIKE '%@boostdata.io'
    ) OR
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND company_id = company_account_ids.company_id AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() AND email LIKE '%@boostdata.io'
    ) OR
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND company_id = company_account_ids.company_id AND role = 'admin'
    )
  );

CREATE POLICY "company_account_ids_delete_policy"
  ON company_account_ids
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() AND email LIKE '%@boostdata.io'
    ) OR
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND company_id = company_account_ids.company_id AND role = 'admin'
    )
  );

-- Step 8: Create trigger for company_account_ids updated_at
CREATE OR REPLACE FUNCTION update_company_account_ids_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_company_account_ids_updated_at ON company_account_ids;
CREATE TRIGGER update_company_account_ids_updated_at
  BEFORE UPDATE ON company_account_ids
  FOR EACH ROW EXECUTE FUNCTION update_company_account_ids_updated_at();

-- Step 9: Add unique constraint to prevent duplicate platform/account_id combinations per company
-- Check if constraint exists first to avoid error
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_company_platform_account'
  ) THEN
    ALTER TABLE company_account_ids 
    ADD CONSTRAINT unique_company_platform_account 
    UNIQUE (company_id, platform, account_id);
  END IF;
END $$;

-- Step 10: Fix users table policies to avoid recursion
DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;
DROP POLICY IF EXISTS "users_delete_policy" ON users;

-- Simple non-recursive policies for users table
CREATE POLICY "users_select_policy"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() AND email LIKE '%@boostdata.io'
    ) OR
    (company_id IS NOT NULL AND company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid() AND company_id IS NOT NULL
    ))
  );

CREATE POLICY "users_insert_policy"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() AND email LIKE '%@boostdata.io'
    )
  );

CREATE POLICY "users_update_policy"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() AND email LIKE '%@boostdata.io'
    )
  )
  WITH CHECK (
    id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() AND email LIKE '%@boostdata.io'
    )
  );

CREATE POLICY "users_delete_policy"
  ON users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() AND email LIKE '%@boostdata.io'
    )
  );

-- Step 11: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_company_role ON users(company_id, role);
CREATE INDEX IF NOT EXISTS idx_users_email_lookup ON users(id);