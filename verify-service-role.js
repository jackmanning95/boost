// Service Role Verification Script
// Run with: node verify-service-role.js

const SUPABASE_URL = 'https://usbowqbohkdfadhclypx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzYm93cWJvaGtkZmFkaGNseXB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTU1MjE4NzQsImV4cCI6MjAzMTA5Nzg3NH0.Ej6phn9OtWNbLBXOBYgKJULdCJhMQJGJZKNJZKNJZKN'

// IMPORTANT: Replace this with your actual service role key from Supabase Dashboard
// Go to: Settings → API → service_role key
const SUPABASE_SERVICE_KEY = 'YOUR_SERVICE_ROLE_KEY_HERE' // Replace with actual key

async function verifyServiceRoleKey() {
  console.log('🔑 VERIFYING SERVICE ROLE KEY')
  console.log('='.repeat(60))
  
  if (SUPABASE_SERVICE_KEY === 'YOUR_SERVICE_ROLE_KEY_HERE') {
    console.log('⚠️  Please replace SUPABASE_SERVICE_KEY with your actual service role key')
    console.log('Get it from: Supabase Dashboard → Settings → API → service_role key')
    return false
  }
  
  // Check if the key starts with "eyJ" (JWT format)
  if (!SUPABASE_SERVICE_KEY.startsWith('eyJ')) {
    console.log('❌ The provided key does not appear to be a valid JWT token')
    console.log('Service role keys should start with "eyJ" and be long JWT tokens')
    return false
  }
  
  // Check if anon key and service key are different
  if (SUPABASE_SERVICE_KEY === SUPABASE_ANON_KEY) {
    console.log('❌ The service role key is identical to the anon key!')
    console.log('These should be different keys with different permissions')
    return false
  }
  
  console.log('✅ Service role key format appears valid')
  return true
}

async function testServiceRoleAccess() {
  console.log('\n🔐 TESTING SERVICE ROLE ACCESS')
  console.log('='.repeat(60))
  
  if (!await verifyServiceRoleKey()) {
    return
  }
  
  // Test 1: Read companies table with service role
  console.log('\n📋 Test 1: Reading companies table with service role...')
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/companies?select=id,name&limit=1`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      const companies = await response.json()
      console.log('✅ Service role can read companies table')
      console.log('Sample company:', companies[0] ? companies[0] : 'None found')
      return companies[0] // Return first company for further testing
    } else {
      console.log('❌ Service role cannot read companies table')
      console.log('Status:', response.status)
      const errorText = await response.text()
      console.log('Error:', errorText)
      return null
    }
  } catch (error) {
    console.log('❌ Error testing companies table access:', error.message)
    return null
  }
}

async function testUserTableAccess(testCompany) {
  if (!testCompany) {
    console.log('⏭️  Skipping user table test - no company available')
    return
  }
  
  console.log('\n👥 Test 2: Testing users table access with service role...')
  
  // Test reading users table
  console.log('Testing SELECT on users table...')
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/users?select=count&head=true`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY
      }
    })
    
    if (response.ok) {
      console.log('✅ Service role can read users table')
    } else {
      console.log('❌ Service role cannot read users table')
      console.log('Status:', response.status)
      const errorText = await response.text()
      console.log('Error:', errorText)
    }
  } catch (error) {
    console.log('❌ Error reading users table:', error.message)
  }
  
  // Test inserting into users table
  console.log('Testing INSERT on users table...')
  const testUserId = `test-${Date.now()}`
  const testEmail = `test-${Date.now()}@example.com`
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: testUserId,
        email: testEmail,
        name: 'Test User',
        role: 'user',
        company_id: testCompany.id,
        platform_ids: {}
      })
    })
    
    if (response.ok) {
      console.log('✅ Service role can insert into users table')
      
      // Clean up - delete the test user
      await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${testUserId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apikey': SUPABASE_SERVICE_KEY
        }
      })
      console.log('✅ Test user cleaned up')
      
    } else {
      console.log('❌ Service role cannot insert into users table')
      console.log('Status:', response.status)
      const errorText = await response.text()
      console.log('Error:', errorText)
      
      if (errorText.includes('RLS') || errorText.includes('policy')) {
        console.log('\n🚨 RLS POLICY ISSUE DETECTED!')
        console.log('The service role is being blocked by Row Level Security policies.')
        console.log('This is likely the root cause of your invite-user function failures.')
      }
    }
  } catch (error) {
    console.log('❌ Error inserting into users table:', error.message)
  }
}

async function testAuthApiAccess() {
  console.log('\n🔑 Test 3: Testing Auth API access with service role...')
  
  if (!await verifyServiceRoleKey()) {
    return
  }
  
  try {
    // Test listing users (a basic Auth API operation)
    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY
      }
    })
    
    if (response.ok) {
      console.log('✅ Service role can access Auth API')
      const data = await response.json()
      console.log('Auth API response:', {
        users: data.users ? data.users.length : 0,
        total: data.total_users || 0
      })
    } else {
      console.log('❌ Service role cannot access Auth API')
      console.log('Status:', response.status)
      const errorText = await response.text()
      console.log('Error:', errorText)
      
      if (response.status === 401) {
        console.log('\n🚨 INVALID SERVICE ROLE KEY DETECTED!')
        console.log('The provided service role key does not have Auth API access.')
        console.log('This is likely the root cause of your invite-user function failures.')
      }
    }
  } catch (error) {
    console.log('❌ Error testing Auth API access:', error.message)
  }
}

async function runServiceRoleVerification() {
  console.log('🚀 SERVICE ROLE KEY VERIFICATION')
  console.log('='.repeat(60))
  console.log('This script verifies if your service role key has the necessary permissions.')
  console.log('It will help identify if the key is the root cause of your invite-user failures.\n')
  
  const testCompany = await testServiceRoleAccess()
  await testUserTableAccess(testCompany)
  await testAuthApiAccess()
  
  console.log('\n📋 VERIFICATION SUMMARY:')
  console.log('='.repeat(60))
  console.log('If any of the tests above failed, this indicates that your service role key')
  console.log('does not have the necessary permissions for the invite-user function.')
  
  console.log('\n💡 NEXT STEPS:')
  console.log('1. If service role key validation failed:')
  console.log('   → Get a new service role key from Supabase Dashboard → Settings → API')
  console.log('2. If database access tests failed:')
  console.log('   → Check RLS policies on users and companies tables')
  console.log('3. If Auth API access failed:')
  console.log('   → Ensure you\'re using the correct service role key')
  console.log('   → Check if your project has Auth API access')
  
  console.log('\n🔧 TO FIX THE INVITE-USER FUNCTION:')
  console.log('1. Go to Supabase Dashboard → Edge Functions → invite-user → Settings')
  console.log('2. Update SUPABASE_SERVICE_ROLE_KEY with the correct service role key')
  console.log('3. Redeploy the function')
  console.log('4. Run the debug-auth-api.js script to verify the fix')
}

runServiceRoleVerification()