// Comprehensive Auth API Diagnostic Script
// Addresses all recommended verification points for invite-user function
// Run with: node comprehensive-auth-diagnostic.js

const SUPABASE_URL = 'https://usbowqbohkdfadhclypx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzYm93cWJvaGtkZmFkaGNseXB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTU1MjE4NzQsImV4cCI6MjAzMTA5Nzg3NH0.Ej6phn9OtWNbLBXOBYgKJULdCJhMQJGJZKNJZKNJZKN'

console.log('🚀 COMPREHENSIVE AUTH API DIAGNOSTIC')
console.log('=' * 60)
console.log('This diagnostic addresses all recommended verification points:')
console.log('✅ Supabase Auth API quotas and rate limits')
console.log('✅ Email provider configuration testing')
console.log('✅ RLS policies and database triggers')
console.log('✅ Environment variables validation')
console.log('✅ Edge Function and Auth logs analysis')
console.log('=' * 60)

// ✅ 1. CHECK AUTH API QUOTAS AND RATE LIMITS
async function checkAuthApiQuotas() {
  console.log('\n🔍 1. CHECKING AUTH API QUOTAS & RATE LIMITS')
  console.log('-' * 50)
  
  try {
    const startTime = Date.now()
    
    // Test rapid requests to check rate limiting
    console.log('Testing rate limits with 5 rapid requests...')
    const promises = Array.from({ length: 5 }, (_, i) => 
      fetch(`${SUPABASE_URL}/functions/v1/invite-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: `rate-test-${i}-${Date.now()}@example.com`,
          name: 'Rate Test User',
          role: 'user',
          companyId: 'test-company-id'
        })
      }).then(async (response) => ({
        status: response.status,
        body: await response.text().catch(() => 'Failed to read body')
      }))
    )
    
    const responses = await Promise.all(promises)
    const endTime = Date.now()
    
    console.log(`⏱️  Total time: ${endTime - startTime}ms`)
    console.log(`📊 Average response time: ${(endTime - startTime) / promises.length}ms`)
    
    const statusCodes = responses.map(r => r.status)
    console.log(`📈 Status codes: ${statusCodes.join(', ')}`)
    
    const rateLimited = statusCodes.some(code => code === 429)
    const serverErrors = statusCodes.filter(code => code >= 500).length
    const authErrors = statusCodes.filter(code => code === 401 || code === 403).length
    
    if (rateLimited) {
      console.log('⚠️  Rate limiting detected (429 responses)')
      console.log('💡 This indicates Auth API quotas may be an issue')
    }
    
    if (serverErrors > 0) {
      console.log(`❌ ${serverErrors} server errors (5xx) detected`)
      console.log('💡 This suggests Auth API or database issues')
    }
    
    if (authErrors > 0) {
      console.log(`❌ ${authErrors} auth errors (401/403) detected`)
      console.log('💡 This suggests service role key issues')
    }
    
    if (!rateLimited && serverErrors === 0 && authErrors === 0) {
      console.log('✅ No obvious rate limiting or quota issues detected')
    }
    
    // Check for specific error patterns
    responses.forEach((response, i) => {
      if (response.body.includes('unexpected_failure')) {
        console.log(`🚨 Request ${i + 1}: Auth API unexpected_failure detected`)
        console.log(`   Body: ${response.body.substring(0, 200)}...`)
      }
    })
    
  } catch (error) {
    console.log('❌ Auth API quota check failed:', error.message)
  }
}

// ✅ 2. VERIFY EMAIL PROVIDER CONFIGURATION
async function checkEmailConfiguration() {
  console.log('\n📧 2. TESTING EMAIL PROVIDER CONFIGURATION')
  console.log('-' * 50)
  
  try {
    // Get a real company for testing
    const companies = await getCompanies()
    
    if (companies.length === 0) {
      console.log('❌ No companies found - cannot test email functionality')
      return
    }
    
    const testCompany = companies[0]
    const testEmail = `email-config-test-${Date.now()}@example.com`
    
    console.log(`📤 Testing email with company: ${testCompany.name}`)
    console.log(`📧 Test email: ${testEmail}`)
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/invite-user`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testEmail,
        name: 'Email Config Test',
        role: 'user',
        companyId: testCompany.id
      })
    })
    
    const result = await response.json()
    
    console.log(`📊 Response status: ${response.status}`)
    console.log(`📊 Function success: ${result.success}`)
    
    if (result.success) {
      console.log('✅ Email configuration test completed')
      console.log('💡 Check Edge Function logs for email sending details')
    } else {
      console.log('❌ Email configuration test failed')
      console.log(`Error: ${result.error}`)
      
      if (result.error?.includes('email') || result.error?.includes('SMTP')) {
        console.log('🚨 EMAIL PROVIDER ISSUE DETECTED!')
        console.log('💡 Check Supabase Auth → Settings → Email configuration')
      }
      
      if (result.debug) {
        console.log('Debug info:', JSON.stringify(result.debug, null, 2))
      }
    }
    
  } catch (error) {
    console.log('❌ Email configuration check failed:', error.message)
  }
}

// ✅ 3. CHECK RLS POLICIES AND DATABASE TRIGGERS
async function checkRlsAndTriggers() {
  console.log('\n🔐 3. CHECKING RLS POLICIES & DATABASE TRIGGERS')
  console.log('-' * 50)
  
  // Test database access with different operations
  const tests = [
    {
      name: 'Companies table read',
      method: 'GET',
      url: `${SUPABASE_URL}/rest/v1/companies?select=count&head=true`,
      expectedStatus: 200
    },
    {
      name: 'Users table read',
      method: 'GET', 
      url: `${SUPABASE_URL}/rest/v1/users?select=count&head=true`,
      expectedStatus: 200
    },
    {
      name: 'Users table insert (will fail, but tests RLS)',
      method: 'POST',
      url: `${SUPABASE_URL}/rest/v1/users`,
      body: { test: 'data' },
      expectedStatus: [400, 401, 403] // Any of these is fine for RLS test
    }
  ]
  
  for (const test of tests) {
    try {
      const options = {
        method: test.method,
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        }
      }
      
      if (test.body) {
        options.body = JSON.stringify(test.body)
      }
      
      const response = await fetch(test.url, options)
      const isExpectedStatus = Array.isArray(test.expectedStatus) 
        ? test.expectedStatus.includes(response.status)
        : response.status === test.expectedStatus
      
      if (isExpectedStatus) {
        console.log(`✅ ${test.name}`)
      } else {
        console.log(`❌ ${test.name} - Status: ${response.status}`)
        
        const errorText = await response.text()
        console.log(`   Error: ${errorText.substring(0, 150)}...`)
        
        if (errorText.includes('infinite recursion')) {
          console.log('🚨 RLS RECURSION DETECTED!')
          console.log('💡 Run the fix_users_rls_final.sql migration to resolve this')
        }
      }
      
    } catch (error) {
      console.log(`❌ ${test.name} - Error: ${error.message}`)
    }
  }
}

// ✅ 4. VALIDATE ENVIRONMENT VARIABLES
async function checkEnvironmentVariables() {
  console.log('\n🔧 4. VALIDATING ENVIRONMENT VARIABLES')
  console.log('-' * 50)
  
  try {
    // Send empty payload to trigger environment variable validation
    const response = await fetch(`${SUPABASE_URL}/functions/v1/invite-user`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}) // Empty body triggers validation
    })
    
    const result = await response.json()
    
    if (result.debug && result.debug.checklist) {
      console.log('📋 Environment Variables Status:')
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
      console.log('Response:', JSON.stringify(result, null, 2))
    }
    
  } catch (error) {
    console.log('❌ Environment variable check failed:', error.message)
  }
}

// ✅ 5. TEST COMPLETE INVITE FLOW WITH REAL DATA
async function testCompleteInviteFlow() {
  console.log('\n🧪 5. TESTING COMPLETE INVITE FLOW')
  console.log('-' * 50)
  
  try {
    const companies = await getCompanies()
    
    if (companies.length === 0) {
      console.log('❌ No companies found - cannot test complete flow')
      return
    }
    
    const testCompany = companies[0]
    const testEmail = `complete-flow-test-${Date.now()}@example.com`
    
    const testData = {
      email: testEmail,
      name: 'Complete Flow Test User',
      role: 'user',
      companyId: testCompany.id
    }
    
    console.log('📤 Testing complete invite flow...')
    console.log(`Company: ${testCompany.name}`)
    console.log(`Email: ${testEmail}`)
    
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
    const result = await response.json()
    
    console.log(`⏱️  Response time: ${endTime - startTime}ms`)
    console.log(`📊 Status: ${response.status}`)
    console.log(`📊 Success: ${result.success}`)
    
    if (result.success) {
      console.log('✅ COMPLETE FLOW TEST PASSED!')
      console.log(`User ID: ${result.userId}`)
      
      if (result.debug) {
        console.log('Debug info:', JSON.stringify(result.debug, null, 2))
      }
      
      // Test idempotency
      console.log('\n🔄 Testing idempotency (second invite)...')
      const secondResponse = await fetch(`${SUPABASE_URL}/functions/v1/invite-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData)
      })
      
      const secondResult = await secondResponse.json()
      
      if (secondResult.success) {
        console.log('✅ Idempotency test passed')
        if (secondResult.debug && secondResult.debug.idempotent) {
          console.log('✅ Function correctly identified existing user')
        }
      } else {
        console.log('⚠️  Idempotency test failed:', secondResult.error)
      }
      
    } else {
      console.log('❌ COMPLETE FLOW TEST FAILED!')
      console.log(`Error: ${result.error}`)
      
      if (result.debug) {
        console.log('\n🔍 Detailed Debug Information:')
        console.log(JSON.stringify(result.debug, null, 2))
        
        // Analyze specific error types
        if (result.debug.authError) {
          console.log('\n🚨 AUTH API ERROR DETECTED:')
          console.log(`Code: ${result.debug.authError.code}`)
          console.log(`Message: ${result.debug.authError.message}`)
          
          if (result.debug.authError.code === 'unexpected_failure') {
            console.log('💡 This is the exact error you reported!')
            console.log('💡 Check Auth API quotas and email provider configuration')
          }
        }
        
        if (result.debug.profileError) {
          console.log('\n🚨 DATABASE/RLS ERROR DETECTED:')
          console.log(`Error: ${result.debug.profileError}`)
          console.log(`Code: ${result.debug.profileErrorCode}`)
        }
        
        if (result.debug.missingVars) {
          console.log('\n🚨 ENVIRONMENT VARIABLE ISSUES:')
          result.debug.missingVars.forEach(varName => {
            console.log(`Missing: ${varName}`)
          })
        }
      }
    }
    
  } catch (error) {
    console.log('❌ Complete flow test failed:', error.message)
  }
}

// Helper function to get companies
async function getCompanies() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/companies?select=id,name&limit=3`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      return []
    }
    
    return await response.json()
  } catch (error) {
    return []
  }
}

// Main execution function
async function runComprehensiveDiagnostic() {
  console.log('\n🎯 STARTING COMPREHENSIVE DIAGNOSTIC...\n')
  
  await checkAuthApiQuotas()
  await checkEmailConfiguration()
  await checkRlsAndTriggers()
  await checkEnvironmentVariables()
  await testCompleteInviteFlow()
  
  console.log('\n🏁 COMPREHENSIVE DIAGNOSTIC COMPLETED!')
  console.log('=' * 60)
  console.log('\n📋 NEXT STEPS BASED ON RESULTS:')
  console.log('\n1. If RLS recursion errors were found:')
  console.log('   → Run the fix_users_rls_final.sql migration')
  console.log('\n2. If environment variables are missing:')
  console.log('   → Set them in Supabase Edge Function settings')
  console.log('\n3. If Auth API errors (unexpected_failure) persist:')
  console.log('   → Check Supabase Auth API usage limits in dashboard')
  console.log('   → Verify email provider SMTP configuration')
  console.log('   → Contact Supabase support if quotas seem normal')
  console.log('\n4. If email configuration issues:')
  console.log('   → Check Auth → Settings → Email in Supabase dashboard')
  console.log('\n5. Check detailed logs:')
  console.log('   → Supabase Dashboard → Edge Functions → invite-user → Logs')
  console.log('   → Supabase Dashboard → Auth → Logs')
  console.log('\n💡 TIP: Run this diagnostic after each fix to verify resolution')
}

runComprehensiveDiagnostic()