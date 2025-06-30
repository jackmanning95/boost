# 🚨 CRITICAL: Fix invite-user Edge Function Environment Variables

## The Problem
Your `invite-user` Edge Function is returning a non-2xx status code, causing the frontend error:
```
CompanyContext: Edge Function error: Edge Function returned a non-2xx status code
Failed to invite user: Edge Function returned a non-2xx status code
```

## Root Cause
The Edge Function environment variables are not properly configured in your Supabase Dashboard. The function needs the `SUPABASE_SERVICE_ROLE_KEY` to create users via the Auth API.

## 🔧 IMMEDIATE FIX (Must be done in Supabase Dashboard)

### Step 1: Get Your Service Role Key
1. Go to your **Supabase Dashboard**
2. Navigate to **Settings** → **API**
3. Copy the **`service_role`** key (NOT the `anon` key)
   - It should start with `eyJ`
   - It should be much longer than the anon key
   - It should be different from your anon key

### Step 2: Configure Edge Function Environment Variables
1. In your **Supabase Dashboard**, go to **Edge Functions**
2. Click on the **`invite-user`** function
3. Go to the **Settings** tab
4. Add these environment variables:

```
SUPABASE_URL = https://usbowqbohkdfadhclypx.supabase.co
SUPABASE_SERVICE_ROLE_KEY = [YOUR_SERVICE_ROLE_KEY_HERE]
SUPABASE_ANON_KEY = [YOUR_ANON_KEY_HERE]
SITE_URL = http://localhost:5173
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

## 🔍 Debug Information

After following the steps above, if you're still getting errors, check the Edge Function logs:

1. Go to **Edge Functions** → **invite-user** → **Logs**
2. Look for detailed error messages
3. The function provides comprehensive debugging information

## 🎯 Expected Result

After completing these steps, you should be able to:
- ✅ Invite users successfully
- ✅ See "User invited successfully" messages
- ✅ Have new users receive password reset emails
- ✅ See new users appear in your team management interface

---

**This must be done in the Supabase Dashboard - it cannot be automated through code.**