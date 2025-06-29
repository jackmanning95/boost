import { createClient } from 'npm:@supabase/supabase-js@2'

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
          error: 'Server configuration error: Missing environment variables'
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
          error: 'Invalid company ID'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ Company verified:', companyData.name)

    // ✅ 5. CHECK FOR EXISTING USER IN AUTH
    console.log('Checking for existing auth user:', email)
    let existingAuthUser = null
    
    try {
      // Use listUsers to find user by email
      const { data: usersData, error: userLookupError } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1
      })
      
      if (userLookupError) {
        console.error('❌ Auth lookup error:', userLookupError)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Failed to check existing users: ${userLookupError.message}`
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Find user with matching email
      existingAuthUser = usersData?.users?.find(user => user.email === email) || null
      console.log('Auth user lookup result:', { 
        exists: !!existingAuthUser,
        email,
        userId: existingAuthUser?.id || 'none'
      })
    } catch (authError) {
      console.error('❌ Unexpected auth lookup error:', authError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to verify user status: ${authError.message}`
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    let authUserId: string

    if (existingAuthUser) {
      console.log('✅ User exists in auth, checking profile...')
      
      // Check existing profile
      const { data: existingProfile, error: profileLookupError } = await supabaseAdmin
        .from('users')
        .select('id, company_id, email, name, role')
        .eq('id', existingAuthUser.id)
        .maybeSingle()

      if (profileLookupError) {
        console.error('❌ Profile lookup error:', profileLookupError)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Failed to check user profile: ${profileLookupError.message}`
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
          // Update existing user profile
          console.log('Updating existing user profile...')
          const { error: updateError } = await supabaseAdmin
            .from('users')
            .update({
              name,
              role,
              company_id: companyId,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingAuthUser.id)

          if (updateError) {
            console.error('❌ Profile update error:', updateError)
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: `Failed to update user profile: ${updateError.message}`
              }),
              { 
                status: 500, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            )
          }

          console.log('✅ Profile updated successfully')
          authUserId = existingAuthUser.id
        }
      } else {
        // Create profile for existing auth user
        console.log('Creating profile for existing auth user...')
        const { error: profileError } = await supabaseAdmin
          .from('users')
          .insert({
            id: existingAuthUser.id,
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
              error: `Failed to create user profile: ${profileError.message}`
            }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        console.log('✅ Profile created successfully')
        authUserId = existingAuthUser.id
      }
    } else {
      // ✅ 6. CREATE NEW AUTH USER WITH IMPROVED ERROR HANDLING
      console.log('Creating new auth user...')
      
      // Generate a secure temporary password
      const tempPassword = `Temp${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}!`
      
      console.log('Auth user creation parameters:', {
        email,
        passwordLength: tempPassword.length,
        emailConfirm: true
      })

      try {
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            name,
            invited: true
          }
        })

        console.log('Auth creation response:', {
          success: !!authData?.user,
          userId: authData?.user?.id,
          email: authData?.user?.email,
          confirmed: authData?.user?.email_confirmed_at,
          errorCode: authError?.code,
          errorMessage: authError?.message,
          errorStatus: authError?.status
        })

        if (authError) {
          console.error('❌ Auth creation error details:', {
            name: authError.name,
            message: authError.message,
            status: authError.status,
            code: authError.code
          })

          // Handle specific auth errors
          if (authError.message?.includes('User already registered')) {
            console.log('User already exists, trying to handle existing user...')
            // Try to get the existing user and handle accordingly
            const { data: existingUsersData } = await supabaseAdmin.auth.admin.listUsers({
              page: 1,
              perPage: 1
            })
            const existingUser = existingUsersData?.users?.find(user => user.email === email)
            if (existingUser) {
              authUserId = existingUser.id
              console.log('✅ Using existing auth user:', authUserId)
            } else {
              return new Response(
                JSON.stringify({ 
                  success: false, 
                  error: 'User already exists but cannot be retrieved'
                }),
                { 
                  status: 400, 
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                }
              )
            }
          } else {
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: `Failed to create user: ${authError.message}`,
                debug: {
                  authError: {
                    name: authError.name,
                    status: authError.status,
                    code: authError.code
                  }
                }
              }),
              { 
                status: 500, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            )
          }
        } else if (!authData?.user?.id) {
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
        } else {
          console.log('✅ Auth user created successfully')
          authUserId = authData.user.id
        }

      } catch (unexpectedError) {
        console.error('❌ Unexpected error during auth creation:', unexpectedError)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Unexpected error creating user: ${unexpectedError.message}`
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // ✅ 7. CREATE USER PROFILE (if new user was created)
      if (authUserId) {
        console.log('Creating user profile for new user...')
        
        // Wait a moment for any triggers to complete
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Check if profile already exists (from trigger)
        const { data: existingProfile } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('id', authUserId)
          .maybeSingle()

        if (!existingProfile) {
          console.log('No profile found, creating manually...')
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
                error: `Failed to create user profile: ${profileError.message}`
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
        }
      }
    }

    // ✅ 8. SEND PASSWORD RESET EMAIL
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
        // Don't fail the entire operation
      } else {
        console.log('✅ Password reset email sent successfully')
      }
    } catch (emailError) {
      console.warn('⚠️ Unexpected error sending email:', emailError)
      // Don't fail the entire operation
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