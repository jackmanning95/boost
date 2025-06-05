/*
  # Fix Users Table RLS Policies

  1. Changes
    - Add RLS policies for the users table to allow:
      - Anonymous users to read user profiles during auth flows
      - Authenticated users to read their own profile
      - Authenticated users to update their own profile
      - Admins to read all user profiles
  
  2. Security
    - Enables RLS on users table if not already enabled
    - Adds policies for SELECT and UPDATE operations
    - Ensures proper access control based on user role and ownership
*/

-- Enable RLS on users table if not already enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to read user profiles during auth flows
CREATE POLICY "Allow anonymous read access to users"
  ON users
  FOR SELECT
  TO anon
  USING (true);

-- Allow authenticated users to read their own profile
CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow authenticated users to update their own profile
CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow admins to read all user profiles
CREATE POLICY "Admins can read all profiles"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
    )
  );