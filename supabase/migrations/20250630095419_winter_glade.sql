/*
  # Create debug function for company account permissions

  1. New Functions
    - `debug_company_account_permissions()` - Debug function to check user permissions and session info
  
  2. Security
    - Function runs with invoker's rights (not SECURITY DEFINER)
    - Only accessible to authenticated users
*/

-- Drop the function if it exists to avoid conflicts
DROP FUNCTION IF EXISTS debug_company_account_permissions();

-- Create the debug function without SECURITY DEFINER to avoid role issues
CREATE OR REPLACE FUNCTION debug_company_account_permissions()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  result jsonb;
  current_user_info jsonb;
  session_info jsonb;
BEGIN
  -- Get current user information
  SELECT jsonb_build_object(
    'auth_uid', auth.uid(),
    'auth_role', auth.role(),
    'current_user', current_user,
    'session_user', session_user
  ) INTO session_info;

  -- Get user profile information if available
  SELECT jsonb_build_object(
    'id', u.id,
    'email', u.email,
    'company_id', u.company_id,
    'role', u.role,
    'name', u.name
  ) INTO current_user_info
  FROM users u
  WHERE u.id = auth.uid();

  -- Build the result
  result := jsonb_build_object(
    'session', session_info,
    'user_profile', current_user_info,
    'timestamp', now(),
    'function_executed_successfully', true
  );

  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', true,
      'error_message', SQLERRM,
      'error_code', SQLSTATE,
      'session_info', session_info,
      'timestamp', now()
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION debug_company_account_permissions() TO authenticated;