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
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      urlValue: supabaseUrl ? 'present' : 'missing'
    })

    // Validate environment variables
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables:', { 
        hasUrl: !!supabaseUrl, 
        hasServiceKey: !!supabaseServiceKey 
      })
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Server configuration error: Missing required environment variables',
          details: {
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

    // Parse request body
    let requestBody
    try {
      requestBody = await req.json()
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError)
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

    console.log('Request data:', { email, name, role, companyId })

    // Validate required fields
    if (!email || !name || !role || !companyId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: email, name, role, companyId',
          received: { email: !!email, name: !!name, role: !!role, companyId: !!companyId }
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

    // Create Supabase admin client
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
      console.log('Supabase admin client created successfully')
    } catch (clientError) {
      console.error('Failed to create Supabase client:', clientError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to initialize database connection' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if admin methods are available
    if (!supabaseAdmin.auth.admin) {
      console.error('Admin methods not available on Supabase client')
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

    // Verify company exists
    const { data: companyData, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('id, name')
      .eq('id', companyId)
      .single()

    if (companyError || !companyData) {
      console.error('Company verification failed:', companyError)
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

    console.log('Company verified:', companyData)

    // Check if user already exists in auth.users
    let existingAuthUser
    try {
      const { data: authUserData, error: authLookupError } = await supabaseAdmin.auth.admin.getUserByEmail(email)
      
      if (authLookupError && !authLookupError.message.includes('User not found')) {
        console.error('Auth lookup error:', authLookupError)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Failed to check existing users: ${authLookupError.message}` 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      existingAuthUser = authUserData?.user
      console.log('Auth user lookup result:', { exists: !!existingAuthUser, email })
    } catch (authError) {
      console.error('Unexpected auth lookup error:', authError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to verify user status: ${authError instanceof Error ? authError.message : String(authError)}`,
          details: authError instanceof Error ? authError.stack : undefined
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    let authUserId: string

    if (existingAuthUser) {
      console.log('User exists in auth, checking profile...')
      
      // User exists in auth, check if they have a profile in public.users
      const { data: existingProfile, error: profileLookupError } = await supabaseAdmin
        .from('users')
        .select('id, company_id, email')
        .eq('id', existingAuthUser.id)
        .maybeSingle()

      if (profileLookupError) {
        console.error('Profile lookup error:', profileLookupError)
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
        console.log('User profile exists:', existingProfile)
        
        // User has a profile, check if they're already in this company
        if (existingProfile.company_id === companyId) {
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
          // User exists but has no company, update their profile
          console.log('Updating existing user profile with company...')
          
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
            console.error('Profile update error:', updateError)
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

          authUserId = existingAuthUser.id
        }
      } else {
        // User exists in auth but no profile, create profile
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
          console.error('Profile creation error:', profileError)
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

        authUserId = existingAuthUser.id
      }
    } else {
      // User doesn't exist, create new auth user
      console.log('Creating new auth user...')
      
      const tempPassword = `TempPass${Math.random().toString(36).substring(2, 15)}!`

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
        console.error('Auth creation error:', authError)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Failed to create user: ${authError.message}` 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      if (!authData?.user?.id) {
        console.error('No user ID returned from auth creation')
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

      console.log('Auth user created successfully:', authData.user.id)

      // Create user profile in the users table
      const { error: profileError } = await supabaseAdmin
        .from('users')
        .insert({
          id: authData.user.id,
          email,
          name,
          role,
          company_id: companyId,
          platform_ids: {}
        })

      if (profileError) {
        console.error('Profile creation error:', profileError)
        
        // Clean up the auth user if profile creation fails
        try {
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
          console.log('Cleaned up auth user after profile creation failure')
        } catch (cleanupError) {
          console.error('Failed to cleanup auth user:', cleanupError)
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

      console.log('User profile created successfully')
      authUserId = authData.user.id
    }

    // Send password reset email so user can set their own password
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
        console.warn('Failed to send password reset email:', resetError)
        // Don't fail the entire operation if email sending fails
      } else {
        console.log('Password reset email sent successfully')
      }
    } catch (emailError) {
      console.warn('Unexpected error sending password reset email:', emailError)
      // Don't fail the entire operation if email sending fails
    }

    console.log('User invitation completed successfully for:', email)

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
    console.error('Unexpected error in invite-user function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`,
        stack: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})