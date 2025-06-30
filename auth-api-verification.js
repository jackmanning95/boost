// Auth API Verification Script
// Run with: node auth-api-verification.js

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

async function checkEnvironmentVariables() {
  console.log('\n🔧 Checking Edge Function environment variables...')
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/invite-user`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}) // Empty body to trigger validation
    })
    
    const result = await response.json()
    
    if (result.debug && result.debug.checklist) {
      console.log('\n🔍 ENVIRONMENT VARIABLES STATUS:')
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

async function testInviteUser() {
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

async function runVerification() {
  console.log('🚀 STARTING AUTH API VERIFICATION')
  console.log('=' * 50)
  
  // Check environment variables
  await checkEnvironmentVariables()
  
  // Test the invite function
  await testInviteUser()
  
  console.log('\n🏁 VERIFICATION COMPLETED!')
  console.log('\n📋 NEXT STEPS:')
  console.log('1. If environment variables are missing, add them in Supabase Dashboard')
  console.log('2. If RLS errors persist, run the fix_users_rls_final.sql migration')
  console.log('3. If Auth API errors persist, check:')
  console.log('   - Email provider configuration in Supabase Auth settings')
  console.log('   - Auth API quotas in Supabase Dashboard')
  console.log('   - Service role key permissions')
  console.log('4. Check Edge Function logs in Supabase Dashboard for more details')
}

runVerification()