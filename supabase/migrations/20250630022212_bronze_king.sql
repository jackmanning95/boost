/*
  # Fix RLS policies for users table

  1. Changes
     - Add service_role_full_access policy to users table
     - Ensure service_role can bypass RLS for user creation
     - Fix potential recursion issues in RLS policies
     
  2. Security
     - Maintains existing security model
     - Adds explicit service_role access for Edge Functions
*/

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

-- Verify that the service_role has the necessary permissions
DO $$
BEGIN
  IF NOT (
    SELECT has_table_privilege('service_role', 'public.users', 'INSERT') AND
           has_table_privilege('service_role', 'public.users', 'SELECT') AND
           has_table_privilege('service_role', 'public.users', 'UPDATE')
  ) THEN
    RAISE EXCEPTION 'service_role does not have required permissions on users table';
  END IF;
END $$;

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

-- Add a policy for users to access their own profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' 
    AND schemaname = 'public' 
    AND policyname = 'users_own_profile_access'
  ) THEN
    CREATE POLICY users_own_profile_access ON public.users
      FOR ALL
      TO authenticated
      USING (id = auth.uid())
      WITH CHECK (id = auth.uid());
      
    RAISE NOTICE 'Created users_own_profile_access policy on users table';
  ELSE
    RAISE NOTICE 'users_own_profile_access policy already exists on users table';
  END IF;
END $$;

-- Add a policy for company admins to manage users in their company
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' 
    AND schemaname = 'public' 
    AND policyname = 'company_admin_manage'
  ) THEN
    CREATE POLICY company_admin_manage ON public.users
      FOR ALL
      TO authenticated
      USING (
        (company_id IS NOT NULL) AND 
        (company_id = (
          SELECT company_id FROM public.users WHERE id = auth.uid() AND role = 'admin'
        ))
      )
      WITH CHECK (
        (company_id IS NOT NULL) AND 
        (company_id = (
          SELECT company_id FROM public.users WHERE id = auth.uid() AND role = 'admin'
        ))
      );
      
    RAISE NOTICE 'Created company_admin_manage policy on users table';
  ELSE
    RAISE NOTICE 'company_admin_manage policy already exists on users table';
  END IF;
END $$;

-- Add a policy for company members to read other members in their company
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' 
    AND schemaname = 'public' 
    AND policyname = 'company_members_read'
  ) THEN
    CREATE POLICY company_members_read ON public.users
      FOR SELECT
      TO authenticated
      USING (
        (company_id IS NOT NULL) AND 
        (company_id = (
          SELECT company_id FROM public.users WHERE id = auth.uid()
        ))
      );
      
    RAISE NOTICE 'Created company_members_read policy on users table';
  ELSE
    RAISE NOTICE 'company_members_read policy already exists on users table';
  END IF;
END $$;

-- Add a policy for super admins to have full access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' 
    AND schemaname = 'public' 
    AND policyname = 'super_admin_full_access'
  ) THEN
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
      
    RAISE NOTICE 'Created super_admin_full_access policy on users table';
  ELSE
    RAISE NOTICE 'super_admin_full_access policy already exists on users table';
  END IF;
END $$;

-- Output a success message
SELECT 'RLS policies for users table have been fixed successfully' as result;