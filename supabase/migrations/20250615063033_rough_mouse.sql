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