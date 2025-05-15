/*
  # Add users and audiences tables

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `name` (text)
      - `role` (text)
      - `company_name` (text)
      - `platform_ids` (jsonb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `audiences`
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

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'client',
  company_name text,
  platform_ids jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_role CHECK (role IN ('admin', 'client'))
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can read and update their own data
CREATE POLICY "Users can read own data"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Audiences table
CREATE TABLE IF NOT EXISTS public.audiences (
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

ALTER TABLE public.audiences ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read audiences
CREATE POLICY "Authenticated users can read audiences"
  ON public.audiences
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify audiences
CREATE POLICY "Admins can insert audiences"
  ON public.audiences
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update audiences"
  ON public.audiences
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS audiences_category_idx ON public.audiences (category);
CREATE INDEX IF NOT EXISTS audiences_data_supplier_idx ON public.audiences (data_supplier);
CREATE INDEX IF NOT EXISTS audiences_search_idx ON public.audiences USING gin (
  to_tsvector('english',
    coalesce(name, '') || ' ' ||
    coalesce(description, '') || ' ' ||
    coalesce(category, '') || ' ' ||
    coalesce(subcategory, '') || ' ' ||
    coalesce(data_supplier, '')
  )
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to update the updated_at column
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audiences_updated_at
  BEFORE UPDATE ON public.audiences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();