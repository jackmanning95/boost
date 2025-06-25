-- Create or replace the debug function with fixed alias
CREATE OR REPLACE FUNCTION debug_company_account_permissions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  user_info jsonb;
  company_info jsonb;
  account_ids jsonb;
  rls_test jsonb;
  result jsonb;
BEGIN
  -- Get current user ID from auth context
  current_user_id := auth.uid();
  
  -- TEMPORARY HARDCODE FOR TESTING (remove after debugging)
  -- Uncomment the line below to test with your specific user ID
  -- current_user_id := '955fb140-13df-48a9-9ca0-9173bbf6fb45';
  
  -- Get user information (using 'u' alias instead of 'current_user')
  SELECT jsonb_build_object(
    'id', u.id,
    'email', u.email,
    'name', u.name,
    'role', u.role,
    'company_id', u.company_id,
    'created_at', u.created_at
  ) INTO user_info
  FROM users u
  WHERE u.id = current_user_id;
  
  -- Get company information if user has a company (using 'u' alias)
  SELECT jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'account_id', c.account_id,
    'created_at', c.created_at
  ) INTO company_info
  FROM companies c
  JOIN users u ON u.company_id = c.id
  WHERE u.id = current_user_id;
  
  -- Get company account IDs (bypassing RLS for debugging, using 'u' alias)
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', ca.id,
      'platform', ca.platform,
      'account_id', ca.account_id,
      'account_name', ca.account_name,
      'is_active', ca.is_active,
      'company_id', ca.company_id,
      'created_at', ca.created_at
    )
  ) INTO account_ids
  FROM company_account_ids ca
  JOIN users u ON u.company_id = ca.company_id
  WHERE u.id = current_user_id;
  
  -- Test RLS policy evaluation (using 'u' alias)
  SELECT jsonb_build_object(
    'can_read_own_company_accounts', EXISTS(
      SELECT 1 
      FROM company_account_ids ca
      WHERE EXISTS (
        SELECT 1 
        FROM users u 
        WHERE u.id = current_user_id 
          AND u.company_id = ca.company_id
      )
      LIMIT 1
    ),
    'total_accounts_in_system', (SELECT COUNT(*) FROM company_account_ids),
    'accounts_for_user_company', (
      SELECT COUNT(*) 
      FROM company_account_ids ca
      JOIN users u ON u.company_id = ca.company_id
      WHERE u.id = current_user_id
    )
  ) INTO rls_test;
  
  -- Build final result
  result := jsonb_build_object(
    'debug_timestamp', NOW(),
    'auth_uid', current_user_id,
    'user_info', COALESCE(user_info, 'null'::jsonb),
    'company_info', COALESCE(company_info, 'null'::jsonb),
    'account_ids', COALESCE(account_ids, '[]'::jsonb),
    'rls_test', COALESCE(rls_test, '{}'::jsonb),
    'session_context', jsonb_build_object(
      'current_user_id_from_auth', auth.uid(),
      'current_user_id_used', current_user_id,
      'is_authenticated', (current_user_id IS NOT NULL)
    )
  );
  
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION debug_company_account_permissions() TO authenticated;

-- Add comment
COMMENT ON FUNCTION debug_company_account_permissions() IS 'Debug function to troubleshoot company account ID permissions and RLS policies. Fixed to avoid current_user reserved keyword.';