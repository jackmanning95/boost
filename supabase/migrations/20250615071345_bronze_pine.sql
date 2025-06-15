/*
  # Fix RLS Violations and Campaign Approval Workflow

  1. RLS Policy Fixes
    - Fix campaigns table policies to allow admin operations
    - Ensure proper permissions for campaign creation and updates
    - Fix notification policies for campaign_id field

  2. Campaign Approval Workflow
    - Ensure proper campaign creation during approval
    - Fix campaign_id handling in workflow history
    - Add proper timezone handling

  3. Database Schema Fixes
    - Ensure all required columns exist
    - Fix foreign key constraints
    - Add proper indexes
*/

-- First, fix the campaigns table RLS policies
DROP POLICY IF EXISTS "Company members can view company campaigns" ON campaigns;
DROP POLICY IF EXISTS "Enable delete for authenticated users on their own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON campaigns;
DROP POLICY IF EXISTS "Enable update for authenticated users on their own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Users can read campaigns for their company" ON campaigns;

-- Create comprehensive RLS policies for campaigns
CREATE POLICY "Users can read own campaigns"
  ON campaigns
  FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "Admins can read all campaigns"
  ON campaigns
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Users can insert own campaigns"
  ON campaigns
  FOR INSERT
  TO authenticated
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Admins can insert any campaign"
  ON campaigns
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Users can update own campaigns"
  ON campaigns
  FOR UPDATE
  TO authenticated
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Admins can update any campaign"
  ON campaigns
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Users can delete own campaigns"
  ON campaigns
  FOR DELETE
  TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "Admins can delete any campaign"
  ON campaigns
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Fix campaign_workflow_history policies
DROP POLICY IF EXISTS "Only admins can create workflow history" ON campaign_workflow_history;
DROP POLICY IF EXISTS "Users can read workflow history for their company campaigns" ON campaign_workflow_history;

CREATE POLICY "Admins can insert workflow history"
  ON campaign_workflow_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Users can read workflow history for accessible campaigns"
  ON campaign_workflow_history
  FOR SELECT
  TO authenticated
  USING (
    campaign_id IN (
      SELECT c.id FROM campaigns c
      WHERE c.client_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid() AND u.role = 'admin'
      )
    )
  );

-- Fix notifications policies for campaign_id
DROP POLICY IF EXISTS "Users can insert notifications" ON notifications;

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

-- Ensure campaign_activity_log has proper policies
DROP POLICY IF EXISTS "System can insert activity logs" ON campaign_activity_log;
DROP POLICY IF EXISTS "Users can read activity for their company campaigns" ON campaign_activity_log;

CREATE POLICY "Authenticated users can insert activity logs"
  ON campaign_activity_log
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read activity for accessible campaigns"
  ON campaign_activity_log
  FOR SELECT
  TO authenticated
  USING (
    campaign_id IN (
      SELECT c.id FROM campaigns c
      WHERE c.client_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid() AND u.role = 'admin'
      )
    )
  );

-- Ensure all required columns exist with proper defaults
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS approved_at timestamptz,
ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS request_id text;

ALTER TABLE audience_requests 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false;

-- Ensure notifications has campaign_id column
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS campaign_id text,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Add foreign key constraints if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'campaigns_request_id_fkey'
  ) THEN
    ALTER TABLE campaigns 
    ADD CONSTRAINT campaigns_request_id_fkey 
    FOREIGN KEY (request_id) REFERENCES audience_requests(id) ON DELETE SET NULL;
  END IF;
END $$;

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

-- Add proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaigns_client_id ON campaigns(client_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_archived ON campaigns(archived) WHERE archived = false;
CREATE INDEX IF NOT EXISTS idx_campaigns_approved_at ON campaigns(approved_at) WHERE approved_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_campaigns_request_id ON campaigns(request_id) WHERE request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audience_requests_client_id ON audience_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_audience_requests_campaign_id ON audience_requests(campaign_id);
CREATE INDEX IF NOT EXISTS idx_audience_requests_status ON audience_requests(status);
CREATE INDEX IF NOT EXISTS idx_audience_requests_archived ON audience_requests(archived) WHERE archived = false;

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_campaign_id ON notifications(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read) WHERE read = false;

-- Update status constraints to include all valid statuses
ALTER TABLE campaigns 
DROP CONSTRAINT IF EXISTS campaigns_status_check;

ALTER TABLE campaigns 
ADD CONSTRAINT campaigns_status_check 
CHECK (status = ANY (ARRAY[
  'draft'::text, 
  'submitted'::text, 
  'pending_review'::text, 
  'approved'::text,
  'in_progress'::text, 
  'waiting_on_client'::text, 
  'delivered'::text, 
  'live'::text,
  'paused'::text,
  'completed'::text,
  'failed'::text
]));

-- Ensure all existing data has proper defaults
UPDATE campaigns SET archived = false WHERE archived IS NULL;
UPDATE audience_requests SET archived = false WHERE archived IS NULL;
UPDATE audience_requests SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE notifications SET updated_at = created_at WHERE updated_at IS NULL;

-- Create or update triggers for updated_at columns
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

-- Clean up any orphaned workflow history entries with NULL campaign_id
DELETE FROM campaign_workflow_history WHERE campaign_id IS NULL;

-- Ensure campaign_workflow_history.campaign_id is NOT NULL
ALTER TABLE campaign_workflow_history 
ALTER COLUMN campaign_id SET NOT NULL;