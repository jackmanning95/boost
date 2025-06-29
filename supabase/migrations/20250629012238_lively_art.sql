-- SQL script to check and verify RLS policies on users table
-- Run this in your Supabase SQL editor to diagnose RLS issues

-- 1. Check if RLS is enabled on users table
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'users' AND schemaname = 'public';

-- 2. List all current policies on users table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public'
ORDER BY policyname;

-- 3. Check if service_role has the necessary permissions
SELECT 
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.role_table_grants 
WHERE table_name = 'users' 
  AND table_schema = 'public'
  AND grantee = 'service_role';

-- 4. Test if service_role can insert into users table (this should work)
-- Note: This is just a check query, don't actually run the insert
SELECT 
  'service_role can insert' as test,
  has_table_privilege('service_role', 'public.users', 'INSERT') as can_insert,
  has_table_privilege('service_role', 'public.users', 'SELECT') as can_select,
  has_table_privilege('service_role', 'public.users', 'UPDATE') as can_update;

-- 5. Check if the helper functions exist and are accessible
SELECT 
  routine_name,
  routine_type,
  security_type,
  is_deterministic
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('get_current_user_company_id', 'is_current_user_company_admin');

-- 6. Check for any constraints that might block user creation
SELECT 
  constraint_name,
  constraint_type,
  table_name,
  column_name
FROM information_schema.constraint_column_usage 
WHERE table_name = 'users' AND table_schema = 'public';

-- 7. Verify the users table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;