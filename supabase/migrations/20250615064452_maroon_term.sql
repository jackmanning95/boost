/*
  # Fix Notifications Schema and Campaign Workflow

  1. Schema Updates
    - Add campaign_id column to notifications table
    - Update constraints and indexes
    - Fix foreign key relationships

  2. Workflow Fixes
    - Ensure proper campaign_id handling in workflow history
    - Add proper constraints and validation

  3. Timezone Support
    - Add timezone tracking for users
    - Update timestamp handling
*/

-- Add campaign_id column to notifications table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'campaign_id'
  ) THEN
    ALTER TABLE notifications ADD COLUMN campaign_id text;
  END IF;
END $$;

-- Add foreign key constraint for campaign_id in notifications
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

-- Add index for campaign_id in notifications
CREATE INDEX IF NOT EXISTS idx_notifications_campaign_id 
ON notifications(campaign_id) 
WHERE campaign_id IS NOT NULL;

-- Add timezone column to users table for proper timestamp handling
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'timezone'
  ) THEN
    ALTER TABLE users ADD COLUMN timezone text DEFAULT 'UTC';
  END IF;
END $$;

-- Update users table to have default timezone
UPDATE users 
SET timezone = 'UTC' 
WHERE timezone IS NULL;

-- Ensure campaign_workflow_history has proper NOT NULL constraint on campaign_id
-- First, clean up any existing NULL values
DELETE FROM campaign_workflow_history WHERE campaign_id IS NULL;

-- Then ensure the constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaign_workflow_history' 
    AND column_name = 'campaign_id' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE campaign_workflow_history 
    ALTER COLUMN campaign_id SET NOT NULL;
  END IF;
END $$;

-- Add proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaign_workflow_history_campaign_id 
ON campaign_workflow_history(campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_workflow_history_created_at 
ON campaign_workflow_history(created_at DESC);

-- Add request_id column to campaigns table to link back to the original request
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'request_id'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN request_id text;
  END IF;
END $$;

-- Add foreign key constraint for request_id in campaigns
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

-- Create function to handle timezone-aware timestamps
CREATE OR REPLACE FUNCTION get_user_timestamp(user_timezone text DEFAULT 'UTC')
RETURNS timestamptz AS $$
BEGIN
  RETURN now() AT TIME ZONE user_timezone;
END;
$$ LANGUAGE plpgsql;

-- Create function to format timestamp for user's timezone
CREATE OR REPLACE FUNCTION format_user_timestamp(ts timestamptz, user_timezone text DEFAULT 'UTC')
RETURNS text AS $$
BEGIN
  RETURN to_char(ts AT TIME ZONE user_timezone, 'YYYY-MM-DD HH24:MI:SS TZ');
END;
$$ LANGUAGE plpgsql;

-- Update notification policies to handle campaign_id properly
DROP POLICY IF EXISTS "Users can insert notifications" ON notifications;
CREATE POLICY "Users can insert notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (user_id = auth.uid()) OR 
    (EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    ))
  );

-- Ensure all tables have proper updated_at triggers
DO $$
BEGIN
  -- Notifications table
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_notifications_updated_at' 
    AND tgrelid = 'notifications'::regclass
  ) THEN
    ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
    CREATE TRIGGER update_notifications_updated_at
      BEFORE UPDATE ON notifications
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;