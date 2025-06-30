/*
  # Fix debug_company_account_permissions function

  1. Changes
     - Removes the ambiguity in the debug_company_account_permissions function
     - Drops the existing function with parameters
     - Creates a new function without parameters that uses the current user's session
  
  2. Security
     - Function is set as SECURITY DEFINER to bypass RLS
     - Only returns information about the current user's permissions
*/

-- Drop the existing functions to avoid ambiguity
DROP FUNCTION IF EXISTS public.debug_company_account_permissions(uuid);
DROP FUNCTION IF EXISTS public.debug_company_account_permissions();

-- Create a new function without parameters
CREATE OR REPLACE FUNCTION public.debug_company_account_permissions()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  current_user_company_id uuid;
  current_user_role text;
  current_user_email text;
  result jsonb;
BEGIN
  -- Get current user ID from auth.uid()
  current_user_id := auth.uid();
  
  -- Get user details
  SELECT 
    company_id, 
    role,
    email
  INTO 
    current_user_company_id,
    current_user_role,
    current_user_email
  FROM public.users
  WHERE id = current_user_id;
  
  -- Build result JSON
  result := jsonb_build_object(
    'user_id', current_user_id,
    'company_id', current_user_company_id,
    'role', current_user_role,
    'email', current_user_email,
    'timestamp', now(),
    'permissions', jsonb_build_object(
      'can_read_company_accounts', has_table_privilege(current_user_id::text, 'public.company_account_ids', 'SELECT'),
      'can_insert_company_accounts', has_table_privilege(current_user_id::text, 'public.company_account_ids', 'INSERT'),
      'can_update_company_accounts', has_table_privilege(current_user_id::text, 'public.company_account_ids', 'UPDATE'),
      'can_delete_company_accounts', has_table_privilege(current_user_id::text, 'public.company_account_ids', 'DELETE')
    ),
    'rls_policies', (
      SELECT jsonb_agg(jsonb_build_object(
        'policy_name', policyname,
        'table', tablename,
        'command', cmd,
        'roles', roles
      ))
      FROM pg_policies
      WHERE tablename = 'company_account_ids'
      AND schemaname = 'public'
    )
  );
  
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.debug_company_account_permissions() TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.debug_company_account_permissions() IS 'Debug function to check permissions for company account IDs';