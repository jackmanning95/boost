/*
  # Fix audiences table and policies

  1. Changes
    - Drop existing policies before recreating them
    - Ensure clean policy creation
  
  2. Security
    - Maintain RLS policies for authenticated users
    - Admin-only insert/update restrictions
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can read audiences" ON audiences;
DROP POLICY IF EXISTS "Only admins can insert audiences" ON audiences;
DROP POLICY IF EXISTS "Only admins can update audiences" ON audiences;

-- Create policies
CREATE POLICY "Authenticated users can read audiences"
  ON audiences
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert audiences"
  ON audiences
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update audiences"
  ON audiences
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );