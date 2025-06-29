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
    console.log('✅ Available companies:', companies)
    return companies
  } catch (error) {
    console.error('❌ Error fetching companies:', error.message)
    return []
  }
}

async function testInviteFunction(testData) {
  console.log('\n🧪 Testing invite-user Edge Function...')
  console.log('📤 Test data:', testData)
  
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
    console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()))
    
    const responseText = await response.text()
    console.log('📥 Raw response:', responseText)
    
    try {
      const responseData = JSON.parse(responseText)
      console.log('📥 Parsed response:', JSON.stringify(responseData, null, 2))
      
      if (responseData.success) {
        console.log('✅ SUCCESS - User invitation worked!')
        if (responseData.userId) {
          console.log('User ID:', responseData.userId)
        }
        if (responseData.debug) {
          console.log('Debug info:', JSON.stringify(responseData.debug, null, 2))
        }
      } else {
        console.log('❌ FAILED - User invitation failed')
        console.log('Error:', responseData.error)
        if (responseData.debug) {
          console.log('Debug info:', JSON.stringify(responseData.debug, null, 2))
        }
      }
      
      return responseData
    } catch (parseError) {
      console.log('❌ Failed to parse response as JSON:', parseError.message)
      return { success: false, error: 'Invalid JSON response', rawResponse: responseText }
    }
    
  } catch (error) {
    console.log('❌ Network error:', error.message)
    return { success: false, error: error.message }
  }
}

async function testValidationErrors() {
  console.log('\n🧪 Testing validation errors...')
  
  const testCases = [
    {
      name: 'Missing email',
      data: { name: 'Test User', role: 'user', companyId: 'test-id' }
    },
    {
      name: 'Invalid email format',
      data: { email: 'invalid-email', name: 'Test User', role: 'user', companyId: 'test-id' }
    },
    {
      name: 'Invalid role',
      data: { email: 'test@example.com', name: 'Test User', role: 'invalid', companyId: 'test-id' }
    },
    {
      name: 'Missing company ID',
      data: { email: 'test@example.com', name: 'Test User', role: 'user' }
    }
  ]
  
  for (const testCase of testCases) {
    console.log(`\n📝 Testing: ${testCase.name}`)
    const result = await testInviteFunction(testCase.data)
    
    if (!result.success && result.error) {
      console.log(`✅ Validation test PASSED - Correctly rejected: ${result.error}`)
    } else {
      console.log(`❌ Validation test FAILED - Should have rejected ${testCase.name}`)
    }
  }
}

async function testWithRealCompany() {
  console.log('\n🧪 Testing with real company data...')
  
  const companies = await getCompanies()
  
  if (companies.length === 0) {
    console.log('❌ No companies found - cannot test with real data')
    return
  }
  
  const testCompany = companies[0]
  console.log('✅ Using company:', testCompany)
  
  const testData = {
    email: `test.user.${Date.now()}@example.com`, // Unique email
    name: 'Test User Debug',
    role: 'user',
    companyId: testCompany.id
  }
  
  const result = await testInviteFunction(testData)
  
  if (result.success) {
    console.log('🎉 REAL DATA TEST PASSED!')
  } else {
    console.log('💥 REAL DATA TEST FAILED!')
    console.log('This is the error you need to investigate:')
    console.log('Error:', result.error)
    if (result.debug) {
      console.log('Debug details:', JSON.stringify(result.debug, null, 2))
    }
  }
}

async function checkDatabasePermissions() {
  console.log('\n🔐 Testing database permissions...')
  
  const tests = [
    { table: 'companies', description: 'Companies table read access' },
    { table: 'users', description: 'Users table read access' }
  ]
  
  for (const test of tests) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${test.table}?select=count&head=true`, {
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY
        }
      })
      
      if (response.ok) {
        console.log(`✅ ${test.description}`)
      } else {
        console.log(`❌ ${test.description} - Status: ${response.status}`)
      }
    } catch (error) {
      console.log(`❌ ${test.description} - Error: ${error.message}`)
    }
  }
}

async function runComprehensiveDebug() {
  console.log('🚀 Starting comprehensive invite-user debugging...\n')
  
  // Step 1: Check basic permissions
  await checkDatabasePermissions()
  
  // Step 2: Test validation
  await testValidationErrors()
  
  // Step 3: Test with real data
  await testWithRealCompany()
  
  console.log('\n🏁 Debugging completed!')
  console.log('\n📋 Next steps if issues persist:')
  console.log('1. Check Supabase Edge Function logs in the dashboard')
  console.log('2. Verify SUPABASE_SERVICE_ROLE_KEY is set in Edge Function environment')
  console.log('3. Check RLS policies on users table allow service_role to insert')
  console.log('4. Verify the handle_new_user_with_company trigger is working')
  console.log('5. Check if auth.admin.createUser has proper permissions')
}

runComprehensiveDebug()