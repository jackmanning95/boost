// Test script to verify invite-user function with real company data
// Run with: node test-invite-with-real-company.js

const SUPABASE_URL = 'https://usbowqbohkdfadhclypx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzYm93cWJvaGtkZmFkaGNseXB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTU1MjE4NzQsImV4cCI6MjAzMTA5Nzg3NH0.Ej6phn9OtWNbLBXOBYgKJULdCJhMQJGJZKNJZKNJZKN';

async function getCompanies() {
  console.log('🔍 Fetching companies from database...');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/companies?select=id,name&limit=3`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error('❌ Failed to fetch companies:', response.status);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return [];
    }
    
    const companies = await response.json();
    console.log('✅ Found companies:', companies.map(c => ({ id: c.id.substring(0, 8) + '...', name: c.name })));
    return companies;
  } catch (error) {
    console.error('❌ Error fetching companies:', error.message);
    return [];
  }
}

async function testInviteUser() {
  console.log('\n🧪 Testing invite-user with real company data...');
  
  const companies = await getCompanies();
  
  if (companies.length === 0) {
    console.log('❌ No companies found - cannot test with real data');
    return;
  }
  
  const testCompany = companies[0];
  const testEmail = `test.user.${Date.now()}@example.com`; // Unique email
  
  const testData = {
    email: testEmail,
    name: 'Test User',
    role: 'user',
    companyId: testCompany.id
  };
  
  console.log('📤 Testing invite-user with:', {
    email: testData.email,
    name: testData.name,
    role: testData.role,
    companyId: testData.companyId.substring(0, 8) + '...'
  });
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/invite-user`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    console.log('📥 Response status:', response.status);
    
    const responseText = await response.text();
    console.log('📥 Raw response:', responseText);
    
    try {
      const responseData = JSON.parse(responseText);
      console.log('📥 Parsed response:', JSON.stringify(responseData, null, 2));
      
      if (responseData.success) {
        console.log('✅ SUCCESS - User invitation worked!');
        console.log('User ID:', responseData.userId);
      } else {
        console.log('❌ FAILED - User invitation failed');
        console.log('Error:', responseData.error);
        
        if (responseData.error.includes('unexpected_failure')) {
          console.log('\n🚨 AUTH API UNEXPECTED FAILURE DETECTED!');
          console.log('This is the exact error you reported.');
          console.log('\n💡 MOST LIKELY CAUSES:');
          console.log('1. SUPABASE_SERVICE_ROLE_KEY is not set correctly');
          console.log('2. Email provider configuration issues');
          console.log('3. Auth API quotas or rate limits');
        }
        
        if (responseData.debug) {
          console.log('Debug info:', JSON.stringify(responseData.debug, null, 2));
        }
      }
    } catch (parseError) {
      console.log('❌ Failed to parse response as JSON:', parseError.message);
    }
    
  } catch (error) {
    console.log('❌ Test error:', error.message);
  }
}

async function checkMigrationStatus() {
  console.log('\n🔍 Checking migration status...');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/check_rls_policies`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        table_name: 'users'
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Migration check successful');
      console.log('RLS Policies:', result);
      
      // Check for service_role_full_access policy
      const hasServiceRolePolicy = result.some(policy => 
        policy.policyname === 'service_role_full_access' && 
        policy.roles.includes('service_role')
      );
      
      if (hasServiceRolePolicy) {
        console.log('✅ service_role_full_access policy is present');
      } else {
        console.log('❌ service_role_full_access policy is missing');
      }
    } else {
      console.log('❌ Failed to check migration status');
      console.log('Status:', response.status);
      const errorText = await response.text();
      console.log('Error:', errorText);
    }
  } catch (error) {
    console.log('❌ Error checking migration status:', error.message);
  }
}

async function runVerification() {
  console.log('🚀 STARTING INVITE-USER FUNCTION VERIFICATION');
  console.log('='.repeat(50));
  
  // Check migration status
  await checkMigrationStatus();
  
  // Test the invite function
  await testInviteUser();
  
  console.log('\n🏁 VERIFICATION COMPLETED!');
}

runVerification();