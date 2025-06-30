// Test script for invite-user Edge Function with fresh service role key
// Run with: node test-invite-with-fresh-key.js

const SUPABASE_URL = 'https://usbowqbohkdfadhclypx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzYm93cWJvaGtkZmFkaGNseXB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTU1MjE4NzQsImV4cCI6MjAzMTA5Nzg3NH0.Ej6phn9OtWNbLBXOBYgKJULdCJhMQJGJZKNJZKNJZKN'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzYm93cWJvaGtkZmFkaGNseXB4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Njg0MDI3MywiZXhwIjoyMDYyNDE2MjczfQ.oOTE-ub0S_hNa7DdkQ0oCnXLt2vQl3k6bknLcG8TPrU'

async function getCompanies() {
  console.log('🔍 Fetching companies from database...')
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/companies?select=id,name&limit=3`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      console.error('❌ Failed to fetch companies:', response.status)
      const errorText = await response.text()
      console.error('Error details:', errorText)
      return []
    }
    
    const companies = await response.json()
    console.log('✅ Found companies:', companies.map(c => ({ id: c.id.substring(0, 8) + '...', name: c.name })))
    return companies
  } catch (error) {
    console.error('❌ Error fetching companies:', error.message)
    return []
  }
}

async function testInviteWithRealCompany() {
  console.log('\n🧪 Testing invite-user with real company data...')
  
  const companies = await getCompanies()
  
  if (companies.length === 0) {
    console.log('❌ No companies found - cannot test with real data')
    return
  }
  
  const testCompany = companies[0]
  const testEmail = `test.user.${Date.now()}@example.com` // Unique email
  
  const testData = {
    email: testEmail,
    name: 'Test User',
    role: 'user',
    companyId: testCompany.id
  }
  
  console.log('📤 Testing invite-user with:', {
    email: testData.email,
    name: testData.name,
    role: testData.role,
    companyId: testData.companyId.substring(0, 8) + '...'
  })
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/invite-user`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    })
    
    console.log('📥 Response status:', response.status)
    
    const responseText = await response.text()
    console.log('📥 Raw response:', responseText)
    
    try {
      const responseData = JSON.parse(responseText)
      console.log('📥 Parsed response:', JSON.stringify(responseData, null, 2))
      
      if (responseData.success) {
        console.log('✅ SUCCESS - User invitation worked!')
        console.log('User ID:', responseData.userId)
      } else {
        console.log('❌ FAILED - User invitation failed')
        console.log('Error:', responseData.error)
        
        if (responseData.error.includes('unexpected_failure')) {
          console.log('\n🚨 AUTH API UNEXPECTED FAILURE DETECTED!')
          console.log('This is the exact error you reported.')
          console.log('\n💡 MOST LIKELY CAUSES:')
          console.log('1. SUPABASE_SERVICE_ROLE_KEY is not set correctly')
          console.log('2. Email provider configuration issues')
          console.log('3. Auth API quotas or rate limits')
        }
        
        if (responseData.debug) {
          console.log('Debug info:', JSON.stringify(responseData.debug, null, 2))
        }
      }
    } catch (parseError) {
      console.log('❌ Failed to parse response as JSON:', parseError.message)
    }
    
  } catch (error) {
    console.log('❌ Test error:', error.message)
  }
}

async function checkAuthApiAccess() {
  console.log('\n🔑 Testing Auth API access with service role key...')
  
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
        total: data.total || 0
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

async function runVerification() {
  console.log('🚀 STARTING INVITE-USER FUNCTION VERIFICATION WITH FRESH KEY')
  console.log('='.repeat(50))
  
  // Check Auth API access
  await checkAuthApiAccess()
  
  // Test the invite function
  await testInviteWithRealCompany()
  
  console.log('\n🏁 VERIFICATION COMPLETED!')
  console.log('\n📋 NEXT STEPS:')
  console.log('1. If Auth API access test passed but invite still fails:')
  console.log('   - Check Supabase status page for Auth API issues')
  console.log('   - Verify email provider configuration in Supabase Auth settings')
  console.log('2. If both tests failed:')
  console.log('   - Generate a new service role key in Supabase Dashboard')
  console.log('   - Update the Edge Function environment variable')
  console.log('   - Redeploy the function')
}

runVerification()