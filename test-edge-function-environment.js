// Test script to verify Edge Function environment variables
// Run this to check if your Edge Function is properly configured

const { createClient } = require('@supabase/supabase-js');

// Replace with your actual Supabase URL and anon key
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testEdgeFunctionEnvironment() {
  console.log('🧪 Testing Edge Function Environment Variables...\n');
  
  try {
    // Test the Edge Function with a diagnostic call
    const { data, error } = await supabase.functions.invoke('invite-user', {
      body: {
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        companyId: '00000000-0000-0000-0000-000000000000' // Fake UUID for testing
      }
    });

    console.log('📊 Edge Function Response:');
    console.log('Data:', JSON.stringify(data, null, 2));
    console.log('Error:', error);

    if (data?.debug) {
      console.log('\n🔍 Debug Information:');
      console.log(JSON.stringify(data.debug, null, 2));
      
      if (data.debug.missingVars && data.debug.missingVars.length > 0) {
        console.log('\n❌ MISSING ENVIRONMENT VARIABLES:');
        data.debug.missingVars.forEach(varName => {
          console.log(`   - ${varName}`);
        });
        console.log('\n📋 TO FIX:');
        console.log('1. Go to Supabase Dashboard → Edge Functions → invite-user → Settings');
        console.log('2. Add the missing environment variables');
        console.log('3. Redeploy the function');
      }
      
      if (data.debug.troubleshooting) {
        console.log('\n🛠️ TROUBLESHOOTING STEPS:');
        data.debug.troubleshooting.forEach((step, index) => {
          console.log(`   ${index + 1}. ${step}`);
        });
      }
    }

    if (data?.success === false && data?.error?.includes('Auth API unexpected failure')) {
      console.log('\n🚨 AUTH API ERROR DETECTED');
      console.log('This usually means:');
      console.log('1. SUPABASE_SERVICE_ROLE_KEY is missing or incorrect');
      console.log('2. Service role key doesn\'t have Auth API permissions');
      console.log('3. Auth API usage limits exceeded');
      console.log('\n✅ SOLUTION:');
      console.log('1. Get your service_role key from Supabase Dashboard → Settings → API');
      console.log('2. Set SUPABASE_SERVICE_ROLE_KEY in Edge Function settings');
      console.log('3. Redeploy the function');
    }

  } catch (err) {
    console.error('❌ Error testing Edge Function:', err);
    
    if (err.message.includes('Failed to fetch')) {
      console.log('\n🌐 NETWORK ERROR:');
      console.log('- Check your SUPABASE_URL is correct');
      console.log('- Verify your internet connection');
      console.log('- Ensure the Edge Function is deployed');
    }
  }
}

// Run the test
testEdgeFunctionEnvironment().catch(console.error);