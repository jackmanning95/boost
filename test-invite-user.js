// Test script for invite-user Edge Function
// Run with: node test-invite-user.js

const SUPABASE_URL = 'https://usbowqbohkdfadhclypx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzYm93cWJvaGtkZmFkaGNseXB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTU1MjE4NzQsImV4cCI6MjAzMTA5Nzg3NH0.Ej6phn9OtWNbLBXOBYgKJULdCJhMQJGJZKNJZKNJZKN'

async function testInviteUser() {
  console.log('🧪 Testing invite-user Edge Function...')
  
  const testData = {
    email: 'test.user@example.com',
    name: 'Test User',
    role: 'user',
    companyId: '12345678-1234-1234-1234-123456789012' // Replace with actual company ID
  }
  
  console.log('📤 Sending test data:', testData)
  
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
        console.log('✅ Test PASSED - User invitation successful')
      } else {
        console.log('❌ Test FAILED - User invitation failed')
        console.log('Error:', responseData.error)
        if (responseData.debug) {
          console.log('Debug info:', JSON.stringify(responseData.debug, null, 2))
        }
      }
    } catch (parseError) {
      console.log('❌ Failed to parse response as JSON:', parseError.message)
    }
    
  } catch (error) {
    console.log('❌ Network error:', error.message)
  }
}

// Test with missing fields
async function testMissingFields() {
  console.log('\n🧪 Testing with missing fields...')
  
  const testData = {
    email: 'test@example.com',
    // Missing name, role, companyId
  }
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/invite-user`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    })
    
    const responseData = await response.json()
    console.log('📥 Response:', JSON.stringify(responseData, null, 2))
    
    if (response.status === 400 && !responseData.success) {
      console.log('✅ Validation test PASSED - Correctly rejected missing fields')
    } else {
      console.log('❌ Validation test FAILED - Should have rejected missing fields')
    }
    
  } catch (error) {
    console.log('❌ Network error:', error.message)
  }
}

// Test with invalid email
async function testInvalidEmail() {
  console.log('\n🧪 Testing with invalid email...')
  
  const testData = {
    email: 'invalid-email',
    name: 'Test User',
    role: 'user',
    companyId: '12345678-1234-1234-1234-123456789012'
  }
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/invite-user`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    })
    
    const responseData = await response.json()
    console.log('📥 Response:', JSON.stringify(responseData, null, 2))
    
    if (response.status === 400 && !responseData.success) {
      console.log('✅ Email validation test PASSED - Correctly rejected invalid email')
    } else {
      console.log('❌ Email validation test FAILED - Should have rejected invalid email')
    }
    
  } catch (error) {
    console.log('❌ Network error:', error.message)
  }
}

// Run all tests
async function runAllTests() {
  await testInviteUser()
  await testMissingFields()
  await testInvalidEmail()
  
  console.log('\n🏁 All tests completed!')
  console.log('\n📋 Next steps:')
  console.log('1. Check the Supabase Edge Function logs for detailed output')
  console.log('2. Replace the test companyId with a real one from your database')
  console.log('3. Verify RLS policies allow the service role to insert into users table')
  console.log('4. Check if the handle_new_user_with_company trigger is working correctly')
}

runAllTests()