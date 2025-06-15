-- Add updated_at column to audience_requests table
ALTER TABLE audience_requests 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Update existing rows to have the updated_at value
UPDATE audience_requests 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- Create trigger to automatically update updated_at on changes
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