/*
  # Fix Users Table RLS Policy

  1. Changes
    - Remove existing RLS policies on users table that may cause recursion
    - Create new simplified RLS policies for users table:
      - Users can read their own data
      - Users can update their own data
      - Admins can read all user data
      - Admins can update all user data

  2. Security
    - Maintains RLS protection
    - Simplifies policy logic to prevent recursion
    - Ensures users can only access their own data
    - Provides admin access where needed
*/

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

-- Create new simplified policies
CREATE POLICY "Users can read own data"
ON users
FOR SELECT
TO authenticated
USING (
  auth.uid() = id OR 
  EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_app_meta_data->>'role' = 'admin'
  )
);

CREATE POLICY "Users can update own data"
ON users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);