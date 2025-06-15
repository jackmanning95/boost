/*
  # Fix Campaign Activity Log RLS Policy

  1. Security Changes
    - Update INSERT policy to allow admins and campaign owners
    - Update SELECT policy to allow proper access control
    - Fix table alias conflicts with PostgreSQL reserved words

  2. Changes Made
    - Drop existing restrictive policies
    - Create comprehensive policies for INSERT and SELECT
    - Use proper table aliases that don't conflict with PostgreSQL functions
*/

-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can insert activity logs" ON campaign_activity_log;

-- Create a new, more permissive INSERT policy
CREATE POLICY "Users and admins can insert activity logs"
  ON campaign_activity_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if user_id matches the authenticated user
    (user_id = auth.uid()) 
    OR 
    -- Allow if user is admin
    (EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    ))
    OR
    -- Allow if inserting for a campaign the user owns
    (EXISTS (
      SELECT 1 FROM campaigns 
      WHERE campaigns.id = campaign_activity_log.campaign_id 
      AND campaigns.client_id = auth.uid()
    ))
  );

-- Also ensure the SELECT policy is comprehensive
DROP POLICY IF EXISTS "Users can read activity for accessible campaigns" ON campaign_activity_log;

CREATE POLICY "Users can read activity for accessible campaigns"
  ON campaign_activity_log
  FOR SELECT
  TO authenticated
  USING (
    -- Campaign owner can read
    (campaign_id IN (
      SELECT c.id FROM campaigns c 
      WHERE c.client_id = auth.uid()
    ))
    OR
    -- Admins can read all
    (EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
    ))
    OR
    -- Team members can read company campaigns
    (campaign_id IN (
      SELECT c.id FROM campaigns c
      JOIN users client_u ON c.client_id = client_u.id
      JOIN users auth_u ON auth_u.id = auth.uid()
      WHERE client_u.company_id = auth_u.company_id
      AND auth_u.company_id IS NOT NULL
    ))
  );