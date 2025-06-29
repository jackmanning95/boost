// Comprehensive debugging script for invite-user Edge Function
// Addresses all the recommended verification points
// Run with: node comprehensive-debug-script.js

const SUPABASE_URL = 'https://usbowqbohkdfadhclypx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzYm93cWJvaGtkZmFkaGNseXB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTU1MjE4NzQsImV4cCI6MjAzMTA5Nzg3NH0.Ej6phn9OtWNbLBXOBYgKJULdCJhMQJGJZKNJZKNJZKN'

// ✅ 1. CHECK SUPABASE AUTH API RATE LIMITS & QUOTAS
async function checkAuthApiLimits() {
  console.log('\n🔍 1. CHECKING AUTH API LIMITS & QUOTAS')
  console.log('=' * 50)
  
  try {
    const startTime = Date.now()
    
    // Test multiple rapid requests to check rate limiting
    const promises = Array.from({ length: 5 }, (_, i) => 
      fetch(`${SUPABASE_URL}/functions/v1/invite-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: `rate-test-${i}@example.com`,
          name: 'Rate Test',
          role: 'user',
          companyId: 'test-company-id'
        })
      })
    )
    
    const responses = await Promise.all(promises)
    const endTime = Date.now()
    
    console.log('Rate limit test results:')
    console.log(`- Total requests: ${promises.length}`)
    console.log(`- Time taken: ${endTime - startTime}ms`)
    console.log(`- Average response time: ${(endTime - startTime) / promises.length}ms`)
    
    const statusCodes = responses.map(r => r.status)
    console.log(`- Status codes: ${statusCodes.join(', ')}`)
    
    const rateLimited = statusCodes.some(code => code === 429)
    if (rateLimited) {
      console.log('⚠️  Rate limiting detected - this is expected for rapid requests')
    } else {
      console.log('✅ No rate limiting detected in test')
    }
    
  } catch (error) {
    console.log('❌ Auth API limit check failed:', error.message)
  }
}

// ✅ 2. VERIFY ROW LEVEL SECURITY (RLS) & DB PERMISSIONS
async function checkRlsAndDbPermissions() {
  console.log('\n🔐 2. VERIFYING RLS & DB PERMISSIONS')
  console.log('=' * 50)
  
  const tables = [
    { name: 'companies', operations: ['SELECT'] },
    { name: 'users', operations: ['SELECT', 'INSERT', 'UPDATE'] }
  ]
  
  for (const table of tables) {
    console.log(`\nTesting ${table.name} table:`)
    
    for (const operation of table.operations) {
      try {
        let response
        
        switch (operation) {
          case 'SELECT':
            response = await fetch(`${SUPABASE_URL}/rest/v1/${table.name}?select=count&head=true`, {
              headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY
              }
            })
            break
            
          case 'INSERT':
            // Test insert with minimal data (will likely fail due to constraints, but tests RLS)
            response = await fetch(`${SUPABASE_URL}/rest/v1/${table.name}`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ test: 'data' })
            })
            break
            
          case 'UPDATE':
            // Test update (will likely fail, but tests RLS)
            response = await fetch(`${SUPABASE_URL}/rest/v1/${table.name}?id=eq.test`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ test: 'update' })
            })
            break
        }
        
        if (response.ok) {
          console.log(`  ✅ ${operation} - Allowed`)
        } else {
          const errorText = await response.text()
          console.log(`  ❌ ${operation} - Status: ${response.status}`)
          console.log(`     Error: ${errorText.substring(0, 100)}...`)
        }
        
      } catch (error) {
        console.log(`  ❌ ${operation} - Error: ${error.message}`)
      }
    }
  }
}

// ✅ 3. TEST EMAIL TEMPLATES & MAIL PROVIDER INTEGRATION
async function checkEmailConfiguration() {
  console.log('\n📧 3. TESTING EMAIL TEMPLATES & MAIL PROVIDER')
  console.log('=' * 50)
  
  try {
    // Test with a real company to see if email sending works
    const companies = await getCompanies()
    
    if (companies.length === 0) {
      console.log('❌ No companies found - cannot test email functionality')
      return
    }
    
    const testCompany = companies[0]
    const testEmail = `email-test-${Date.now()}@example.com`
    
    console.log(`Testing email functionality with company: ${testCompany.name}`)
    console.log(`Test email: ${testEmail}`)
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/invite-user`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testEmail,
        name: 'Email Test User',
        role: 'user',
        companyId: testCompany.id
      })
    })
    
    const result = await response.json()
    
    if (result.success) {
      console.log('✅ Email test completed successfully')
      console.log('   Check the Edge Function logs for email sending details')
    } else {
      console.log('❌ Email test failed:', result.error)
      if (result.debug) {
        console.log('   Debug info:', JSON.stringify(result.debug, null, 2))
      }
    }
    
  } catch (error) {
    console.log('❌ Email configuration check failed:', error.message)
  }
}

// ✅ 4. CONFIRM ENVIRONMENT VARIABLES CHECKLIST
async function checkEnvironmentVariables() {
  console.log('\n🔧 4. ENVIRONMENT VARIABLES CHECKLIST')
  console.log('=' * 50)
  
  // Test the function with missing data to trigger env var validation
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
    console.log('Environment variables status:')
    Object.entries(result.debug.checklist).forEach(([key, value]) => {
      console.log(`  ${value ? '✅' : '❌'} ${key}`)
    })
  } else {
    console.log('⚠️  Could not retrieve environment variable status')
    console.log('Response:', JSON.stringify(result, null, 2))
  }
}

// ✅ 5. TEST IDEMPOTENCY (PARTIAL/INCOMPLETE USERS)
async function testIdempotency() {
  console.log('\n🔄 5. TESTING IDEMPOTENCY & PARTIAL USER HANDLING')
  console.log('=' * 50)
  
  try {
    const companies = await getCompanies()
    
    if (companies.length === 0) {
      console.log('❌ No companies found - cannot test idempotency')
      return
    }
    
    const testCompany = companies[0]
    const testEmail = `idempotency-test-${Date.now()}@example.com`
    
    const testData = {
      email: testEmail,
      name: 'Idempotency Test User',
      role: 'user',
      companyId: testCompany.id
    }
    
    console.log('First invitation attempt...')
    const firstResponse = await fetch(`${SUPABASE_URL}/functions/v1/invite-user`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    })
    
    const firstResult = await firstResponse.json()
    console.log('First attempt result:', firstResult.success ? 'SUCCESS' : 'FAILED')
    
    if (firstResult.success) {
      console.log('Second invitation attempt (should be idempotent)...')
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const secondResponse = await fetch(`${SUPABASE_URL}/functions/v1/invite-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData)
      })
      
      const secondResult = await secondResponse.json()
      console.log('Second attempt result:', secondResult.success ? 'SUCCESS' : 'FAILED')
      
      if (secondResult.success && secondResult.debug && secondResult.debug.idempotent) {
        console.log('✅ Idempotency test PASSED - Function handles existing users gracefully')
      } else if (secondResult.success) {
        console.log('⚠️  Idempotency test PARTIAL - Function succeeded but may not be truly idempotent')
      } else {
        console.log('❌ Idempotency test FAILED - Function should handle existing users')
        console.log('Error:', secondResult.error)
      }
    } else {
      console.log('❌ Cannot test idempotency - first invitation failed')
      console.log('Error:', firstResult.error)
    }
    
  } catch (error) {
    console.log('❌ Idempotency test failed:', error.message)
  }
}

// ✅ 6. LOG AND VERIFY INVITE PAYLOADS
async function testPayloadLogging() {
  console.log('\n📝 6. TESTING PAYLOAD LOGGING & DATA INTEGRITY')
  console.log('=' * 50)
  
  const testCases = [
    {
      name: 'Valid payload',
      data: {
        email: 'valid@example.com',
        name: 'Valid User',
        role: 'user',
        companyId: 'valid-company-id'
      }
    },
    {
      name: 'Malformed email',
      data: {
        email: 'invalid-email-format',
        name: 'Test User',
        role: 'user',
        companyId: 'valid-company-id'
      }
    },
    {
      name: 'Empty name',
      data: {
        email: 'test@example.com',
        name: '',
        role: 'user',
        companyId: 'valid-company-id'
      }
    },
    {
      name: 'Invalid role',
      data: {
        email: 'test@example.com',
        name: 'Test User',
        role: 'invalid-role',
        companyId: 'valid-company-id'
      }
    }
  ]
  
  for (const testCase of testCases) {
    console.log(`\nTesting: ${testCase.name}`)
    
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/invite-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase.data)
      })
      
      const result = await response.json()
      
      console.log(`  Status: ${response.status}`)
      console.log(`  Success: ${result.success}`)
      
      if (result.debug) {
        console.log(`  Debug info available: ✅`)
        if (result.debug.received) {
          console.log(`  Payload validation logged: ✅`)
        }
      } else {
        console.log(`  Debug info available: ❌`)
      }
      
      if (!result.success) {
        console.log(`  Error: ${result.error}`)
      }
      
    } catch (error) {
      console.log(`  ❌ Test failed: ${error.message}`)
    }
  }
}

// Helper function to get companies
async function getCompanies() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/companies?select=id,name&limit=5`, {
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
async function runComprehensiveDebug() {
  console.log('🚀 COMPREHENSIVE INVITE-USER DEBUGGING')
  console.log('=' * 60)
  console.log('This script addresses all recommended verification points:')
  console.log('1. Auth API rate limits & quotas')
  console.log('2. RLS & DB permissions')
  console.log('3. Email templates & mail provider')
  console.log('4. Environment variables checklist')
  console.log('5. Idempotency & partial user handling')
  console.log('6. Payload logging & data integrity')
  console.log('=' * 60)
  
  await checkAuthApiLimits()
  await checkRlsAndDbPermissions()
  await checkEmailConfiguration()
  await checkEnvironmentVariables()
  await testIdempotency()
  await testPayloadLogging()
  
  console.log('\n🏁 COMPREHENSIVE DEBUGGING COMPLETED!')
  console.log('=' * 60)
  console.log('\n📋 NEXT STEPS:')
  console.log('1. Review the test results above')
  console.log('2. Check Supabase Edge Function logs for detailed error messages')
  console.log('3. Verify any failed tests in your Supabase dashboard')
  console.log('4. Ensure all environment variables are properly set')
  console.log('5. Check RLS policies if database operations failed')
  console.log('6. Verify email provider configuration if email tests failed')
  console.log('\n💡 TIP: Run this script after making any changes to verify fixes')
}

runComprehensiveDebug()