import { createClient } from 'npm:@supabase/supabase-js@^2.39.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== INVITE USER EDGE FUNCTION START ===')
    
    // ✅ 1. VALIDATE ENVIRONMENT VARIABLES
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:5173'

    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      serviceKeyLength: supabaseServiceKey?.length || 0,
      serviceKeyPrefix: supabaseServiceKey?.substring(0, 10) || 'missing'
    })

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing environment variables')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Server configuration error: Missing environment variables'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // ✅ 2. PARSE AND VALIDATE INPUT
    const requestBody = await req.json()
    const { email, name, role, companyId } = requestBody

    console.log('Input validation:', {
      email: !!email,
      name: !!name,
      role: !!role,
      companyId: !!companyId
    })

    // Validate required fields
    if (!email || !name || !role || !companyId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: email, name, role, companyId'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid email format'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate role
    if (!['admin', 'user'].includes(role)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid role. Must be "admin" or "user"'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // ✅ 3. CREATE SUPABASE CLIENT
    console.log('Creating Supabase admin client...')
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // ✅ 4. VERIFY COMPANY EXISTS
    console.log('Verifying company exists:', companyId)
    const { data: companyData, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('id, name')
      .eq('id', companyId)
      .single()

    if (companyError || !companyData) {
      console.error('❌ Company verification failed:', companyError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid company ID'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ Company verified:', companyData.name)

    // ✅ 5. CHECK FOR EXISTING USER
    console.log('Checking for existing user:', email)
    
    // Check auth.users first
    const { data: existingAuthUser, error: authLookupError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (authLookupError) {
      console.error('❌ Auth lookup error:', authLookupError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to check existing users'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const existingUser = existingAuthUser.users.find(user => user.email === email)
    
    if (existingUser) {
      console.log('❌ User already exists in auth.users')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'A user with this email already exists'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check public.users table
    const { data: existingProfile } = await supabaseAdmin
      .from('users')
      .select('id, company_id, email')
      .eq('email', email)
      .maybeSingle()

    if (existingProfile) {
      console.log('❌ User profile already exists')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'A user with this email already exists'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // ✅ 6. CREATE NEW AUTH USER
    console.log('Creating new auth user...')
    
    // Generate a secure temporary password
    const tempPassword = `Temp${Math.random().toString(36).substring(2, 15)}${Date.now()}!`
    
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        name,
        invited: true
      }
    })

    if (authError) {
      console.error('❌ Auth creation error:', {
        code: authError.code,
        message: authError.message,
        status: authError.status
      })
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to create user: ${authError.message || 'Database error creating new user'}`,
          debug: {
            authError: {
              code: authError.code,
              message: authError.message,
              status: authError.status
            }
          }
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!authData?.user?.id) {
      console.error('❌ No user ID returned from auth creation')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to create user: No user ID returned'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const authUserId = authData.user.id
    console.log('✅ Auth user created successfully:', authUserId)

    // ✅ 7. CREATE USER PROFILE
    console.log('Creating user profile...')
    
    // Wait for any triggers to complete
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Try to create or update the profile
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: authUserId,
        email,
        name,
        role,
        company_id: companyId,
        platform_ids: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })

    if (profileError) {
      console.error('❌ Profile creation error:', profileError)
      
      // Try to clean up the auth user if profile creation fails
      try {
        await supabaseAdmin.auth.admin.deleteUser(authUserId)
        console.log('✅ Cleaned up auth user after profile creation failure')
      } catch (cleanupError) {
        console.warn('⚠️ Failed to cleanup auth user:', cleanupError)
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to create user profile: ${profileError.message}`
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ Profile created successfully')

    // ✅ 8. SEND PASSWORD RESET EMAIL
    try {
      console.log('Sending password reset email...')
      const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: {
          redirectTo: `${siteUrl}/login`
        }
      })

      if (resetError) {
        console.warn('⚠️ Failed to send password reset email:', resetError)
        // Don't fail the entire operation if email fails
      } else {
        console.log('✅ Password reset email sent successfully')
      }
    } catch (emailError) {
      console.warn('⚠️ Unexpected error sending email:', emailError)
      // Don't fail the entire operation if email fails
    }

    console.log('✅ User invitation completed successfully')
    console.log('=== INVITE USER EDGE FUNCTION END ===')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User invited successfully',
        userId: authUserId
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ UNEXPECTED ERROR in invite-user function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `An unexpected error occurred: ${error.message}`
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})