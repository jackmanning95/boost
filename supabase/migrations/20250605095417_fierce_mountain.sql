/*
  # Safe User Policies Migration

  1. Changes
    - Safely check and drop existing policies
    - Create users table if not exists
    - Add policies with proper checks
    - Add trigger for updated_at
*/

-- Safely check and drop existing policies
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'Users can read own data'
  ) THEN
    DROP POLICY "Users can read own data" ON public.users;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'Users can update own data'
  ) THEN
    DROP POLICY "Users can update own data" ON public.users;
  END IF;
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

-- Create updated_at trigger if it doesn't exist
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