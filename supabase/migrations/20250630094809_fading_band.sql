-- This migration fixes RLS policies for the users table to ensure the service_role
-- can properly create and manage users without recursion issues.

-- First, check if the service_role_full_access policy already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' 
    AND schemaname = 'public' 
    AND policyname = 'service_role_full_access'
  ) THEN
    -- Create a policy that gives service_role full access to users table
    CREATE POLICY service_role_full_access ON public.users
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
      
    RAISE NOTICE 'Created service_role_full_access policy on users table';
  ELSE
    RAISE NOTICE 'service_role_full_access policy already exists on users table';
  END IF;
END $$;

-- Ensure RLS is enabled on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create or replace the handle_new_user_with_company function to avoid recursion
CREATE OR REPLACE FUNCTION public.handle_new_user_with_company()
RETURNS TRIGGER AS $$
DECLARE
  company_user_count INT;
BEGIN
  -- Check if this is the first user in the company
  IF NEW.company_id IS NOT NULL THEN
    SELECT COUNT(*) INTO company_user_count
    FROM public.users
    WHERE company_id = NEW.company_id;
    
    -- If this is the first user, make them an admin
    IF company_user_count = 0 THEN
      NEW.role := 'admin';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
    AND tgrelid = 'public.users'::regclass
  ) THEN
    CREATE TRIGGER on_auth_user_created
    BEFORE INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user_with_company();
    
    RAISE NOTICE 'Created on_auth_user_created trigger on users table';
  ELSE
    RAISE NOTICE 'on_auth_user_created trigger already exists on users table';
  END IF;
END $$;

-- Create helper function to get user company ID
CREATE OR REPLACE FUNCTION public.get_user_company_id(user_id uuid)
RETURNS uuid AS $$
BEGIN
  RETURN (SELECT company_id FROM public.users WHERE id = user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to check if user is company admin
CREATE OR REPLACE FUNCTION public.is_user_company_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN COALESCE((SELECT (role = 'admin') FROM public.users WHERE id = user_id), false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS users_own_profile_access ON public.users;
DROP POLICY IF EXISTS company_admin_manage ON public.users;
DROP POLICY IF EXISTS company_members_read ON public.users;
DROP POLICY IF EXISTS super_admin_full_access ON public.users;

-- Add a policy for users to access their own profile
CREATE POLICY users_own_profile_access ON public.users
  FOR ALL
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Add a policy for company admins to manage users in their company
CREATE POLICY company_admin_manage ON public.users
  FOR ALL
  TO authenticated
  USING (
    is_user_company_admin(auth.uid()) AND 
    (
      (company_id IS NOT NULL AND company_id = get_user_company_id(auth.uid())) OR
      -- Allow reading users that are being removed (company_id set to NULL)
      (company_id IS NULL)
    )
  )
  WITH CHECK (
    is_user_company_admin(auth.uid()) AND 
    (
      (company_id IS NOT NULL AND company_id = get_user_company_id(auth.uid())) OR
      -- Allow setting company_id to NULL when removing users
      (company_id IS NULL)
    )
  );

-- Add a policy for company members to read other members in their company
CREATE POLICY company_members_read ON public.users
  FOR SELECT
  TO authenticated
  USING (
    (company_id IS NOT NULL AND company_id = get_user_company_id(auth.uid()))
  );

-- Add a policy for super admins to have full access
CREATE POLICY super_admin_full_access ON public.users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE users.id = auth.uid() AND (users.email)::text ~~ '%@boostdata.io'::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE users.id = auth.uid() AND (users.email)::text ~~ '%@boostdata.io'::text
    )
  );

-- Output a success message
SELECT 'RLS policies for users table have been fixed successfully' as result;