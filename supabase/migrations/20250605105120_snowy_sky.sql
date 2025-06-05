/*
  # Fix Users Table RLS Policies

  1. Changes
    - Remove recursive policies that cause infinite loops
    - Simplify RLS policies for the users table
    - Use auth.uid() directly instead of querying users table recursively
    
  2. Security
    - Enable RLS on users table
    - Add policies for:
      - Users can read their own profile
      - Admins can read all profiles (using auth.jwt() claims)
      - Users can update their own profile
*/

-- Drop existing policies to clean up
DROP POLICY IF EXISTS "Admins can read all profiles" ON users;
DROP POLICY IF EXISTS "Allow anonymous read access to users" ON users;
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Create new, simplified policies
CREATE POLICY "Enable read access for users to their own profile"
ON users FOR SELECT
TO authenticated
USING (
  auth.uid() = id
);

CREATE POLICY "Enable admin read access to all profiles"
ON users FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'admin'
);

CREATE POLICY "Enable users to update their own profile"
ON users FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);