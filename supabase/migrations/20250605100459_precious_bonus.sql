/*
  # Safe User Policies Migration

  1. Changes
    - Safe policy drops with exception handling
    - Create users table if not exists
    - Enable RLS and create policies
    - Add trigger for updated_at
*/

-- Create or replace the trigger function first
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Safely drop existing policies with exception handling
DO $$
BEGIN
  BEGIN
    DROP POLICY IF EXISTS "Users can read own data" ON public.users;
  EXCEPTION WHEN undefined_object THEN
    RAISE NOTICE 'Policy "Users can read own data" did not exist';
  END;

  BEGIN
    DROP POLICY IF EXISTS "Users can update own data" ON public.users;
  EXCEPTION WHEN undefined_object THEN
    RAISE NOTICE 'Policy "Users can update own data" did not exist';
  END;
END
$$;

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'client'::text,
  company_name text,
  platform_ids jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_role CHECK (role = ANY (ARRAY['admin'::text, 'client'::text]))
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policies with explicit schema reference
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

-- Safely create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_users_updated_at'
      AND tgrelid = 'public.users'::regclass
  ) THEN
    CREATE TRIGGER update_users_updated_at
      BEFORE UPDATE ON public.users
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;