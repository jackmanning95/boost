-- Emergency RLS policy fix for users table
-- Run this if the diagnostic shows RLS policy issues

-- First, ensure we can work with the table
SET role postgres;

-- Temporarily disable RLS to fix policies
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'users' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON public.users';
    END LOOP;
END $$;

-- Recreate the essential policies for invite-user function to work

-- 1. Service role must have full access (CRITICAL for invite-user function)
CREATE POLICY "service_role_full_access" 
  ON public.users 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- 2. Users can manage their own profile
CREATE POLICY "users_own_profile" 
  ON public.users 
  FOR ALL 
  TO authenticated 
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 3. Super admins (boostdata.io emails) have full access
CREATE POLICY "super_admin_access" 
  ON public.users 
  FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND email LIKE '%@boostdata.io'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND email LIKE '%@boostdata.io'
    )
  );

-- 4. Company members can read each other (simplified, non-recursive)
CREATE POLICY "company_members_read" 
  ON public.users 
  FOR SELECT 
  TO authenticated 
  USING (
    company_id IS NOT NULL 
    AND company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  );

-- 5. Company admins can manage their company users (simplified)
CREATE POLICY "company_admin_manage" 
  ON public.users 
  FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.users admin_user
      WHERE admin_user.id = auth.uid()
        AND admin_user.role = 'admin'
        AND admin_user.company_id IS NOT NULL
        AND admin_user.company_id = users.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users admin_user
      WHERE admin_user.id = auth.uid()
        AND admin_user.role = 'admin'
        AND admin_user.company_id IS NOT NULL
        AND admin_user.company_id = users.company_id
    )
  );

-- Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Verify the policies were created
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public'
ORDER BY policyname;

-- Reset role
RESET role;