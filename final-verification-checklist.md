# Final Verification Checklist for invite-user Function

## 🚀 Quick Verification Steps

### 1. Run the Auth API Diagnostic
```bash
node debug-auth-api.js
```

### 2. Verify Environment Variables
- [ ] SUPABASE_URL is set
- [ ] SUPABASE_SERVICE_ROLE_KEY is set (and is the correct service role key)
- [ ] SUPABASE_ANON_KEY is set
- [ ] SITE_URL is set (optional)

### 3. Verify RLS Policies
- [ ] Latest migration (fix_users_rls_final.sql) has been applied
- [ ] Service role has full access to users table
- [ ] No recursion issues in RLS policies

### 4. Verify Auth API Access
- [ ] Service role key has Auth API access
- [ ] Not hitting Auth API rate limits
- [ ] Email provider is configured correctly

## 🔍 How to Check Each Item

### Environment Variables
1. Go to Supabase Dashboard → Edge Functions → invite-user → Settings
2. Check that all required variables are set
3. Verify SUPABASE_SERVICE_ROLE_KEY is the service role key (not anon key)

### RLS Policies
1. Go to Supabase Dashboard → SQL Editor
2. Run:
```sql
SELECT policyname, cmd, roles
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public'
ORDER BY policyname;
```
3. Verify "service_role_full_access" policy exists

### Auth API Access
1. Go to Supabase Dashboard → Authentication → Logs
2. Look for any errors related to user creation
3. Go to Settings → Email to verify SMTP configuration

## 🚨 Common Issues and Solutions

### 1. "unexpected_failure" Error
- **Cause**: Usually a service role key issue or email configuration problem
- **Solution**: 
  - Verify service role key is correct
  - Check email provider configuration
  - Check Auth API quotas

### 2. RLS Policy Issues
- **Cause**: Infinite recursion or missing policies
- **Solution**: Apply the fix_users_rls_final.sql migration

### 3. Email Sending Failures
- **Cause**: SMTP configuration issues
- **Solution**: Check Authentication → Settings → Email in Supabase Dashboard

## 📋 Final Checklist

- [ ] RLS policies are correctly set up
- [ ] Environment variables are correctly set
- [ ] Service role key has proper permissions
- [ ] Email provider is correctly configured
- [ ] Auth API quotas are not exceeded
- [ ] invite-user function returns success

## 🎯 Next Steps If Still Failing

1. Check Edge Function logs for detailed error messages
2. Verify the exact Auth API error code and message
3. Test with a minimal payload to isolate the issue
4. Check if the issue is specific to certain email domains
5. Try with a different company ID to rule out company-specific issues

## 📞 Support Information

If you need to contact Supabase support, provide:
- Edge Function logs
- Auth API logs
- Diagnostic script output
- Specific error timestamps
- Steps you've already taken to troubleshoot