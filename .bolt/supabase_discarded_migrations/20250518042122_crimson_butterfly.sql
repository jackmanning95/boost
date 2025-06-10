/*
  # Add sign-up functionality

  1. Changes
    - Add email confirmation settings
    - Add sign-up trigger for user creation
*/

-- Disable email confirmation by default
ALTER TABLE auth.users
ALTER COLUMN email_confirmed_at
SET DEFAULT now();

-- Create a trigger to automatically confirm email on sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET email_confirmed_at = now()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();