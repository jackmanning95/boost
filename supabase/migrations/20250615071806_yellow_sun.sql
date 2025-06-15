/*
  # Fix Campaign ID Generation and Approval Flow

  1. Database Schema Fixes
    - Ensure campaigns.id has proper UUID default generation
    - Fix foreign key relationships
    - Clean up any existing NULL data

  2. RLS Policy Updates
    - Ensure proper permissions for campaign creation
    - Fix notification policies for campaign_id field

  3. Data Integrity
    - Clean up any orphaned records
    - Ensure all required fields have proper defaults
*/

-- First, ensure campaigns.id has proper UUID generation
ALTER TABLE campaigns 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Ensure all other tables with UUID primary keys have proper defaults
ALTER TABLE users 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE companies 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE notifications 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE campaign_comments 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE campaign_workflow_history 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE campaign_activity_log 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE advertiser_accounts 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE audiences 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Clean up any existing NULL campaign_id entries in workflow history
DELETE FROM campaign_workflow_history WHERE campaign_id IS NULL;

-- Clean up any existing NULL campaign_id entries in activity log
DELETE FROM campaign_activity_log WHERE campaign_id IS NULL;

-- Ensure campaign_workflow_history.campaign_id is NOT NULL
ALTER TABLE campaign_workflow_history 
ALTER COLUMN campaign_id SET NOT NULL;

-- Ensure campaign_activity_log.campaign_id is NOT NULL
ALTER TABLE campaign_activity_log 
ALTER COLUMN campaign_id SET NOT NULL;

-- Update audience_requests policies to be more permissive for the approval flow
DROP POLICY IF EXISTS "Enable delete for authenticated users on their own requests" ON audience_requests;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON audience_requests;
DROP POLICY IF EXISTS "Enable read access for all users" ON audience_requests;
DROP POLICY IF EXISTS "Enable update for authenticated users on their own requests" ON audience_requests;

-- Create proper RLS policies for audience_requests
CREATE POLICY "Users can read own requests"
  ON audience_requests
  FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "Admins can read all requests"
  ON audience_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Users can insert own requests"
  ON audience_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Users can update own requests"
  ON audience_requests
  FOR UPDATE
  TO authenticated
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Admins can update any request"
  ON audience_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Users can delete own requests"
  ON audience_requests
  FOR DELETE
  TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "Admins can delete any request"
  ON audience_requests
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Ensure notifications table has proper structure and policies
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS campaign_id text,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Update notifications policies to handle campaign_id properly
DROP POLICY IF EXISTS "Users can insert own notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can insert any notifications" ON notifications;

CREATE POLICY "Users can insert own notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can insert any notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Add foreign key constraint for notifications.campaign_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'notifications_campaign_id_fkey'
  ) THEN
    ALTER TABLE notifications 
    ADD CONSTRAINT notifications_campaign_id_fkey 
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Ensure all required indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_campaigns_client_id ON campaigns(client_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_request_id ON campaigns(request_id) WHERE request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audience_requests_client_id ON audience_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_audience_requests_campaign_id ON audience_requests(campaign_id);
CREATE INDEX IF NOT EXISTS idx_audience_requests_status ON audience_requests(status);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_campaign_id ON notifications(campaign_id) WHERE campaign_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_campaign_workflow_history_campaign_id ON campaign_workflow_history(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_activity_log_campaign_id ON campaign_activity_log(campaign_id);

-- Update any existing data to have proper defaults
UPDATE campaigns SET archived = false WHERE archived IS NULL;
UPDATE audience_requests SET archived = false WHERE archived IS NULL;
UPDATE audience_requests SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE notifications SET updated_at = created_at WHERE updated_at IS NULL;

-- Ensure all triggers exist for updated_at columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_campaigns_updated_at' 
    AND tgrelid = 'campaigns'::regclass
  ) THEN
    CREATE TRIGGER update_campaigns_updated_at
      BEFORE UPDATE ON campaigns
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_audience_requests_updated_at' 
    AND tgrelid = 'audience_requests'::regclass
  ) THEN
    CREATE TRIGGER update_audience_requests_updated_at
      BEFORE UPDATE ON audience_requests
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_notifications_updated_at' 
    AND tgrelid = 'notifications'::regclass
  ) THEN
    CREATE TRIGGER update_notifications_updated_at
      BEFORE UPDATE ON notifications
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;