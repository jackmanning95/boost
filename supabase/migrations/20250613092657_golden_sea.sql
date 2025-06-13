/*
  # Fix RLS Infinite Recursion

  This migration fixes the infinite recursion error in RLS policies by:
  1. Dropping problematic policies that create circular dependencies
  2. Creating simplified policies that avoid self-referencing joins
  3. Using conditional checks to avoid recreating existing objects

  ## Changes Made
  - Remove circular policy dependencies between users and companies tables
  - Simplify user access policies to use direct auth.uid() checks
  - Add conditional checks for existing triggers and functions
*/

-- Drop existing problematic policies that cause recursion
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Users can read company members" ON users;
DROP POLICY IF EXISTS "Users can read own profile and teammates" ON users;
DROP POLICY IF EXISTS "Admins can insert companies" ON companies;
DROP POLICY IF EXISTS "Admins can read all companies" ON companies;
DROP POLICY IF EXISTS "Admins can update companies" ON companies;
DROP POLICY IF EXISTS "Users can read their company" ON companies;

-- Create simplified policies for users table (no circular dependencies)
CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create simplified policies for companies table
CREATE POLICY "Authenticated users can read companies"
  ON companies
  FOR SELECT
  TO authenticated
  USING (true);

-- Only create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created' 
    AND tgrelid = 'users'::regclass
  ) THEN
    -- Create the trigger only if it doesn't exist
    CREATE TRIGGER on_auth_user_created
      BEFORE INSERT ON users
      FOR EACH ROW
      EXECUTE FUNCTION handle_new_user();
  END IF;
END $$;

-- Only create update trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_users_updated_at' 
    AND tgrelid = 'users'::regclass
  ) THEN
    CREATE TRIGGER update_users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Only create company update trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_companies_updated_at' 
    AND tgrelid = 'companies'::regclass
  ) THEN
    CREATE TRIGGER update_companies_updated_at
      BEFORE UPDATE ON companies
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;