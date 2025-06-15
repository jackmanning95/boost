/*
  # Fix Campaign ID Generation and Approval Flow

  1. Database Schema Fixes
    - Ensure all UUID columns have proper gen_random_uuid() defaults
    - Clean up orphaned data with NULL campaign_ids
    - Add proper NOT NULL constraints

  2. RLS Policy Fixes
    - Ensure admins can create and manage campaigns during approval
    - Fix notification policies for campaign_id references

  3. Data Integrity
    - Clean up any existing NULL values
    - Ensure proper foreign key relationships
*/

-- CRITICAL FIX 1: Ensure all UUID primary keys have auto-generation
ALTER TABLE campaigns ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE companies ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE notifications ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE campaign_comments ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE campaign_workflow_history ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE campaign_activity_log ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE advertiser_accounts ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE audiences ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- CRITICAL FIX 2: Clean up orphaned data that causes constraint violations
DELETE FROM campaign_workflow_history WHERE campaign_id IS NULL;
DELETE FROM campaign_activity_log WHERE campaign_id IS NULL;

-- CRITICAL FIX 3: Ensure NOT NULL constraints are properly set
ALTER TABLE campaign_workflow_history ALTER COLUMN campaign_id SET NOT NULL;
ALTER TABLE campaign_activity_log ALTER COLUMN campaign_id SET NOT NULL;

-- CRITICAL FIX 4: Ensure campaigns table has all required columns
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS approved_at timestamptz,
ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS request_id text;

-- CRITICAL FIX 5: Ensure audience_requests has all required columns
ALTER TABLE audience_requests 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false;

-- CRITICAL FIX 6: Ensure notifications has campaign_id column
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS campaign_id text,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- CRITICAL FIX 7: Add foreign key constraints if missing
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

-- CRITICAL FIX 8: Update campaign status constraints to include all valid statuses
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;
ALTER TABLE campaigns ADD CONSTRAINT campaigns_status_check 
CHECK (status = ANY (ARRAY[
  'draft'::text, 'submitted'::text, 'pending_review'::text, 'approved'::text,
  'in_progress'::text, 'waiting_on_client'::text, 'delivered'::text, 
  'live'::text, 'paused'::text, 'completed'::text, 'failed'::text
]));

-- CRITICAL FIX 9: Ensure all existing data has proper defaults
UPDATE campaigns SET archived = false WHERE archived IS NULL;
UPDATE audience_requests SET archived = false WHERE archived IS NULL;
UPDATE audience_requests SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE notifications SET updated_at = created_at WHERE updated_at IS NULL;

-- CRITICAL FIX 10: Create proper RLS policies for campaign approval flow
DROP POLICY IF EXISTS "Users can read own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Admins can read all campaigns" ON campaigns;
DROP POLICY IF EXISTS "Users can insert own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Admins can insert any campaign" ON campaigns;
DROP POLICY IF EXISTS "Users can update own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Admins can update any campaign" ON campaigns;
DROP POLICY IF EXISTS "Users can delete own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Admins can delete any campaign" ON campaigns;

-- Create comprehensive RLS policies for campaigns
CREATE POLICY "Users can read own campaigns"
  ON campaigns FOR SELECT TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "Admins can read all campaigns"
  ON campaigns FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

CREATE POLICY "Users can insert own campaigns"
  ON campaigns FOR INSERT TO authenticated
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Admins can insert any campaign"
  ON campaigns FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

CREATE POLICY "Users can update own campaigns"
  ON campaigns FOR UPDATE TO authenticated
  USING (client_id = auth.uid()) WITH CHECK (client_id = auth.uid());

CREATE POLICY "Admins can update any campaign"
  ON campaigns FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

CREATE POLICY "Users can delete own campaigns"
  ON campaigns FOR DELETE TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "Admins can delete any campaign"
  ON campaigns FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

-- CRITICAL FIX 11: Fix notification policies for campaign_id
DROP POLICY IF EXISTS "Users can insert own notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can insert any notifications" ON notifications;

CREATE POLICY "Users can insert own notifications"
  ON notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can insert any notifications"
  ON notifications FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

-- CRITICAL FIX 12: Add performance indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_client_id ON campaigns(client_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_request_id ON campaigns(request_id) WHERE request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audience_requests_client_id ON audience_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_audience_requests_campaign_id ON audience_requests(campaign_id);
CREATE INDEX IF NOT EXISTS idx_notifications_campaign_id ON notifications(campaign_id) WHERE campaign_id IS NOT NULL;

-- CRITICAL FIX 13: Ensure updated_at triggers exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_campaigns_updated_at' AND tgrelid = 'campaigns'::regclass) THEN
    CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_audience_requests_updated_at' AND tgrelid = 'audience_requests'::regclass) THEN
    CREATE TRIGGER update_audience_requests_updated_at BEFORE UPDATE ON audience_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_notifications_updated_at' AND tgrelid = 'notifications'::regclass) THEN
    CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;