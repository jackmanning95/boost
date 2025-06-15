/*
  # Add archived column to audience_requests table

  1. Changes
    - Add `archived` boolean column to audience_requests table
    - Set default value to false
    - Add index for performance when filtering archived requests

  2. Security
    - No changes to RLS policies needed
*/

-- Add archived column to audience_requests table
ALTER TABLE audience_requests 
ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false;

-- Add index for filtering archived requests
CREATE INDEX IF NOT EXISTS idx_audience_requests_archived 
ON audience_requests(archived) 
WHERE archived = false;

-- Update existing requests to not be archived
UPDATE audience_requests 
SET archived = false 
WHERE archived IS NULL;