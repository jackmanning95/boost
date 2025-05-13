/*
  # Create taxonomy table

  1. New Tables
    - `taxonomy`
      - `Segment Name` (text, primary key component)
      - `Data Supplier` (text, primary key component)
      - `Estimated US Volumes` (text, primary key component)
      - `Boost CPM` (text, primary key component)
      - `Segment Description` (text, primary key component)

  2. Security
    - Enable RLS on `taxonomy` table
    - Add policy for authenticated users to read taxonomy data
*/

-- Create the taxonomy table
CREATE TABLE IF NOT EXISTS public.taxonomy (
  "Segment Name" text NOT NULL,
  "Data Supplier" text NOT NULL,
  "Estimated US Volumes" text NOT NULL,
  "Boost CPM" text NOT NULL,
  "Segment Description" text NOT NULL,
  PRIMARY KEY ("Segment Name", "Data Supplier", "Estimated US Volumes", "Boost CPM", "Segment Description")
);

-- Enable Row Level Security
ALTER TABLE public.taxonomy ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read taxonomy data
CREATE POLICY "Allow authenticated users to read taxonomy"
  ON public.taxonomy
  FOR SELECT
  TO authenticated
  USING (true);