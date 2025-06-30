# Fix invite-user Edge Function Environment Variables

## 🚨 CRITICAL: The invite-user Edge Function is failing due to missing or incorrect environment variables

Based on the error logs, the Edge Function is returning:
```json
{
  "success": false,
  "error": "Auth API unexpected failure - check service role key and quotas",
  "debug": {
    "authError": {
      "code": "unexpected_failure",
      "message": "Database error creating new user",
      "status": 500
    }
  }
}
```

This indicates that the `SUPABASE_SERVICE_ROLE_KEY` environment variable is either:
1. Missing from the Edge Function environment
2. Set to the wrong value (possibly the anon key instead of service role key)
3. Expired or revoked

## ✅ IMMEDIATE FIX STEPS

### Step 1: Get Your Service Role Key
1. Go to your **Supabase Dashboard**
2. Navigate to **Settings** → **API**
3. Copy the **`service_role`** key (NOT the `anon` key)
   - It should start with `eyJ`
   - It should be different from your `anon` key
   - It should be much longer than the `anon` key

### Step 2: Set Environment Variables in Edge Function
1. In your **Supabase Dashboard**, go to **Edge Functions**
2. Click on the **`invite-user`** function
3. Go to the **Settings** tab
4. Add/Update these environment variables:

```
SUPABASE_URL = https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (your service role key)
SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (your anon key)
SITE_URL = https://your-domain.com (optional)
```

### Step 3: Redeploy the Function
1. After setting the environment variables, click **Deploy** or **Redeploy**
2. Wait for deployment to complete

### Step 4: Test the Function
Try inviting a user again from your application.

## 🔍 VERIFICATION CHECKLIST

- [ ] **Service Role Key is Set**: The `SUPABASE_SERVICE_ROLE_KEY` environment variable is configured
- [ ] **Key is Correct Format**: The service role key starts with `eyJ` and is a long JWT token
- [ ] **Keys are Different**: The service role key is different from the anon key
- [ ] **Function is Deployed**: The Edge Function has been redeployed after setting variables
- [ ] **URL is Correct**: The `SUPABASE_URL` matches your project URL

## 🚨 COMMON MISTAKES TO AVOID

1. **Using Anon Key Instead of Service Role Key**
   - ❌ Wrong: Using the `anon` key for `SUPABASE_SERVICE_ROLE_KEY`
   - ✅ Correct: Using the `service_role` key for `SUPABASE_SERVICE_ROLE_KEY`

2. **Not Redeploying After Setting Variables**
   - ❌ Wrong: Setting variables but not redeploying the function
   - ✅ Correct: Always redeploy after changing environment variables

3. **Incorrect Variable Names**
   - ❌ Wrong: `SUPABASE_SERVICE_KEY` or `SERVICE_ROLE_KEY`
   - ✅ Correct: `SUPABASE_SERVICE_ROLE_KEY`

## 🔧 IF THE PROBLEM PERSISTS

If you're still getting the "unexpected_failure" error after following these steps:

### Check Function Logs
1. Go to **Edge Functions** → **invite-user** → **Logs**
2. Look for detailed error messages
3. Check if environment variables are being loaded correctly

### Verify Service Role Key Permissions
1. The service role key should have full database access
2. It should be able to create users via the Auth API
3. It should bypass Row Level Security (RLS) policies

### Check Auth API Usage
1. Go to **Settings** → **Usage** in your Supabase Dashboard
2. Check if you're approaching any quotas
3. Look for any rate limiting warnings

## 📞 ESCALATION

If the issue persists after following all steps:
1. Check the Edge Function logs for specific error details
2. Verify your service role key is correct and has proper permissions
3. Check Supabase status page for any ongoing incidents
4. Contact Supabase support with the specific error logs

## 🎯 EXPECTED RESULT

After completing these steps, you should be able to:
- ✅ Invite users successfully
- ✅ See "User invited successfully" messages
- ✅ Have new users receive password reset emails
- ✅ See new users appear in your team management interface