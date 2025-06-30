# 🚨 URGENT: Fix invite-user Edge Function Environment Variables

## The Problem
Your `invite-user` Edge Function is failing with:
```
"Auth API unexpected failure - check service role key and quotas"
"Database error creating new user"
```

This means the `SUPABASE_SERVICE_ROLE_KEY` environment variable is either:
1. **Missing** from the Edge Function environment
2. **Set to the wrong value** (possibly the anon key instead of service role key)
3. **Expired or invalid**

## 🔧 IMMEDIATE FIX (5 minutes)

### Step 1: Get Your Service Role Key
1. Go to your **Supabase Dashboard**
2. Navigate to **Settings** → **API**
3. Copy the **`service_role`** key (NOT the `anon` key)
   - It should start with `eyJ`
   - It should be much longer than the anon key
   - It should be different from your anon key

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
Try inviting a user again from your Team Management page.

## ✅ Verification Checklist

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

## 🎯 Expected Result

After completing these steps, you should be able to:
- ✅ Invite users successfully
- ✅ See "User invited successfully" messages
- ✅ Have new users receive password reset emails
- ✅ See new users appear in your team management interface

## 📞 If Still Not Working

If you're still getting the "unexpected_failure" error after following these steps:

1. **Check Function Logs**
   - Go to **Edge Functions** → **invite-user** → **Logs**
   - Look for detailed error messages

2. **Verify Service Role Key Permissions**
   - The service role key should have full database access
   - It should be able to create users via the Auth API

3. **Check Auth API Usage**
   - Go to **Settings** → **Usage** in your Supabase Dashboard
   - Check if you're approaching any quotas

4. **Contact Support**
   - If the issue persists, contact Supabase support with the specific error logs

---

**This is the most common cause of the "unexpected_failure" error. Following these steps should resolve the issue immediately.**