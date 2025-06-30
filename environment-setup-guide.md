# Environment Setup Guide for invite-user Function

## 🚨 Critical: Fix the "unexpected_failure" Error

The `invite-user` Edge Function is failing because of missing or incorrect environment variables. Follow these steps to resolve the issue:

## ✅ Step 1: Get Your Service Role Key

1. Go to your **Supabase Dashboard**
2. Navigate to **Settings** → **API**
3. Copy the **`service_role`** key (NOT the `anon` key)
   - It should be a long JWT token starting with `eyJ`
   - It should be different from your `anon` key

## ✅ Step 2: Set Environment Variables in Edge Function

1. In your **Supabase Dashboard**, go to **Edge Functions**
2. Click on the **`invite-user`** function
3. Go to the **Settings** tab
4. Add these environment variables:

### Required Variables:
```
SUPABASE_URL = https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (your service role key)
SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (your anon key)
```

### Optional Variables:
```
SITE_URL = https://your-domain.com (or http://localhost:5173 for development)
```

## ✅ Step 3: Redeploy the Function

After setting the environment variables:
1. Click **Deploy** or **Redeploy** the function
2. Wait for deployment to complete

## ✅ Step 4: Test the Function

Try inviting a user again from your application. The function should now work correctly.

## 🔍 Verification Checklist

Use this checklist to verify your setup:

- [ ] **Service Role Key is Set**: The `SUPABASE_SERVICE_ROLE_KEY` environment variable is configured
- [ ] **Key is Correct Format**: The service role key starts with `eyJ` and is a long JWT token
- [ ] **Keys are Different**: The service role key is different from the anon key
- [ ] **Function is Deployed**: The Edge Function has been redeployed after setting variables
- [ ] **URL is Correct**: The `SUPABASE_URL` matches your project URL

## 🚨 Common Mistakes to Avoid

1. **Using Anon Key Instead of Service Role Key**
   - ❌ Wrong: Using the `anon` key for `SUPABASE_SERVICE_ROLE_KEY`
   - ✅ Correct: Using the `service_role` key for `SUPABASE_SERVICE_ROLE_KEY`

2. **Not Redeploying After Setting Variables**
   - ❌ Wrong: Setting variables but not redeploying the function
   - ✅ Correct: Always redeploy after changing environment variables

3. **Incorrect Variable Names**
   - ❌ Wrong: `SUPABASE_SERVICE_KEY` or `SERVICE_ROLE_KEY`
   - ✅ Correct: `SUPABASE_SERVICE_ROLE_KEY`

## 🔧 Troubleshooting

If you're still getting errors after following these steps:

### Check Function Logs
1. Go to **Edge Functions** → **invite-user** → **Logs**
2. Look for detailed error messages
3. Check if environment variables are being loaded correctly

### Verify Service Role Key Permissions
1. The service role key should have full database access
2. It should be able to create users via the Auth API
3. It should bypass Row Level Security (RLS) policies

### Test with Diagnostic Script
Run the comprehensive diagnostic script to identify specific issues:
```bash
node comprehensive-auth-diagnostic.js
```

## 📞 Need Help?

If you're still experiencing issues:
1. Check the function logs in Supabase Dashboard
2. Verify your service role key is correct
3. Ensure all environment variables are set properly
4. Contact support with the specific error messages from the logs

## 🎯 Expected Result

After completing these steps, you should be able to:
- ✅ Invite users successfully
- ✅ See "User invited successfully" messages
- ✅ Have new users receive password reset emails
- ✅ See new users appear in your team management interface