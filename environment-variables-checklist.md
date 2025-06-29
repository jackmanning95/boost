# Environment Variables Checklist for invite-user Edge Function

## ✅ Required Environment Variables

### 1. **SUPABASE_URL**
- **Description**: Your Supabase project URL
- **Format**: `https://your-project-id.supabase.co`
- **Where to find**: Supabase Dashboard → Settings → API
- **Status**: ⬜ Set ⬜ Verified

### 2. **SUPABASE_SERVICE_ROLE_KEY**
- **Description**: Service role key with elevated permissions
- **Format**: `eyJ...` (long JWT token)
- **Where to find**: Supabase Dashboard → Settings → API → service_role key
- **⚠️ CRITICAL**: This must be the SERVICE ROLE key, not the anon key
- **Status**: ⬜ Set ⬜ Verified

### 3. **SUPABASE_ANON_KEY**
- **Description**: Anonymous/public key for client operations
- **Format**: `eyJ...` (long JWT token)
- **Where to find**: Supabase Dashboard → Settings → API → anon/public key
- **Status**: ⬜ Set ⬜ Verified

### 4. **SITE_URL** (Optional)
- **Description**: Your application's URL for email redirects
- **Format**: `https://your-domain.com` or `http://localhost:5173`
- **Default**: `http://localhost:5173`
- **Status**: ⬜ Set ⬜ Verified

## 🔧 How to Set Environment Variables

### In Supabase Edge Functions:
1. Go to Supabase Dashboard
2. Navigate to Edge Functions
3. Select your `invite-user` function
4. Go to Settings tab
5. Add environment variables in the "Environment Variables" section

### For Local Development:
Create a `.env` file in your `supabase/functions/invite-user/` directory:
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
SITE_URL=http://localhost:5173
```

## 🧪 Verification Commands

### Test Environment Variables:
```bash
# Run the comprehensive debug script
node comprehensive-debug-script.js
```

### Manual Verification:
```bash
# Check if function can access environment variables
curl -X POST https://your-project-id.supabase.co/functions/v1/invite-user \
  -H "Authorization: Bearer your-anon-key" \
  -H "Content-Type: application/json" \
  -d '{}' # Empty payload will trigger env var validation
```

## 🚨 Common Issues

### 1. **Using Anon Key Instead of Service Role Key**
- **Symptom**: "insufficient permissions" errors
- **Solution**: Ensure you're using the SERVICE ROLE key, not the anon key

### 2. **Missing Environment Variables**
- **Symptom**: "Server configuration error" in function response
- **Solution**: Set all required environment variables

### 3. **Incorrect URL Format**
- **Symptom**: Connection errors or 404s
- **Solution**: Ensure URL includes `https://` and correct project ID

### 4. **Expired or Invalid Keys**
- **Symptom**: Authentication errors
- **Solution**: Regenerate keys in Supabase Dashboard

## 📝 Verification Checklist

- [ ] All required environment variables are set
- [ ] SERVICE ROLE key is used (not anon key)
- [ ] Environment variables are set in the correct location (Edge Function settings)
- [ ] Keys are not expired or revoked
- [ ] URL format is correct
- [ ] Function can access all environment variables (tested with debug script)

## 🔍 Debug Information

The enhanced invite-user function will return detailed debug information about environment variables when validation fails. Look for:

```json
{
  "success": false,
  "error": "Server configuration error: Missing environment variables",
  "debug": {
    "checklist": {
      "SUPABASE_URL": true,
      "SUPABASE_SERVICE_ROLE_KEY": false,
      "SUPABASE_ANON_KEY": true,
      "SITE_URL": true
    }
  }
}
```

This will help you identify exactly which environment variables are missing or incorrectly set.