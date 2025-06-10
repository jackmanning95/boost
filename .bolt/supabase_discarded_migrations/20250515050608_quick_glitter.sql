/*
  # Migrate data from '15 may' table to new audiences table

  1. Changes
    - Create new audiences table with improved schema
    - Migrate existing data from '15 may' table
    - Add indexes for better query performance
    - Enable RLS with appropriate policies

  2. Security
    - Enable RLS on audiences table
    - Add policies for authenticated users
*/

-- Create audiences table with improved schema
CREATE TABLE IF NOT EXISTS audiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL,
  subcategory text,
  data_supplier text,
  tags text[] DEFAULT ARRAY[]::text[],
  reach bigint,
  cpm numeric(10,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS audiences_category_idx ON audiences USING btree (category);
CREATE INDEX IF NOT EXISTS audiences_data_supplier_idx ON audiences USING btree (data_supplier);
CREATE INDEX IF NOT EXISTS audiences_search_idx ON audiences USING gin (
  to_tsvector('english', 
    coalesce(name, '') || ' ' || 
    coalesce(description, '') || ' ' || 
    coalesce(category, '') || ' ' || 
    coalesce(subcategory, '') || ' ' || 
    coalesce(data_supplier, '')
  )
);

-- Migrate data from '15 may' table
INSERT INTO audiences (name, description, category, data_supplier, reach, cpm)
SELECT 
  segment_name,
  segment_description,
  COALESCE(
    NULLIF(regexp_replace(data_supplier, '/.*$', ''), ''),
    'Other'
  ) as category,
  data_supplier,
  estimated_volumes,
  NULLIF(regexp_replace(boost_cpm, '[^0-9.]', '', 'g'), '')::numeric
FROM "15 may"
ON CONFLICT (id) DO UPDATE
SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  data_supplier = EXCLUDED.data_supplier,
  reach = EXCLUDED.reach,
  cpm = EXCLUDED.cpm,
  updated_at = now();

-- Enable RLS
ALTER TABLE audiences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
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

-- Create updated_at trigger
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