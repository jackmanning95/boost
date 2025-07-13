/*
  # Add Google OAuth Support

  1. Configuration
    - Adds necessary configuration for Google OAuth provider
    - Ensures proper user profile handling for OAuth logins

  2. Triggers
    - Updates the handle_new_user_with_company trigger to handle OAuth users
    - Extracts user information from OAuth metadata
*/

-- Update the handle_new_user_with_company function to handle OAuth users
CREATE OR REPLACE FUNCTION public.handle_new_user_with_company()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
  user_email TEXT;
  user_company_id UUID;
  is_super_admin BOOLEAN;
BEGIN
  -- Get email from auth.users
  SELECT email INTO user_email FROM auth.users WHERE id = NEW.id;
  
  -- Check if user is from Boost domain (super admin)
  is_super_admin := user_email LIKE '%@boostdata.io';
  
  -- Get name from user_metadata or raw_user_meta_data for OAuth users
  IF NEW.raw_user_meta_data->>'name' IS NOT NULL THEN
    -- OAuth user (Google)
    user_name := NEW.raw_user_meta_data->>'name';
  ELSIF NEW.raw_user_meta_data->>'full_name' IS NOT NULL THEN
    -- OAuth user (other providers)
    user_name := NEW.raw_user_meta_data->>'full_name';
  ELSE
    -- Email/password user
    user_name := NEW.raw_user_meta_data->>'name';
    
    -- Fallback to email username if no name provided
    IF user_name IS NULL OR user_name = '' THEN
      user_name := split_part(user_email, '@', 1);
    END IF;
  END IF;
  
  -- Get company_id from user_metadata if available
  user_company_id := (NEW.raw_user_meta_data->>'company_id')::UUID;
  
  -- Insert the user profile
  INSERT INTO public.users (
    id,
    email,
    name,
    role,
    company_id,
    platform_ids,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    user_email,
    user_name,
    CASE WHEN is_super_admin THEN 'super_admin' ELSE 'user' END,
    user_company_id,
    '{}',
    NOW(),
    NOW()
  );
  
  -- If this is the first user in a company, make them an admin
  IF user_company_id IS NOT NULL AND NOT is_super_admin THEN
    IF (SELECT COUNT(*) FROM public.users WHERE company_id = user_company_id) = 1 THEN
      UPDATE public.users SET role = 'admin' WHERE id = NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger is properly set
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_with_company();