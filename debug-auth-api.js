// Debug script specifically focused on Auth API issues
// Run with: node debug-auth-api.js

const SUPABASE_URL = 'https://usbowqbohkdfadhclypx.supabase.co'
// Note: Replace this with your actual anon key from Supabase Dashboard → Settings → API
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzYm93cWJvaGtkZmFkaGNseXB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU0NjI0NzQsImV4cCI6MjA1MTA0MjQ3NH0.example_key_replace_with_actual'

async function getCompanies() {
  console.log('🔍 Fetching companies from database...')
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/companies?select=id,name&limit=1`, {
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
    console.log('✅ Found companies:', companies)
    return companies
  } catch (error) {
    console.error('❌ Error fetching companies:', error)
    return []
  }
}

async function testInviteWithDetailedLogging() {
  console.log('\n🧪 TESTING INVITE-USER WITH DETAILED LOGGING')
  console.log('-'.repeat(60))
  
  // Get a real company for testing
  const companies = await getCompanies()
  
  if (companies.length === 0) {
    console.log('❌ No companies found - cannot test invite function')
    // Explicitly return an object with success property to prevent TypeError
    return { 
      success: false, 
      error: 'No companies found to test invite function', 
      debug: { noCompanies: true } 
    }
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
    companyId: testData.companyId
  })
  
  try {
    console.log('Sending request to invite-user function...')
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
    console.log(`⏱️  Response time: ${endTime - startTime}ms`)
    
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
        return { success: true, data: responseData }
      } else {
        console.log('❌ FAILED - User invitation failed')
        console.log('Error:', responseData.error)
        
        // Analyze specific error types
        if (responseData.error && responseData.error.includes('unexpected_failure')) {
          console.log('\n🚨 AUTH API UNEXPECTED FAILURE DETECTED!')
          console.log('This is the exact error you reported.')
          console.log('\n💡 MOST LIKELY CAUSES:')
          console.log('1. SUPABASE_SERVICE_ROLE_KEY is not set correctly')
          console.log('2. Email provider configuration issues')
          console.log('3. Auth API quotas or rate limits')
        }
        
        if (responseData.debug) {
          console.log('Debug info:', JSON.stringify(responseData.debug, null, 2))
          
          if (responseData.debug.authError) {
            console.log('\n🔍 AUTH ERROR DETAILS:')
            console.log('Name:', responseData.debug.authError.name)
            console.log('Code:', responseData.debug.authError.code)
            console.log('Message:', responseData.debug.authError.message)
            console.log('Status:', responseData.debug.authError.status)
          }
        }
        
        return { success: false, error: responseData.error, debug: responseData.debug }
      }
    } catch (parseError) {
      console.log('❌ Failed to parse response as JSON:', parseError.message)
      return { success: false, error: 'Invalid JSON response', rawResponse: responseText }
    }
  } catch (error) {
    console.log('❌ Network error:', error.message)
    return { success: false, error: error.message }
  }
}

async function checkEnvironmentVariables() {
  console.log('\n🔧 CHECKING ENVIRONMENT VARIABLES')
  console.log('-'.repeat(60))
  
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
      console.log('📋 ENVIRONMENT VARIABLES STATUS:')
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

async function runDiagnostic() {
  console.log('🚀 AUTH API DIAGNOSTIC TOOL')
  console.log('='.repeat(60))
  console.log('This tool focuses specifically on Auth API issues in the invite-user function.')
  console.log('It will help identify the exact cause of the "unexpected_failure" error.')
  
  // Check if the anon key looks like a placeholder
  if (SUPABASE_ANON_KEY.includes('example_key_replace_with_actual')) {
    console.log('\n🚨 INVALID SUPABASE ANON KEY DETECTED!')
    console.log('The SUPABASE_ANON_KEY appears to be a placeholder.')
    console.log('\n💡 TO FIX:')
    console.log('1. Go to Supabase Dashboard → Settings → API')
    console.log('2. Copy your "anon public" key')
    console.log('3. Replace the SUPABASE_ANON_KEY value in this script')
    console.log('4. Re-run this diagnostic')
    return
  }
  
  await checkEnvironmentVariables()
  const result = await testInviteWithDetailedLogging()
  
  console.log('\n🎯 DIAGNOSTIC SUMMARY:')
  console.log('='.repeat(60))
  
  // Safely check result.success since we now guarantee result is always an object
  if (result && result.success) {
    console.log('✅ GOOD NEWS! The invite-user function is working correctly.')
    console.log('If you were experiencing issues before, they appear to be resolved.')
  } else {
    console.log('❌ The invite-user function is still failing.')
    
    if (result && result.error) {
      if (result.error.includes('environment variables')) {
        console.log('\n🚨 ENVIRONMENT VARIABLE ISSUE:')
        console.log('1. Go to Supabase Dashboard → Edge Functions → invite-user → Settings')
        console.log('2. Ensure SUPABASE_SERVICE_ROLE_KEY is set (not anon key)')
        console.log('3. Redeploy the function')
      }
      
      if (result.error.includes('unexpected_failure')) {
        console.log('\n🚨 AUTH API ISSUE:')
        console.log('1. Check Supabase Auth → Settings → Email configuration')
        console.log('2. Verify SMTP settings are correct')
        console.log('3. Check Auth API quotas in Supabase Dashboard → Usage')
        console.log('4. Ensure service role key has admin permissions')
      }
      
      if (result.error.includes('company') || result.error.includes('RLS')) {
        console.log('\n🚨 DATABASE/RLS ISSUE:')
        console.log('1. Verify the latest RLS migration has been applied')
        console.log('2. Check that service_role has full access to users table')
      }
      
      if (result.error.includes('No companies found')) {
        console.log('\n🚨 DATABASE ACCESS ISSUE:')
        console.log('1. Verify your Supabase anon key is correct')
        console.log('2. Check RLS policies allow reading companies table')
        console.log('3. Ensure you have at least one company in your database')
      }
    }
  }
  
  console.log('\n📋 NEXT STEPS:')
  console.log('1. Check Supabase Edge Function logs for more details')
  console.log('2. Address any issues identified above')
  console.log('3. Re-run this diagnostic to verify fixes')
  console.log('4. If issues persist, share the debug output with Supabase support')
}

runDiagnostic()