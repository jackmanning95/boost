// Edge Function Environment Diagnostic & Fix Script
// This script will:
// 1. Check if the Edge Function is properly configured
// 2. Verify the service role key is correct
// 3. Test the invite-user function with real data
// 4. Provide detailed error information and fix instructions

const SUPABASE_URL = 'https://usbowqbohkdfadhclypx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzYm93cWJvaGtkZmFkaGNseXB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTU1MjE4NzQsImV4cCI6MjAzMTA5Nzg3NH0.Ej6phn9OtWNbLBXOBYgKJULdCJhMQJGJZKNJZKNJZKN'

// ✅ STEP 1: Get a real company for testing
async function getCompanies() {
  console.log('🔍 Fetching companies from database...')
  
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

// ✅ STEP 2: Check Edge Function environment variables
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
    
    const responseText = await response.text()
    console.log('Raw response:', responseText)
    
    try {
      const result = JSON.parse(responseText)
      
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
          console.log('1. Go to Supabase Dashboard → Project Settings → API')
          console.log('2. Copy your service role key (not the anon key)')
          console.log('3. Go to Edge Functions → invite-user → Settings')
          console.log('4. Set SUPABASE_SERVICE_ROLE_KEY to your service role key')
          console.log('5. Redeploy the function')
        } else {
          console.log('\n✅ All required environment variables are set!')
        }
      } else {
        console.log('⚠️  Could not retrieve environment variable status')
        console.log('Response:', JSON.stringify(result, null, 2))
      }
    } catch (parseError) {
      console.log('⚠️  Could not parse response as JSON:', parseError.message)
      console.log('This might indicate a server error or malformed response')
    }
    
  } catch (error) {
    console.log('❌ Environment variable check failed:', error.message)
  }
}

// ✅ STEP 3: Test the invite function with real data
async function testInviteWithRealCompany() {
  console.log('\n🧪 Testing invite-user with real company data...')
  
  try {
    // First, get a real company ID from the database
    const companies = await getCompanies()
    
    if (companies.length === 0) {
      console.log('❌ No companies found - cannot test invite function')
      return
    }
    
    const testCompany = companies[0]
    console.log('✅ Using company:', testCompany.name)
    
    // Now test the Edge Function with real data
    const testData = {
      email: `test.user.${Date.now()}@example.com`, // Unique email
      name: 'Test User',
      role: 'user',
      companyId: testCompany.id
    }
    
    console.log('📤 Testing Edge Function with:', {
      email: testData.email,
      name: testData.name,
      role: testData.role,
      companyId: testData.companyId.substring(0, 8) + '...'
    })
    
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
        
        if (responseData.error?.includes('unexpected_failure')) {
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

// ✅ STEP 4: Provide the correct service role key
function showCorrectServiceRoleKey() {
  console.log('\n🔑 CORRECT SERVICE ROLE KEY:')
  console.log('=' * 80)
  console.log('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzYm93cWJvaGtkZmFkaGNseXB4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Njg0MDI3MywiZXhwIjoyMDYyNDE2MjczfQ.oOTE-ub0S_hNa7DdkQ0oCnXLt2vQl3k6bknLcG8TPrU')
  console.log('=' * 80)
  console.log('\n⚠️  IMPORTANT: This is the correct service role key for your project.')
  console.log('Copy this EXACT key (no extra spaces or characters) and set it in your Edge Function.')
}

// ✅ STEP 5: Provide detailed fix instructions
function showFixInstructions() {
  console.log('\n🔧 HOW TO FIX THE INVITE-USER FUNCTION:')
  console.log('=' * 80)
  console.log('1. Go to Supabase Dashboard → Edge Functions → invite-user → Settings')
  console.log('2. Delete the current SUPABASE_SERVICE_ROLE_KEY variable')
  console.log('3. Add a new SUPABASE_SERVICE_ROLE_KEY with the exact key shown above')
  console.log('4. Make sure there are no extra spaces or characters')
  console.log('5. Click "Deploy" to redeploy the function')
  console.log('6. Wait for deployment to complete')
  console.log('7. Run this script again to verify the fix')
}

// Main function
async function runDiagnostic() {
  console.log('🚀 INVITE-USER FUNCTION DIAGNOSTIC')
  console.log('=' * 80)
  console.log('This script will help identify and fix issues with your invite-user Edge Function.')
  
  // Show the correct service role key
  showCorrectServiceRoleKey()
  
  // Check environment variables
  await checkEnvironmentVariables()
  
  // Test the invite function
  await testInviteWithRealCompany()
  
  // Show fix instructions
  showFixInstructions()
  
  console.log('\n🏁 DIAGNOSTIC COMPLETE')
  console.log('Follow the instructions above to fix your invite-user function.')
}

// Run the diagnostic
runDiagnostic()