/*
  # Campaign Status Enhancement Migration

  1. New Status Values
    - Add 'approved', 'live', 'paused' to campaign status enum
    - Add approved_at timestamp for tracking approval time

  2. Enhanced Workflow
    - Update status constraints to include new values
    - Add approved_at column for better tracking

  3. Data Integrity
    - Ensure existing data remains valid
    - Add indexes for performance
*/

-- Add approved_at column to campaigns table
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- Update the status check constraint to include new statuses
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

-- Add index on approved_at for performance
CREATE INDEX IF NOT EXISTS idx_campaigns_approved_at 
ON campaigns(approved_at) 
WHERE approved_at IS NOT NULL;

-- Add index on status for filtering
CREATE INDEX IF NOT EXISTS idx_campaigns_status 
ON campaigns(status);

-- Update any existing 'active' status to 'in_progress' for consistency
UPDATE campaigns 
SET status = 'in_progress' 
WHERE status = 'active';