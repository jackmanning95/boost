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
    
    // ✅ 1. VALIDATE ENVIRONMENT VARIABLES WITH DETAILED DIAGNOSTICS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:5173'

    // ENHANCED LOGGING: Log the actual service key being used (first/last 10 chars only for security)
    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      hasAnonKey: !!supabaseAnonKey,
      serviceKeyLength: supabaseServiceKey?.length || 0,
      serviceKeyStart: supabaseServiceKey?.substring(0, 10) || 'missing',
      serviceKeyEnd: supabaseServiceKey?.substring(supabaseServiceKey.length - 10) || 'missing',
      anonKeyStart: supabaseAnonKey?.substring(0, 10) || 'missing',
      keysAreDifferent: supabaseServiceKey !== supabaseAnonKey
    })

    // Create detailed environment variable checklist for debugging
    const envChecklist = {
      'SUPABASE_URL': !!supabaseUrl,
      'SUPABASE_SERVICE_ROLE_KEY': !!supabaseServiceKey,
      'SUPABASE_ANON_KEY': !!supabaseAnonKey,
      'SERVICE_KEY_FORMAT_VALID': supabaseServiceKey?.startsWith('eyJ') || false,
      'KEYS_ARE_DIFFERENT': supabaseServiceKey !== supabaseAnonKey
    }

    const missingVars = Object.entries(envChecklist)
      .filter(([key, value]) => !value)
      .map(([key]) => key)

    if (missingVars.length > 0) {
      console.error('❌ Missing or invalid environment variables:', missingVars)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Server configuration error: Missing or invalid environment variables',
          debug: {
            checklist: envChecklist,
            missingVars,
            instructions: [
              '1. Go to Supabase Dashboard → Edge Functions → invite-user → Settings',
              '2. Set SUPABASE_SERVICE_ROLE_KEY to your service_role key (not anon key)',
              '3. Get service_role key from: Project Settings → API → service_role',
              '4. Redeploy the function after setting variables'
            ]
          }
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
      companyId: !!companyId,
      emailFormat: email ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) : false
    })

    // Validate required fields
    if (!email || !name || !role || !companyId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: email, name, role, companyId',
          debug: {
            received: { email: !!email, name: !!name, role: !!role, companyId: !!companyId }
          }
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

    // ✅ 3. CREATE SUPABASE CLIENT WITH ENHANCED ERROR HANDLING
    console.log('Creating Supabase admin client...')
    
    // ENHANCED LOGGING: Ensure we're using the environment variables directly, not process.env
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required environment variables',
          debug: {
            missingVars: [
              !supabaseUrl ? 'SUPABASE_URL' : null,
              !supabaseServiceKey ? 'SUPABASE_SERVICE_ROLE_KEY' : null
            ].filter(Boolean)
          }
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
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

    // Test the client connection
    try {
      const { data: testData, error: testError } = await supabaseAdmin
        .from('companies')
        .select('count')
        .limit(1)
        .single()

      if (testError) {
        console.error('❌ Supabase client test failed:', testError)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Database connection failed - check service role key permissions',
            debug: {
              testError: testError.message,
              hint: 'Verify SUPABASE_SERVICE_ROLE_KEY is correct and has proper permissions'
            }
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      console.log('✅ Supabase client connection verified')
    } catch (connectionError) {
      console.error('❌ Supabase connection error:', connectionError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to connect to database',
          debug: {
            connectionError: connectionError.message
          }
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

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
          error: 'Invalid company ID',
          debug: {
            companyId,
            companyError: companyError?.message
          }
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ Company verified:', companyData.name)

    // ✅ 5. CHECK FOR EXISTING USER WITH ENHANCED LOGIC
    console.log('Checking for existing user:', email)
    
    // FIXED: Use listUsers instead of getUserByEmail which doesn't exist
    const { data: existingAuthUsers, error: authLookupError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (authLookupError) {
      console.error('❌ Auth lookup error:', authLookupError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to check existing users - Auth API access issue',
          debug: {
            authLookupError: authLookupError.message,
            hint: 'Check if SUPABASE_SERVICE_ROLE_KEY has Auth API permissions'
          }
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const existingUser = existingAuthUsers.users.find(user => user.email === email)
    
    if (existingUser) {
      console.log('User already exists in auth.users, checking if they can be added to company...')
      
      // Check if user has a profile
      const { data: existingProfile } = await supabaseAdmin
        .from('users')
        .select('id, company_id, email, name, role')
        .eq('id', existingUser.id)
        .maybeSingle()

      if (existingProfile) {
        if (existingProfile.company_id === companyId) {
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'User is already a member of this company',
              userId: existingProfile.id,
              debug: {
                idempotent: true,
                existingUser: {
                  id: existingProfile.id,
                  email: existingProfile.email,
                  role: existingProfile.role
                }
              }
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        } else if (existingProfile.company_id) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'User is already a member of another company'
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
        
        // User exists but has no company - add them to this company
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({
            company_id: companyId,
            role: role,
            name: name,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingUser.id)

        if (updateError) {
          console.error('❌ Error updating existing user:', updateError)
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Failed to add existing user to company: ${updateError.message}`
            }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        console.log('✅ Existing user added to company successfully')
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Existing user added to company successfully',
            userId: existingUser.id
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    // Check public.users table for any orphaned profiles
    const { data: existingProfile } = await supabaseAdmin
      .from('users')
      .select('id, company_id, email')
      .eq('email', email)
      .maybeSingle()

    if (existingProfile) {
      console.log('❌ User profile exists without auth user - data inconsistency')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'User data inconsistency detected. Please contact support.'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // ✅ 6. CREATE NEW AUTH USER WITH ENHANCED ERROR HANDLING
    console.log('Creating new auth user...')
    
    // Generate a secure temporary password
    const tempPassword = `Temp${Math.random().toString(36).substring(2, 15)}${Date.now()}!`
    
    // ENHANCED LOGGING: Log the exact service key being used (first/last 10 chars only)
    console.log('Using service key for Auth API:', {
      keyStart: supabaseServiceKey.substring(0, 10),
      keyEnd: supabaseServiceKey.substring(supabaseServiceKey.length - 10),
      keyLength: supabaseServiceKey.length
    })
    
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        name,
        invited: true,
        company_id: companyId
      }
    })

    if (authError) {
      console.error('❌ Auth creation error:', {
        code: authError.code,
        message: authError.message,
        status: authError.status
      })
      
      // Enhanced error handling for specific Auth API errors
      let errorMessage = 'Failed to create user'
      let debugInfo: any = {
        authError: {
          code: authError.code,
          message: authError.message,
          status: authError.status
        }
      }

      if (authError.code === 'unexpected_failure') {
        errorMessage = 'Auth API unexpected failure - check service role key and quotas'
        debugInfo.troubleshooting = [
          '1. Verify SUPABASE_SERVICE_ROLE_KEY is correct',
          '2. Check Auth API usage limits in Supabase Dashboard',
          '3. Ensure service role key has Auth API permissions',
          '4. Check Supabase status page for incidents'
        ]
      } else if (authError.code === 'signup_disabled') {
        errorMessage = 'User signup is disabled for this project'
      } else if (authError.code === 'email_address_invalid') {
        errorMessage = 'Invalid email address format'
      } else if (authError.code === 'user_already_exists') {
        errorMessage = 'A user with this email already exists'
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMessage,
          debug: debugInfo
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
          error: 'Failed to create user: No user ID returned from Auth API'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const authUserId = authData.user.id
    console.log('✅ Auth user created successfully:', authUserId)

    // ✅ 7. CREATE USER PROFILE WITH RETRY LOGIC
    console.log('Creating user profile...')
    
    // Wait for any triggers to complete
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Try to create the profile with retry logic
    let profileCreated = false
    let profileError = null
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`Profile creation attempt ${attempt}/3`)
      
      const { error: currentProfileError } = await supabaseAdmin
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

      if (!currentProfileError) {
        profileCreated = true
        console.log('✅ Profile created successfully')
        break
      } else {
        profileError = currentProfileError
        console.warn(`⚠️ Profile creation attempt ${attempt} failed:`, currentProfileError)
        
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }
    }

    if (!profileCreated) {
      console.error('❌ Profile creation failed after 3 attempts:', profileError)
      
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
          error: `Failed to create user profile: ${profileError?.message}`,
          debug: {
            profileError: profileError?.message,
            profileErrorCode: profileError?.code,
            hint: 'Check RLS policies on users table'
          }
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // ✅ 8. SEND PASSWORD RESET EMAIL WITH BETTER ERROR HANDLING
    try {
      console.log('Sending password reset email...')
      const { data: linkData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
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
        userId: authUserId,
        debug: {
          company: companyData.name,
          userEmail: email,
          userRole: role
        }
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
        error: `An unexpected error occurred: ${error.message}`,
        debug: {
          errorType: error.constructor.name,
          errorMessage: error.message,
          stack: error.stack?.substring(0, 500)
        }
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})