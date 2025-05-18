/*
  # Add stored procedure for user creation
  
  This migration adds a stored procedure that handles user profile creation
  with proper permissions handling.
*/

-- Create stored procedure for user creation
CREATE OR REPLACE FUNCTION create_user_profile(
  user_id uuid,
  user_email text,
  user_name text,
  user_company text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO users (
    id,
    email,
    name,
    role,
    company_name,
    platform_ids
  ) VALUES (
    user_id,
    user_email,
    user_name,
    'client',
    user_company,
    '{}'::jsonb
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_user_profile TO authenticated;