// Test script to verify auth permissions and Edge Function setup
// Run with: node test-auth-permissions.js

const SUPABASE_URL = 'https://usbowqbohkdfadhclypx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzYm93cWJvaGtkZmFkaGNseXB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTU1MjE4NzQsImV4cCI6MjAzMTA5Nzg3NH0.Ej6phn9OtWNbLBXOBYgKJULdCJhMQJGJZKNJZKNJZKN'

async function testEdgeFunctionWithRealCompany() {
  console.log('🧪 Testing invite-user with real company data...')
  
  try {
    // First, get a real company ID from the database
    console.log('📋 Fetching companies...')
    const companiesResponse = await fetch(`${SUPABASE_URL}/rest/v1/companies?select=id,name&limit=1`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      }
    })
    
    if (!companiesResponse.ok) {
      console.error('❌ Failed to fetch companies:', companiesResponse.status, await companiesResponse.text())
      return
    }
    
    const companies = await companiesResponse.json()
    console.log('📋 Available companies:', companies)
    
    if (companies.length === 0) {
      console.error('❌ No companies found in database')
      return
    }
    
    const testCompany = companies[0]
    console.log('✅ Using company:', testCompany)
    
    // Now test the Edge Function with real data
    const testData = {
      email: `test.user.${Date.now()}@example.com`, // Unique email
      name: 'Test User',
      role: 'user',
      companyId: testCompany.id
    }
    
    console.log('📤 Testing Edge Function with:', testData)
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/invite-user`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    })
    
    console.log('📥 Response status:', response.status)
    console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()))
    
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

async function testDatabasePermissions() {
  console.log('\n🔐 Testing database permissions...')
  
  try {
    // Test reading companies table
    const companiesResponse = await fetch(`${SUPABASE_URL}/rest/v1/companies?select=count&head=true`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      }
    })
    
    if (companiesResponse.ok) {
      console.log('✅ Can read companies table')
    } else {
      console.log('❌ Cannot read companies table:', companiesResponse.status)
    }
    
    // Test reading users table
    const usersResponse = await fetch(`${SUPABASE_URL}/rest/v1/users?select=count&head=true`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      }
    })
    
    if (usersResponse.ok) {
      console.log('✅ Can read users table')
    } else {
      console.log('❌ Cannot read users table:', usersResponse.status)
    }
    
  } catch (error) {
    console.log('❌ Database permission test error:', error.message)
  }
}

async function runAllTests() {
  console.log('🚀 Starting comprehensive Edge Function tests...\n')
  
  await testDatabasePermissions()
  await testEdgeFunctionWithRealCompany()
  
  console.log('\n🏁 All tests completed!')
  console.log('\n📋 Next steps if tests fail:')
  console.log('1. Check Supabase Edge Function logs for detailed error messages')
  console.log('2. Verify RLS policies allow service_role to insert into users table')
  console.log('3. Check if auth.admin.createUser has proper permissions')
  console.log('4. Ensure SUPABASE_SERVICE_ROLE_KEY is correctly set in Edge Function environment')
}

runAllTests()