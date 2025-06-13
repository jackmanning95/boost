/*
  # Fix RLS infinite recursion between users and companies tables

  1. Problem Analysis
    - The `users` table has policies that check `companies` table
    - The `companies` table has policies that check `users` table
    - This creates circular dependency causing infinite recursion

  2. Solution
    - Simplify policies to use direct `auth.uid()` checks
    - Remove circular references between tables
    - Maintain security while eliminating recursion

  3. Changes
    - Drop existing problematic policies
    - Create new simplified policies
    - Ensure users can only access their own data and company data appropriately
*/

-- Drop existing problematic policies on users table
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can read profiles in their company" ON users;

-- Drop existing problematic policies on companies table  
DROP POLICY IF EXISTS "Authenticated users can read companies" ON companies;
DROP POLICY IF EXISTS "Only admins can insert companies" ON companies;
DROP POLICY IF EXISTS "Only admins can update companies" ON companies;

-- Create new simplified policies for users table
CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can read company members"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    -- Users can read profiles of users in the same company
    company_id IN (
      SELECT company_id 
      FROM users 
      WHERE id = auth.uid() 
      AND company_id IS NOT NULL
    )
  );

CREATE POLICY "Admins can read all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    -- Check if current user is admin by looking at their role directly
    EXISTS (
      SELECT 1 
      FROM auth.users au
      JOIN users u ON au.id = u.id
      WHERE au.id = auth.uid() 
      AND u.role = 'admin'
    )
  );

-- Create new simplified policies for companies table
CREATE POLICY "Users can read their company"
  ON companies
  FOR SELECT
  TO authenticated
  USING (
    -- Users can read their own company
    id IN (
      SELECT company_id 
      FROM users 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can read all companies"
  ON companies
  FOR SELECT
  TO authenticated
  USING (
    -- Check if current user is admin
    EXISTS (
      SELECT 1 
      FROM auth.users au
      JOIN users u ON au.id = u.id
      WHERE au.id = auth.uid() 
      AND u.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert companies"
  ON companies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM auth.users au
      JOIN users u ON au.id = u.id
      WHERE au.id = auth.uid() 
      AND u.role = 'admin'
    )
  );

CREATE POLICY "Admins can update companies"
  ON companies
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM auth.users au
      JOIN users u ON au.id = u.id
      WHERE au.id = auth.uid() 
      AND u.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM auth.users au
      JOIN users u ON au.id = u.id
      WHERE au.id = auth.uid() 
      AND u.role = 'admin'
    )
  );