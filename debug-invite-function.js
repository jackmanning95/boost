// Enhanced debugging script for invite-user Edge Function
// Run with: node debug-invite-function.js

const SUPABASE_URL = 'https://usbowqbohkdfadhclypx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzYm93cWJvaGtkZmFkaGNseXB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTU1MjE4NzQsImV4cCI6MjAzMTA5Nzg3NH0.Ej6phn9OtWNbLBXOBYgKJULdCJhMQJGJZKNJZKNJZKN'

async function getCompanies() {
  console.log('📋 Fetching companies from database...')
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/companies?select=id,name&limit=5`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      console.error('❌ Failed to fetch companies:', response.status, await response.text())
      return []
    }
    
    const companies = await response.json()
    console.log('📋 Available companies:', companies)
    
    if (companies.length === 0) {
      console.error('❌ No companies found in database')
      return []
    }
    
    return companies
  } catch (error) {
    console.error('❌ Error fetching companies:', error)
    return []
  }
}

async function testInviteWithRealCompany() {
  console.log('🧪 Testing invite-user with real company data...')
  
  try {
    // First, get a real company ID from the database
    const companies = await getCompanies()
    
    if (companies.length === 0) {
      console.log('❌ Cannot proceed with function test - no companies found')
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

async function checkDatabasePermissions() {
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

async function checkEnvironmentVariables() {
  console.log('\n🔧 Checking Edge Function environment variables...')
  
  try {
    // Send empty payload to trigger environment variable validation
    const response = await fetch(`${SUPABASE_URL}/functions/v1/invite-user`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}) // Empty body
    })
    
    const result = await response.json()
    
    if (result.debug && result.debug.checklist) {
      console.log('\n📋 ENVIRONMENT VARIABLES STATUS:')
      Object.entries(result.debug.checklist).forEach(([key, value]) => {
        console.log(`  ${value ? '✅' : '❌'} ${key}`)
      })
      
      const missingVars = Object.entries(result.debug.checklist)
        .filter(([key, value]) => !value)
        .map(([key]) => key)
      
      if (missingVars.length > 0) {
        console.log('\n🚨 MISSING ENVIRONMENT VARIABLES:')
        missingVars.forEach(varName => {
          console.log(`  ❌ ${varName}`)
        })
        console.log('\n💡 TO FIX:')
        console.log('1. Go to Supabase Dashboard → Edge Functions → invite-user → Settings')
        console.log('2. Add the missing environment variables')
        console.log('3. Ensure SUPABASE_SERVICE_ROLE_KEY is the SERVICE ROLE key (not anon)')
        console.log('4. Redeploy the function')
      } else {
        console.log('\n✅ All required environment variables are set!')
      }
    } else {
      console.log('⚠️  Could not retrieve environment variable status')
    }
    
  } catch (error) {
    console.log('❌ Environment variable check failed:', error.message)
  }
}

async function runAllTests() {
  console.log('🚀 Starting comprehensive Edge Function tests...\n')
  
  await checkDatabasePermissions()
  await checkEnvironmentVariables()
  await testInviteWithRealCompany()
  
  console.log('\n🏁 All tests completed!')
  console.log('\n📋 Next steps if tests fail:')
  console.log('1. Check Supabase Edge Function logs for detailed error messages')
  console.log('2. Verify RLS policies allow service_role to insert into users table')
  console.log('3. Check if auth.admin.createUser has proper permissions')
  console.log('4. Ensure SUPABASE_SERVICE_ROLE_KEY is correctly set in Edge Function environment')
}

runAllTests()