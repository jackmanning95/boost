/*
  # Create audiences table and security policies

  1. New Tables
    - `audiences`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `description` (text)
      - `category` (text, not null)
      - `subcategory` (text)
      - `data_supplier` (text)
      - `tags` (text array)
      - `reach` (integer)
      - `cpm` (numeric(10,2))
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Indexes
    - Category index for faster category filtering
    - Data supplier index for supplier filtering
    - Full-text search index on name, description, category, subcategory, and data_supplier
    
  3. Security
    - Enable RLS
    - Allow authenticated users to read audiences
    - Only allow admins to insert/update audiences
*/

-- Create the audiences table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS audiences_category_idx ON audiences(category);
CREATE INDEX IF NOT EXISTS audiences_data_supplier_idx ON audiences(data_supplier);
CREATE INDEX IF NOT EXISTS audiences_search_idx ON audiences USING gin(
  to_tsvector('english',
    coalesce(name, '') || ' ' ||
    coalesce(description, '') || ' ' ||
    coalesce(category, '') || ' ' ||
    coalesce(subcategory, '') || ' ' ||
    coalesce(data_supplier, '')
  )
);

-- Enable Row Level Security
ALTER TABLE audiences ENABLE ROW LEVEL SECURITY;

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
CREATE TRIGGER update_audiences_updated_at
  BEFORE UPDATE ON audiences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();