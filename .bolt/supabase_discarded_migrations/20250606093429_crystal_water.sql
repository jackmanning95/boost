/*
  # Fix reserved keyword 'current_user' in SQL queries

  1. Changes
    - Replace 'current_user' alias with 'user_self' in campaign comments policy
    - Replace 'current_user' alias with 'user_self' in workflow history policy
    - Replace 'current_user' alias with 'user_self' in campaigns policy

  This fixes the syntax error caused by using the reserved keyword 'current_user' as a table alias.
*/

-- Drop and recreate campaign comments policies with correct alias
DROP POLICY IF EXISTS "Users can read comments for their company campaigns" ON campaign_comments;
CREATE POLICY "Users can read comments for their company campaigns"
  ON campaign_comments
  FOR SELECT
  TO authenticated
  USING (
    campaign_id IN (
      SELECT c.id FROM campaigns c
      JOIN users u ON c.client_id = u.id
      JOIN users user_self ON user_self.id = auth.uid()
      WHERE u.company_id = user_self.company_id
        OR user_self.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can create comments on their company campaigns" ON campaign_comments;
CREATE POLICY "Users can create comments on their company campaigns"
  ON campaign_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    campaign_id IN (
      SELECT c.id FROM campaigns c
      JOIN users u ON c.client_id = u.id
      JOIN users user_self ON user_self.id = auth.uid()
      WHERE u.company_id = user_self.company_id
        OR user_self.role = 'admin'
    )
  );

-- Drop and recreate workflow history policies with correct alias
DROP POLICY IF EXISTS "Users can read workflow history for their company campaigns" ON campaign_workflow_history;
CREATE POLICY "Users can read workflow history for their company campaigns"
  ON campaign_workflow_history
  FOR SELECT
  TO authenticated
  USING (
    campaign_id IN (
      SELECT c.id FROM campaigns c
      JOIN users u ON c.client_id = u.id
      JOIN users user_self ON user_self.id = auth.uid()
      WHERE u.company_id = user_self.company_id
        OR user_self.role = 'admin'
    )
  );

-- Drop and recreate campaigns policy with correct alias
DROP POLICY IF EXISTS "Users can read campaigns for their company" ON campaigns;
CREATE POLICY "Users can read campaigns for their company"
  ON campaigns
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT u.id FROM users u
      JOIN users user_self ON user_self.id = auth.uid()
      WHERE u.company_id = user_self.company_id
    ) OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );