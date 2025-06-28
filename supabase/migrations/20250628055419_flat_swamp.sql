-- Debug script to check RLS policies on users table
-- Run this in Supabase SQL Editor to verify permissions

-- 1. Check current RLS policies on users table
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
WHERE tablename = 'users' 
ORDER BY policyname;

-- 2. Check if RLS is enabled on users table
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'users';

-- 3. Test service role permissions
-- This should work if service_role has proper access
SELECT 'Service role can read users table' as test_result
WHERE EXISTS (
  SELECT 1 FROM users LIMIT 1
);

-- 4. Check companies table access
SELECT 
  id,
  name,
  created_at
FROM companies 
ORDER BY created_at DESC 
LIMIT 5;

-- 5. Check if handle_new_user_with_company trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- 6. Test trigger function exists
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user_with_company';

-- 7. Check auth.users table structure (if accessible)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'auth' 
AND table_name = 'users'
ORDER BY ordinal_position;

-- 8. Check public.users table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users'
ORDER BY ordinal_position;