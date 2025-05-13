/*
  # Fix taxonomy table structure

  1. Changes
    - Drop existing taxonomy table
    - Create new boost_taxo table with proper column types
    - Enable RLS and add policies

  2. Security
    - Enable RLS on boost_taxo table
    - Add policy for authenticated users to read data
*/

DROP TABLE IF EXISTS public.taxonomy;

CREATE TABLE IF NOT EXISTS public.boost_taxo (
  segment_name text PRIMARY KEY,
  data_supplier text,
  estimated_volumes integer,
  boost_cpm numeric(10,2),
  segment_description text
);

ALTER TABLE public.boost_taxo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read boost_taxo"
  ON public.boost_taxo
  FOR SELECT
  TO authenticated
  USING (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS boost_taxo_data_supplier_idx ON public.boost_taxo (data_supplier);
CREATE INDEX IF NOT EXISTS boost_taxo_search_idx ON public.boost_taxo USING gin (
  to_tsvector('english', 
    coalesce(segment_name, '') || ' ' || 
    coalesce(segment_description, '') || ' ' || 
    coalesce(data_supplier, '')
  )
);