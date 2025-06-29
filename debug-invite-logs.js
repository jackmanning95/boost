// Immediate debugging script to check Edge Function logs and identify the exact issue
// Run with: node debug-invite-logs.js

const SUPABASE_URL = 'https://usbowqbohkdfadhclypx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzYm93cWJvaGtkZmFkaGNseXB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTU1MjE4NzQsImV4cCI6MjAzMTA5Nzg3NH0.Ej6phn9OtWNbLBXOBYgKJULdCJhMQJGJZKNJZKNJZKN'

async function getCompanies() {
  console.log('🔍 Step 1: Fetching real companies from database...')
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/companies?select=id,name&limit=3`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
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

async function testInviteWithDetailedLogging(testData) {
  console.log('\n🧪 Step 2: Testing invite-user function with detailed logging...')
  console.log('📤 Sending payload:', {
    email: testData.email,
    name: testData.name,
    role: testData.role,
    companyId: testData.companyId.substring(0, 8) + '...'
  })
  
  try {
    const startTime = Date.now()
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/invite-user`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    })
    
    const endTime = Date.now()
    const responseTime = endTime - startTime
    
    console.log('\n📥 RESPONSE DETAILS:')
    console.log('Status:', response.status)
    console.log('Response time:', responseTime + 'ms')
    console.log('Headers:', Object.fromEntries(response.headers.entries()))
    
    const responseText = await response.text()
    console.log('\n📄 RAW RESPONSE:')
    console.log(responseText)
    
    try {
      const responseData = JSON.parse(responseText)
      console.log('\n📊 PARSED RESPONSE:')
      console.log(JSON.stringify(responseData, null, 2))
      
      if (responseData.success) {
        console.log('\n✅ SUCCESS!')
        console.log('User ID:', responseData.userId)
        return { success: true, data: responseData }
      } else {
        console.log('\n❌ FAILURE DETECTED!')
        console.log('Error:', responseData.error)
        
        if (responseData.debug) {
          console.log('\n🔍 DEBUG INFORMATION:')
          console.log(JSON.stringify(responseData.debug, null, 2))
          
          // Analyze specific debug information
          if (responseData.debug.missingVars) {
            console.log('\n🚨 MISSING ENVIRONMENT VARIABLES:')
            responseData.debug.missingVars.forEach(varName => {
              console.log(`  ❌ ${varName}`)
            })
          }
          
          if (responseData.debug.authError) {
            console.log('\n🚨 AUTH API ERROR:')
            console.log('  Error:', responseData.debug.authError.message)
            console.log('  Code:', responseData.debug.authError.code)
          }
          
          if (responseData.debug.profileError) {
            console.log('\n🚨 DATABASE/RLS ERROR:')
            console.log('  Error:', responseData.debug.profileError)
            console.log('  Code:', responseData.debug.profileErrorCode)
          }
        }
        
        return { success: false, error: responseData.error, debug: responseData.debug }
      }
      
    } catch (parseError) {
      console.log('\n❌ FAILED TO PARSE JSON RESPONSE')
      console.log('Parse error:', parseError.message)
      console.log('This usually indicates a server error or malformed response')
      return { success: false, error: 'Invalid JSON response', rawResponse: responseText }
    }
    
  } catch (networkError) {
    console.log('\n❌ NETWORK ERROR')
    console.log('Error:', networkError.message)
    return { success: false, error: networkError.message }
  }
}

async function checkEnvironmentVariables() {
  console.log('\n🔧 Step 3: Checking environment variables...')
  
  // Send empty payload to trigger environment variable validation
  try {
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
        console.log('3. Redeploy the function')
      } else {
        console.log('\n✅ All environment variables are set!')
      }
    } else {
      console.log('⚠️  Could not retrieve environment variable status')
    }
    
  } catch (error) {
    console.log('❌ Environment variable check failed:', error.message)
  }
}

async function checkDatabaseAccess() {
  console.log('\n🗄️  Step 4: Checking database access...')
  
  const tests = [
    {
      name: 'Companies table read',
      url: `${SUPABASE_URL}/rest/v1/companies?select=count&head=true`
    },
    {
      name: 'Users table read',
      url: `${SUPABASE_URL}/rest/v1/users?select=count&head=true`
    }
  ]
  
  for (const test of tests) {
    try {
      const response = await fetch(test.url, {
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY
        }
      })
      
      if (response.ok) {
        console.log(`✅ ${test.name}`)
      } else {
        console.log(`❌ ${test.name} - Status: ${response.status}`)
        const errorText = await response.text()
        console.log(`   Error: ${errorText.substring(0, 100)}...`)
      }
    } catch (error) {
      console.log(`❌ ${test.name} - Error: ${error.message}`)
    }
  }
}

async function runDiagnostics() {
  console.log('🚀 INVITE-USER FUNCTION DIAGNOSTICS')
  console.log('=' * 50)
  console.log('This will help identify the exact cause of your invite-user errors.\n')
  
  // Step 1: Check database access
  await checkDatabaseAccess()
  
  // Step 2: Check environment variables
  await checkEnvironmentVariables()
  
  // Step 3: Get real companies for testing
  const companies = await getCompanies()
  
  if (companies.length === 0) {
    console.log('\n❌ Cannot proceed with function test - no companies found')
    console.log('Please ensure you have at least one company in your database')
    return
  }
  
  // Step 4: Test the function with real data
  const testCompany = companies[0]
  const testData = {
    email: `debug-test-${Date.now()}@example.com`,
    name: 'Debug Test User',
    role: 'user',
    companyId: testCompany.id
  }
  
  const result = await testInviteWithDetailedLogging(testData)
  
  // Step 5: Provide specific recommendations
  console.log('\n🎯 DIAGNOSIS & RECOMMENDATIONS:')
  console.log('=' * 50)
  
  if (result.success) {
    console.log('✅ Function is working correctly!')
    console.log('The issue may be intermittent or related to specific data.')
  } else {
    console.log('❌ Function is failing. Here\'s what to check:')
    
    if (result.error?.includes('environment variables')) {
      console.log('\n🔧 ENVIRONMENT VARIABLE ISSUE:')
      console.log('1. Go to Supabase Dashboard')
      console.log('2. Navigate to Edge Functions → invite-user → Settings')
      console.log('3. Ensure SUPABASE_SERVICE_ROLE_KEY is set (not anon key)')
      console.log('4. Redeploy the function')
    }
    
    if (result.error?.includes('Auth API') || result.error?.includes('createUser')) {
      console.log('\n🔐 AUTH API ISSUE:')
      console.log('1. Check if you\'re hitting Auth API rate limits')
      console.log('2. Verify service role key has admin permissions')
      console.log('3. Check Supabase Auth settings')
    }
    
    if (result.error?.includes('profile') || result.error?.includes('RLS')) {
      console.log('\n🗄️  DATABASE/RLS ISSUE:')
      console.log('1. Check RLS policies on users table')
      console.log('2. Ensure service_role can insert into users table')
      console.log('3. Verify the handle_new_user_with_company trigger')
    }
    
    if (result.error?.includes('company')) {
      console.log('\n🏢 COMPANY VALIDATION ISSUE:')
      console.log('1. Verify the company ID exists')
      console.log('2. Check RLS policies on companies table')
    }
  }
  
  console.log('\n📋 NEXT STEPS:')
  console.log('1. Check Supabase Edge Function logs for more details')
  console.log('2. Address any issues identified above')
  console.log('3. Re-run this diagnostic script to verify fixes')
  console.log('4. If issues persist, share the debug output above')
}

runDiagnostics()