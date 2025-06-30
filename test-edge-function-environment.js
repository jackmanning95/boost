// Test script to verify Edge Function environment variables
// Run this to check if your Edge Function is properly configured

const SUPABASE_URL = 'https://usbowqbohkdfadhclypx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzYm93cWJvaGtkZmFkaGNseXB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTU1MjE4NzQsImV4cCI6MjAzMTA5Nzg3NH0.Ej6phn9OtWNbLBXOBYgKJULdCJhMQJGJZKNJZKNJZKN';

async function testEdgeFunctionEnvironment() {
  console.log('🧪 Testing Edge Function Environment Variables...\n');
  
  try {
    // Test the Edge Function with a diagnostic call
    const response = await fetch(`${SUPABASE_URL}/functions/v1/invite-user`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}) // Empty body triggers validation
    });

    const responseText = await response.text();
    console.log('Raw response:', responseText);
    
    try {
      const data = JSON.parse(responseText);
      
      console.log('📊 Edge Function Response:');
      console.log(JSON.stringify(data, null, 2));

      if (data?.debug) {
        console.log('\n🔍 Debug Information:');
        console.log(JSON.stringify(data.debug, null, 2));
        
        if (data.debug.checklist) {
          console.log('\n📋 ENVIRONMENT VARIABLES STATUS:');
          Object.entries(data.debug.checklist).forEach(([key, value]) => {
            console.log(`  ${value ? '✅' : '❌'} ${key}`);
          });
        }
        
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

    } catch (parseError) {
      console.log('⚠️ Could not parse response as JSON:', parseError.message);
      console.log('This might indicate a server error or malformed response');
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
testEdgeFunctionEnvironment();