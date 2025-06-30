-- SQL script to verify RLS policies on users table
-- Run this in your Supabase SQL editor to confirm the migration worked

-- Check if RLS is enabled on users table
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'users' AND schemaname = 'public';

-- List all current policies on users table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public'
ORDER BY policyname;

-- Create a function to check RLS policies
CREATE OR REPLACE FUNCTION public.check_rls_policies(table_name text)
RETURNS json[] AS $$
BEGIN
  RETURN (
    SELECT array_agg(row_to_json(p))
    FROM (
      SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd
      FROM pg_policies 
      WHERE tablename = table_name AND schemaname = 'public'
      ORDER BY policyname
    ) p
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the function
SELECT check_rls_policies('users');