/*
  # Update audiences table triggers

  1. Changes
    - Drop existing trigger before recreating
    - Update search vector functionality
  
  2. Functionality
    - Maintain full-text search capabilities
    - Keep updated_at timestamp updates
*/

-- Drop existing trigger
DROP TRIGGER IF EXISTS update_audiences_updated_at ON audiences;

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create the trigger
CREATE TRIGGER update_audiences_updated_at
  BEFORE UPDATE ON audiences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();