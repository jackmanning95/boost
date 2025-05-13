/*
  # Create audiences table for taxonomy data

  1. New Tables
    - `audiences`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `description` (text)
      - `category` (text, not null)
      - `subcategory` (text)
      - `tags` (text array)
      - `reach` (bigint)
      - `cpm` (numeric(10,2))
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `audiences` table
    - Add policy for authenticated users to read audience data
*/

CREATE TABLE IF NOT EXISTS audiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL,
  subcategory text,
  tags text[],
  reach bigint,
  cpm numeric(10,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE audiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read audiences"
  ON audiences
  FOR SELECT
  TO authenticated
  USING (true);

-- Create an index on commonly searched fields
CREATE INDEX IF NOT EXISTS audiences_search_idx ON audiences USING GIN (
  to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || category || ' ' || COALESCE(subcategory, ''))
);

-- Create indexes for filtering
CREATE INDEX IF NOT EXISTS audiences_category_idx ON audiences (category);
CREATE INDEX IF NOT EXISTS audiences_subcategory_idx ON audiences (subcategory);
CREATE INDEX IF NOT EXISTS audiences_cpm_idx ON audiences (cpm);