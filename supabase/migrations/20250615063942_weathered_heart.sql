/*
  # Add archived column to campaigns table

  1. New Columns
    - `archived` (boolean, default false) - for soft delete functionality

  2. Indexes
    - Add index for filtering non-archived campaigns

  3. Updates
    - Set existing campaigns to not be archived
*/

-- Add archived column to campaigns table
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false;

-- Add index for filtering archived campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_archived 
ON campaigns(archived) 
WHERE archived = false;

-- Update existing campaigns to not be archived
UPDATE campaigns 
SET archived = false 
WHERE archived IS NULL;