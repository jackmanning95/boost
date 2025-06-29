// Test script to verify service role access to database
// This helps identify if the issue is with environment variables or RLS policies

const SUPABASE_URL = 'https://usbowqbohkdfadhclypx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzYm93cWJvaGtkZmFkaGNseXB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTU1MjE4NzQsImV4cCI6MjAzMTA5Nzg3NH0.Ej6phn9OtWNbLBXOBYgKJULdCJhMQJGJZKNJZKNJZKN'

// NOTE: You'll need to get your service role key from Supabase Dashboard
// Go to Settings → API → service_role key
const SUPABASE_SERVICE_KEY = 'YOUR_SERVICE_ROLE_KEY_HERE' // Replace with actual key

async function testServiceRoleAccess() {
  console.log('🔐 Testing service role access to database...')
  
  if (SUPABASE_SERVICE_KEY === 'YOUR_SERVICE_ROLE_KEY_HERE') {
    console.log('❌ Please replace SUPABASE_SERVICE_KEY with your actual service role key')
    console.log('Get it from: Supabase Dashboard → Settings → API → service_role key')
    return
  }
  
  // Test 1: Read companies table with service role
  console.log('\n📋 Test 1: Reading companies table with service role...')
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/companies?select=id,name&limit=1`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      const companies = await response.json()
      console.log('✅ Service role can read companies table')
      console.log('Sample company:', companies[0] ? { id: companies[0].id.substring(0, 8) + '...', name: companies[0].name } : 'None found')
      return companies[0] // Return first company for further testing
    } else {
      console.log('❌ Service role cannot read companies table')
      console.log('Status:', response.status)
      const errorText = await response.text()
      console.log('Error:', errorText)
      return null
    }
  } catch (error) {
    console.log('❌ Error testing companies table access:', error.message)
    return null
  }
}

async function testUserTableAccess(testCompany) {
  if (!testCompany) {
    console.log('⏭️  Skipping user table test - no company available')
    return
  }
  
  console.log('\n👥 Test 2: Testing users table access with service role...')
  
  // Test reading users table
  console.log('Testing SELECT on users table...')
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/users?select=count&head=true`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY
      }
    })
    
    if (response.ok) {
      console.log('✅ Service role can read users table')
    } else {
      console.log('❌ Service role cannot read users table')
      console.log('Status:', response.status)
    }
  } catch (error) {
    console.log('❌ Error reading users table:', error.message)
  }
  
  // Test inserting into users table
  console.log('Testing INSERT on users table...')
  const testUserId = `test-${Date.now()}`
  const testEmail = `test-${Date.now()}@example.com`
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: testUserId,
        email: testEmail,
        name: 'Test User',
        role: 'user',
        company_id: testCompany.id,
        platform_ids: {}
      })
    })
    
    if (response.ok) {
      console.log('✅ Service role can insert into users table')
      
      // Clean up - delete the test user
      await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${testUserId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apikey': SUPABASE_SERVICE_KEY
        }
      })
      console.log('✅ Test user cleaned up')
      
    } else {
      console.log('❌ Service role cannot insert into users table')
      console.log('Status:', response.status)
      const errorText = await response.text()
      console.log('Error:', errorText)
      
      if (errorText.includes('RLS') || errorText.includes('policy')) {
        console.log('\n🚨 RLS POLICY ISSUE DETECTED!')
        console.log('The service role is being blocked by Row Level Security policies.')
        console.log('Run the fix-rls-policies.sql script to resolve this.')
      }
    }
  } catch (error) {
    console.log('❌ Error inserting into users table:', error.message)
  }
}

async function runServiceRoleTest() {
  console.log('🧪 SERVICE ROLE ACCESS TEST')
  console.log('=' * 40)
  console.log('This test verifies if your service role key can access the database properly.\n')
  
  const testCompany = await testServiceRoleAccess()
  await testUserTableAccess(testCompany)
  
  console.log('\n📋 SUMMARY:')
  console.log('If the service role cannot insert into the users table, this is likely')
  console.log('the cause of your invite-user function failures.')
  console.log('\nTo fix RLS issues:')
  console.log('1. Run the fix-rls-policies.sql script in your Supabase SQL editor')
  console.log('2. Ensure the service role key is correctly set in Edge Function environment')
  console.log('3. Re-test the invite-user function')
}

runServiceRoleTest()