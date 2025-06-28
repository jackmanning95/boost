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
    console.log('Request headers:', Object.fromEntries(req.headers.entries()))

    // ✅ 1. LOG ENVIRONMENT VARIABLES
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const siteUrl = Deno.env.get('SITE_URL')

    console.log('Environment variables check:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      hasSiteUrl: !!siteUrl,
      urlValue: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'missing',
      siteUrlValue: siteUrl || 'missing'
    })

    // Validate environment variables
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing critical environment variables')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Server configuration error: Missing required environment variables',
          debug: {
            hasUrl: !!supabaseUrl,
            hasServiceKey: !!supabaseServiceKey
          }
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // ✅ 2. LOG INPUT DATA
    let requestBody
    try {
      const rawBody = await req.text()
      console.log('Raw request body:', rawBody)
      requestBody = JSON.parse(rawBody)
      console.log('Parsed request body:', requestBody)
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid request body format',
          debug: { parseError: parseError.message }
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { email, name, role, companyId } = requestBody

    console.log('✅ Input validation:', {
      email: email || 'MISSING',
      name: name || 'MISSING',
      role: role || 'MISSING',
      companyId: companyId || 'MISSING',
      emailValid: email ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) : false,
      roleValid: role ? ['admin', 'user'].includes(role) : false
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
          error: 'Invalid email format',
          debug: { email }
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
          error: 'Invalid role. Must be "admin" or "user"',
          debug: { role }
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // ✅ 3. CREATE SUPABASE CLIENT AND TEST PERMISSIONS
    console.log('Creating Supabase admin client...')
    let supabaseAdmin
    try {
      supabaseAdmin = createClient(
        supabaseUrl,
        supabaseServiceKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      )
      console.log('✅ Supabase admin client created successfully')
    } catch (clientError) {
      console.error('❌ Failed to create Supabase client:', clientError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to initialize database connection',
          debug: { clientError: clientError.message }
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Test admin methods availability
    if (!supabaseAdmin.auth.admin) {
      console.error('❌ Admin methods not available on Supabase client')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Server configuration error: Admin privileges not available' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // ✅ 4. TEST DATABASE PERMISSIONS - Check if we can read companies table
    console.log('Testing database permissions...')
    try {
      const { data: testCompanies, error: testError } = await supabaseAdmin
        .from('companies')
        .select('count')
        .limit(1)

      if (testError) {
        console.error('❌ Database permission test failed:', testError)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Database permission error: Cannot access companies table',
            debug: { 
              testError: testError.message,
              code: testError.code,
              details: testError.details
            }
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      console.log('✅ Database permissions test passed')
    } catch (permError) {
      console.error('❌ Unexpected database permission error:', permError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Database permission test failed',
          debug: { permError: permError.message }
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // ✅ 5. VERIFY COMPANY EXISTS
    console.log('Verifying company exists:', companyId)
    const { data: companyData, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('id, name')
      .eq('id', companyId)
      .single()

    if (companyError || !companyData) {
      console.error('❌ Company verification failed:', {
        error: companyError,
        companyId,
        data: companyData
      })
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid company ID',
          debug: { 
            companyId,
            companyError: companyError?.message,
            companyData
          }
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ Company verified:', companyData)

    // ✅ 6. CHECK EXISTING AUTH USER
    console.log('Checking for existing auth user:', email)
    let existingAuthUser
    try {
      const { data: usersData, error: authLookupError } = await supabaseAdmin.auth.admin.listUsers()
      
      if (authLookupError) {
        console.error('❌ Auth lookup error:', authLookupError)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Failed to check existing users: ${authLookupError.message}`,
            debug: { authLookupError }
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Find user by email in the list
      existingAuthUser = usersData.users?.find(user => user.email === email)
      console.log('Auth user lookup result:', { 
        exists: !!existingAuthUser, 
        email,
        totalUsers: usersData.users?.length || 0
      })
    } catch (authError) {
      console.error('❌ Unexpected auth lookup error:', authError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to verify user status: ${authError.message}`,
          debug: { 
            authError: authError.message,
            stack: authError.stack
          }
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
      
      // ✅ 7. CHECK EXISTING PROFILE
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
            error: `Failed to check user profile: ${profileLookupError.message}`,
            debug: { profileLookupError }
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      console.log('Profile lookup result:', existingProfile)

      if (existingProfile) {
        // User has a profile, check company membership
        if (existingProfile.company_id === companyId) {
          console.log('❌ User already in this company')
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'User is already a member of this company',
              debug: { existingProfile }
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
              error: 'User is already a member of another company',
              debug: { existingProfile }
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        } else {
          // ✅ 8. UPDATE EXISTING USER PROFILE
          console.log('Updating existing user profile with company...')
          
          const updateData = {
            name,
            role,
            company_id: companyId,
            updated_at: new Date().toISOString()
          }
          
          console.log('Update data:', updateData)
          
          const { error: updateError } = await supabaseAdmin
            .from('users')
            .update(updateData)
            .eq('id', existingAuthUser.id)

          if (updateError) {
            console.error('❌ Profile update error:', updateError)
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: `Failed to update user profile: ${updateError.message}`,
                debug: { 
                  updateError,
                  updateData,
                  userId: existingAuthUser.id
                }
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
        // ✅ 9. CREATE PROFILE FOR EXISTING AUTH USER
        console.log('Creating profile for existing auth user...')
        
        const profileData = {
          id: existingAuthUser.id,
          email,
          name,
          role,
          company_id: companyId,
          platform_ids: {}
        }
        
        console.log('Profile data:', profileData)
        
        const { error: profileError } = await supabaseAdmin
          .from('users')
          .upsert(profileData, {
            onConflict: 'id'
          })

        if (profileError) {
          console.error('❌ Profile creation error:', profileError)
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Failed to create user profile: ${profileError.message}`,
              debug: { 
                profileError,
                profileData
              }
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
      // ✅ 10. CREATE NEW AUTH USER
      console.log('Creating new auth user...')
      
      const tempPassword = `TempPass${Math.random().toString(36).substring(2, 15)}!`
      const userMetadata = {
        name,
        invited: true,
        role,
        company_id: companyId,
        platform_ids: {}
      }

      console.log('Creating auth user with metadata:', userMetadata)

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: userMetadata
      })

      if (authError) {
        console.error('❌ Auth creation error:', authError)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Failed to create user: ${authError.message}`,
            debug: { 
              authError,
              userMetadata,
              tempPasswordLength: tempPassword.length
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
            error: 'Failed to create user: No user ID returned',
            debug: { authData }
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      console.log('✅ Auth user created successfully:', {
        userId: authData.user.id,
        email: authData.user.email,
        confirmed: authData.user.email_confirmed_at
      })
      
      // Let the handle_new_user_with_company trigger handle the profile creation
      console.log('Profile creation will be handled by database trigger')
      
      authUserId = authData.user.id

      // ✅ 11. VERIFY TRIGGER CREATED PROFILE
      console.log('Waiting for trigger to create profile...')
      
      // Wait a moment for the trigger to execute
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const { data: triggerProfile, error: triggerError } = await supabaseAdmin
        .from('users')
        .select('id, email, name, role, company_id')
        .eq('id', authUserId)
        .maybeSingle()

      if (triggerError) {
        console.error('❌ Error checking trigger-created profile:', triggerError)
      } else if (triggerProfile) {
        console.log('✅ Trigger created profile successfully:', triggerProfile)
      } else {
        console.warn('⚠️ Trigger did not create profile, creating manually...')
        
        const manualProfileData = {
          id: authUserId,
          email,
          name,
          role,
          company_id: companyId,
          platform_ids: {}
        }
        
        const { error: manualProfileError } = await supabaseAdmin
          .from('users')
          .insert(manualProfileData)

        if (manualProfileError) {
          console.error('❌ Manual profile creation error:', manualProfileError)
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Failed to create user profile manually: ${manualProfileError.message}`,
              debug: { 
                manualProfileError,
                manualProfileData
              }
            }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
        
        console.log('✅ Manual profile creation successful')
      }
    }

    // ✅ 12. SEND PASSWORD RESET EMAIL
    try {
      const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:5173'
      console.log('Sending password reset email to:', email, 'with redirect to:', siteUrl)
      
      const { data: linkData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: {
          redirectTo: `${siteUrl}/login`
        }
      })

      if (resetError) {
        console.warn('⚠️ Failed to send password reset email:', resetError)
        // Don't fail the entire operation if email sending fails
      } else {
        console.log('✅ Password reset email sent successfully')
      }
    } catch (emailError) {
      console.warn('⚠️ Unexpected error sending password reset email:', emailError)
      // Don't fail the entire operation if email sending fails
    }

    console.log('✅ User invitation completed successfully for:', email)
    console.log('=== INVITE USER EDGE FUNCTION END ===')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User invited successfully',
        debug: {
          userId: authUserId,
          email,
          companyId,
          role
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
          stack: error.stack,
          name: error.name,
          cause: error.cause
        }
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})