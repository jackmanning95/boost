# Quick Fix Checklist for invite-user Function

## 🚀 Immediate Actions (5 minutes)

### 1. **Fix RLS Policies** ⚡
```sql
-- Run this in Supabase SQL Editor immediately
-- File: fix_users_rls_final.sql (already created)
```
**Why:** Eliminates infinite recursion errors that block user creation

### 2. **Verify Service Role Key** ⚡
1. Go to Supabase Dashboard → Settings → API
2. Copy the **service_role** key (not anon key)
3. Go to Edge Functions → invite-user → Settings
4. Set `SUPABASE_SERVICE_ROLE_KEY` to the service role key
5. Redeploy function

**Why:** Service role key has elevated permissions needed for user creation

### 3. **Run Diagnostic** ⚡
```bash
node comprehensive-auth-diagnostic.js
```
**Why:** Identifies the exact cause of your `unexpected_failure` error

## 🎯 Most Likely Fixes

### Fix #1: Environment Variables (80% of cases)
**Problem:** Missing or incorrect SUPABASE_SERVICE_ROLE_KEY
**Solution:** 
1. Get service role key from Supabase Dashboard → Settings → API
2. Set in Edge Functions → invite-user → Settings
3. Redeploy function

### Fix #2: RLS Policies (15% of cases)  
**Problem:** Infinite recursion in users table policies
**Solution:** Run the `fix_users_rls_final.sql` migration

### Fix #3: Auth API Quotas (5% of cases)
**Problem:** Hitting rate limits or monthly quotas
**Solution:** Check Supabase Dashboard → Settings → Usage

## ✅ Verification Steps

After applying fixes:

1. **Test the function:**
```bash
node comprehensive-auth-diagnostic.js
```

2. **Check for success indicators:**
- ✅ All environment variables present
- ✅ No RLS recursion errors  
- ✅ Complete invite flow passes
- ✅ Function returns `{ success: true }`

3. **If still failing:**
- Check Edge Function logs in Supabase Dashboard
- Look for specific error details beyond "unexpected_failure"
- Verify email provider configuration

## 🚨 Red Flags to Look For

- **"Missing environment variables"** → Fix environment variables
- **"infinite recursion detected"** → Run RLS migration
- **"Rate limit exceeded"** → Check Auth API usage
- **"Auth API error"** → Verify service role key
- **"Email configuration"** → Check SMTP settings

## 📞 Escalation Path

If fixes don't work:
1. Share diagnostic script output
2. Include Edge Function logs from Supabase Dashboard
3. Provide specific error timestamps
4. Check Supabase status page for incidents

## 💡 Prevention

- Always use SERVICE_ROLE_KEY for Edge Functions
- Monitor Auth API usage regularly
- Test invite function after any RLS policy changes
- Keep environment variables documented