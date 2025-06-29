# Auth API Troubleshooting Guide

## 🚨 Current Issue: `unexpected_failure` Error

You're experiencing this error when inviting users:
```
Failed to create user: Database error creating new user
AuthApiError: status 500, code unexpected_failure
```

## ✅ Systematic Verification Checklist

### 1. **Supabase Auth API Quotas & Rate Limits**

**Check in Supabase Dashboard:**
- Go to Settings → Usage
- Look for Auth API usage metrics
- Check if you're approaching or exceeding limits

**Common Limits:**
- Free tier: 50,000 monthly active users
- Auth API requests: Usually generous but can be rate-limited
- Email sending: Limited by your email provider

**How to verify:**
```bash
# Run the comprehensive diagnostic
node comprehensive-auth-diagnostic.js
```

### 2. **Email Provider Configuration**

**Check in Supabase Dashboard:**
- Go to Authentication → Settings → Email
- Verify SMTP settings are correct
- Test email template configuration

**Common Issues:**
- Missing or incorrect SMTP credentials
- Email provider blocking Supabase IPs
- Invalid email templates
- Domain verification issues

**Quick Test:**
- Try sending a password reset email manually
- Check if emails are being delivered

### 3. **RLS Policies & Database Triggers**

**Current Status:** ✅ Fixed with latest migration
- The `fix_users_rls_final.sql` migration resolves recursion issues
- Service role now has full access for Edge Functions

**Verification:**
```sql
-- Check if policies exist and are working
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public';
```

### 4. **Environment Variables**

**Required Variables:**
- `SUPABASE_URL` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ⚠️ (CRITICAL - must be service role, not anon)
- `SUPABASE_ANON_KEY` ✅
- `SITE_URL` ✅ (optional)

**How to Set:**
1. Go to Supabase Dashboard
2. Edge Functions → invite-user → Settings
3. Add environment variables
4. Redeploy function

### 5. **Edge Function & Auth Logs**

**Where to Check:**
- Supabase Dashboard → Edge Functions → invite-user → Logs
- Supabase Dashboard → Authentication → Logs
- Look for detailed error messages beyond "unexpected_failure"

## 🔧 Step-by-Step Resolution

### Step 1: Run Diagnostic Script
```bash
node comprehensive-auth-diagnostic.js
```

### Step 2: Apply RLS Fix (if needed)
```sql
-- Run this in Supabase SQL Editor
-- File: fix_users_rls_final.sql
```

### Step 3: Verify Environment Variables
1. Check Edge Function settings
2. Ensure SERVICE_ROLE_KEY is set (not anon key)
3. Redeploy function if variables were missing

### Step 4: Check Auth API Usage
1. Go to Supabase Dashboard → Settings → Usage
2. Look for any quota warnings
3. Check Auth API request volume

### Step 5: Verify Email Configuration
1. Go to Authentication → Settings → Email
2. Test SMTP settings
3. Check email template configuration

### Step 6: Test Function Again
```bash
# Use the diagnostic script to test
node comprehensive-auth-diagnostic.js
```

## 🚨 Common Root Causes

### 1. **Service Role Key Issues** (Most Common)
- Using anon key instead of service role key
- Service role key not set in Edge Function environment
- Service role key expired or revoked

### 2. **Auth API Rate Limiting**
- Too many requests in short time period
- Approaching monthly quota limits
- IP-based rate limiting

### 3. **Email Provider Issues**
- SMTP configuration errors
- Email provider blocking requests
- Domain verification problems

### 4. **Database Permission Issues**
- RLS policies blocking service role
- Trigger failures during user creation
- Foreign key constraint violations

## 📊 Expected Diagnostic Results

### ✅ Healthy System:
- All environment variables present
- No RLS recursion errors
- Auth API requests succeed
- Email configuration working
- Complete invite flow passes

### ❌ Problem Indicators:
- Missing SUPABASE_SERVICE_ROLE_KEY
- RLS infinite recursion errors
- 429 (rate limit) responses
- 500 (server error) responses
- Auth API unexpected_failure errors

## 🎯 Next Steps

1. **Run the diagnostic script first** - this will identify the exact issue
2. **Apply fixes based on diagnostic results**
3. **Re-run diagnostic to verify fixes**
4. **Check Supabase logs for additional details**

## 💡 Pro Tips

- Always use SERVICE_ROLE_KEY for Edge Functions, never anon key
- Check Supabase status page for any ongoing issues
- Monitor Auth API usage to avoid quota issues
- Test email configuration separately from user creation
- Keep Edge Function logs open while testing

## 📞 When to Contact Support

If after following this guide:
- All environment variables are correct
- RLS policies are fixed
- No quota issues detected
- Email configuration is working
- But `unexpected_failure` persists

Then contact Supabase support with:
- Edge Function logs
- Auth logs
- Diagnostic script output
- Specific error timestamps