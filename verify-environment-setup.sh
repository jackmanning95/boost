#!/bin/bash

echo "🔍 Verifying Edge Function Environment Setup"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "\n${BLUE}📋 CHECKLIST: Edge Function Environment Variables${NC}"
echo "=================================================="

echo -e "\n${YELLOW}1. Service Role Key Setup${NC}"
echo "   □ Go to Supabase Dashboard → Settings → API"
echo "   □ Copy the 'service_role' key (NOT the 'anon' key)"
echo "   □ Verify it starts with 'eyJ' and is very long"

echo -e "\n${YELLOW}2. Edge Function Configuration${NC}"
echo "   □ Go to Supabase Dashboard → Edge Functions → invite-user"
echo "   □ Click on 'Settings' tab"
echo "   □ Add/Update environment variables:"
echo "     - SUPABASE_URL"
echo "     - SUPABASE_SERVICE_ROLE_KEY"
echo "     - SUPABASE_ANON_KEY"

echo -e "\n${YELLOW}3. Deployment${NC}"
echo "   □ Click 'Deploy' or 'Redeploy' after setting variables"
echo "   □ Wait for deployment to complete"

echo -e "\n${YELLOW}4. Testing${NC}"
echo "   □ Try inviting a user from your application"
echo "   □ Check Edge Function logs for any errors"

echo -e "\n${BLUE}🧪 AUTOMATED TESTS${NC}"
echo "==================="

echo -e "\n${YELLOW}Run these commands to test your setup:${NC}"
echo "1. Test Edge Function environment:"
echo "   node test-edge-function-environment.js"

echo -e "\n2. Test from your application:"
echo "   - Go to Settings → Team Management"
echo "   - Try inviting a user"
echo "   - Check browser console for detailed errors"

echo -e "\n${GREEN}✅ SUCCESS INDICATORS:${NC}"
echo "- Edge Function returns { success: true }"
echo "- User receives password reset email"
echo "- User appears in team management list"
echo "- No 'unexpected_failure' errors in logs"

echo -e "\n${RED}❌ FAILURE INDICATORS:${NC}"
echo "- 'Auth API unexpected failure' errors"
echo "- 'Missing environment variables' messages"
echo "- 'Database error creating new user' messages"
echo "- Edge Function returns non-2xx status codes"

echo -e "\n${BLUE}📞 SUPPORT${NC}"
echo "==========="
echo "If issues persist after following this checklist:"
echo "1. Check Edge Function logs in Supabase Dashboard"
echo "2. Verify service role key permissions"
echo "3. Check Auth API usage limits"
echo "4. Contact Supabase support with specific error logs"

echo -e "\n${GREEN}🎯 Remember: The most common cause is using the wrong key!${NC}"
echo "Make sure you're using the SERVICE_ROLE key, not the ANON key."