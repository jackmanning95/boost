/*
  # Fix Campaign Activity Log RLS Policy

  1. Security Updates
    - Update RLS policy for campaign_activity_log table to allow proper insertions
    - Allow admins to insert activity logs for any campaign
    - Allow users to insert activity logs for their own campaigns
    - Ensure trigger functions can properly insert activity logs

  2. Changes
    - Drop existing restrictive INSERT policy
    - Create new INSERT policy that allows:
      - Users to insert logs for campaigns they own
      - Admins to insert logs for any campaign
      - System triggers to insert logs (by checking if user_id matches auth.uid())
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
      JOIN users client_user ON c.client_id = client_user.id
      JOIN users current_user ON current_user.id = auth.uid()
      WHERE client_user.company_id = current_user.company_id
      AND current_user.company_id IS NOT NULL
    ))
  );