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
    console.log('Request method:', req.method)
    console.log('Request URL:', req.url)

    // ✅ 1. VALIDATE ENVIRONMENT VARIABLES
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:5173'

    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      hasSiteUrl: !!siteUrl,
      serviceKeyPrefix: supabaseServiceKey ? supabaseServiceKey.substring(0, 20) + '...' : 'missing'
    })

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing environment variables')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Server configuration error: Missing environment variables',
          debug: {
            checklist: {
              SUPABASE_URL: !!supabaseUrl,
              SUPABASE_SERVICE_ROLE_KEY: !!supabaseServiceKey,
              SITE_URL: !!siteUrl
            }
          }
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // ✅ 2. PARSE AND VALIDATE INPUT
    let requestBody
    try {
      const rawBody = await req.text()
      console.log('Raw request body:', rawBody)
      requestBody = JSON.parse(rawBody)
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid request body format'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { email, name, role, companyId } = requestBody

    console.log('✅ Input received:', {
      email: email || 'MISSING',
      name: name || 'MISSING', 
      role: role || 'MISSING',
      companyId: companyId || 'MISSING'
    })

    // Validate required fields
    if (!email || !name || !role || !companyId) {
      console.error('❌ Missing required fields')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: email, name, role, companyId',
          debug: {
            received: { 
              email: !!email, 
              name: !!name, 
              role: !!role, 
              companyId: !!companyId 
            }
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
      console.error('❌ Invalid email format:', email)
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
      console.error('❌ Invalid role:', role)
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
          error: 'Invalid company ID',
          debug: { companyError }
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ Company verified:', companyData.name)

    // ✅ 5. CHECK FOR EXISTING USER IN PUBLIC.USERS TABLE FIRST
    console.log('Checking for existing user in public.users table:', email)
    const { data: existingProfile, error: profileLookupError } = await supabaseAdmin
      .from('users')
      .select('id, company_id, email, name, role')
      .eq('email', email)
      .maybeSingle()

    if (profileLookupError) {
      console.error('❌ Profile lookup error:', profileLookupError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to check existing user: ${profileLookupError.message}`,
          debug: { profileLookupError }
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (existingProfile) {
      if (existingProfile.company_id === companyId) {
        console.log('❌ User already in this company')
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'User is already a member of this company'
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      } else if (existingProfile.company_id) {
        console.log('❌ User already in another company')
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
      } else {
        // Update existing user profile to add to company
        console.log('Updating existing user profile to add to company...')
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({
            name,
            role,
            company_id: companyId,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingProfile.id)

        if (updateError) {
          console.error('❌ Profile update error:', updateError)
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Failed to update user profile: ${updateError.message}`,
              debug: { updateError }
            }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        // Send password reset email for existing user
        try {
          console.log('Sending password reset email to existing user...')
          const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email,
            options: {
              redirectTo: `${siteUrl}/login`
            }
          })

          if (resetError) {
            console.warn('⚠️ Failed to send password reset email:', resetError)
          } else {
            console.log('✅ Password reset email sent successfully')
          }
        } catch (emailError) {
          console.warn('⚠️ Unexpected error sending email:', emailError)
        }

        console.log('✅ Existing user updated and added to company')
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'User added to company successfully',
            userId: existingProfile.id
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    // ✅ 6. CREATE NEW AUTH USER
    console.log('Creating new auth user...')
    
    // Generate a secure temporary password
    const tempPassword = `Temp${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}!`
    
    console.log('Auth user creation parameters:', {
      email,
      passwordLength: tempPassword.length,
      emailConfirm: true
    })

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        name,
        invited: true,
        role,
        company_id: companyId
      }
    })

    console.log('Auth creation response:', {
      success: !!authData?.user,
      userId: authData?.user?.id,
      email: authData?.user?.email,
      confirmed: authData?.user?.email_confirmed_at,
      errorCode: authError?.code,
      errorMessage: authError?.message
    })

    if (authError) {
      console.error('❌ Auth creation error:', authError)
      
      // Handle specific auth errors
      if (authError.message?.includes('User already registered') || authError.message?.includes('already exists')) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'A user with this email already exists in the system'
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to create user: ${authError.message}`,
          debug: { authError }
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
    
    // Wait a moment for any triggers to complete
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Check if profile already exists (from trigger)
    const { data: triggerProfile } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', authUserId)
      .maybeSingle()

    if (!triggerProfile) {
      console.log('No profile found from trigger, creating manually...')
      const { error: profileError } = await supabaseAdmin
        .from('users')
        .insert({
          id: authUserId,
          email,
          name,
          role,
          company_id: companyId,
          platform_ids: {}
        })

      if (profileError) {
        console.error('❌ Profile creation error:', profileError)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Failed to create user profile: ${profileError.message}`,
            debug: { profileError }
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      console.log('✅ Profile created manually')
    } else {
      console.log('✅ Profile already exists (created by trigger)')
      
      // Update the profile with company info if needed
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          name,
          role,
          company_id: companyId,
          updated_at: new Date().toISOString()
        })
        .eq('id', authUserId)

      if (updateError) {
        console.warn('⚠️ Failed to update profile with company info:', updateError)
      } else {
        console.log('✅ Profile updated with company info')
      }
    }

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
      } else {
        console.log('✅ Password reset email sent successfully')
      }
    } catch (emailError) {
      console.warn('⚠️ Unexpected error sending email:', emailError)
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
        error: `An unexpected error occurred: ${error.message}`,
        debug: {
          stack: error.stack,
          name: error.name
        }
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})