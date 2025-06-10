/*
  # Create audiences table with search functionality

  1. New Tables
    - `audiences` table for storing audience segments
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `category` (text)
      - `subcategory` (text)
      - `data_supplier` (text)
      - `tags` (text[])
      - `reach` (integer)
      - `cpm` (numeric)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `search_vector` (tsvector) for full-text search

  2. Security
    - Enable RLS on `audiences` table
    - Add policies for authenticated users to read audiences
    - Add policies for admins to insert/update audiences

  3. Indexes
    - Create indexes for category and data_supplier columns
    - Create GIN index for search_vector
*/

-- Create the audiences table first without the generated column
CREATE TABLE IF NOT EXISTS audiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL,
  subcategory text,
  data_supplier text,
  tags text[] DEFAULT ARRAY[]::text[],
  reach integer,
  cpm numeric(10,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add the search_vector column separately
ALTER TABLE audiences ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create a function to update the search vector
CREATE OR REPLACE FUNCTION audiences_update_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector('english',
      coalesce(NEW.name, '') || ' ' ||
      coalesce(NEW.description, '') || ' ' ||
      coalesce(NEW.category, '') || ' ' ||
      coalesce(NEW.subcategory, '') || ' ' ||
      coalesce(NEW.data_supplier, '')
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update search_vector on INSERT or UPDATE
DROP TRIGGER IF EXISTS audiences_vector_update ON audiences;
CREATE TRIGGER audiences_vector_update
  BEFORE INSERT OR UPDATE ON audiences
  FOR EACH ROW
  EXECUTE FUNCTION audiences_update_search_vector();

-- Create indexes
CREATE INDEX IF NOT EXISTS audiences_category_idx ON audiences(category);
CREATE INDEX IF NOT EXISTS audiences_data_supplier_idx ON audiences(data_supplier);
CREATE INDEX IF NOT EXISTS audiences_search_vector_idx ON audiences USING gin(search_vector);

-- Enable Row Level Security
ALTER TABLE audiences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can read audiences" ON audiences;
DROP POLICY IF EXISTS "Only admins can insert audiences" ON audiences;
DROP POLICY IF EXISTS "Only admins can update audiences" ON audiences;

-- Create policies
CREATE POLICY "Authenticated users can read audiences"
  ON audiences
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert audiences"
  ON audiences
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update audiences"
  ON audiences
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Create trigger for updating the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_audiences_updated_at
  BEFORE UPDATE ON audiences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();