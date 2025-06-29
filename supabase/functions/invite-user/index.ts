import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Rate limiting helper
const rateLimitMap = new Map()
const RATE_LIMIT_WINDOW = 60000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10

function checkRateLimit(email: string): boolean {
  const now = Date.now()
  const key = `invite_${email}`
  const requests = rateLimitMap.get(key) || []
  
  // Clean old requests
  const validRequests = requests.filter((time: number) => now - time < RATE_LIMIT_WINDOW)
  
  if (validRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    return false
  }
  
  validRequests.push(now)
  rateLimitMap.set(key, validRequests)
  return true
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
    console.log('Timestamp:', new Date().toISOString())

    // ✅ 1. COMPREHENSIVE ENVIRONMENT VARIABLE VALIDATION
    const requiredEnvVars = {
      SUPABASE_URL: Deno.env.get('SUPABASE_URL'),
      SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      SUPABASE_ANON_KEY: Deno.env.get('SUPABASE_ANON_KEY'),
      SITE_URL: Deno.env.get('SITE_URL') || 'http://localhost:5173'
    }

    console.log('Environment variables check:', {
      SUPABASE_URL: !!requiredEnvVars.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!requiredEnvVars.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_ANON_KEY: !!requiredEnvVars.SUPABASE_ANON_KEY,
      SITE_URL: !!requiredEnvVars.SITE_URL,
      serviceKeyPrefix: requiredEnvVars.SUPABASE_SERVICE_ROLE_KEY ? 
        requiredEnvVars.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20) + '...' : 'missing'
    })

    const missingVars = Object.entries(requiredEnvVars)
      .filter(([key, value]) => !value)
      .map(([key]) => key)

    if (missingVars.length > 0) {
      console.error('❌ Missing environment variables:', missingVars)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Server configuration error: Missing environment variables',
          debug: {
            missingVars,
            checklist: {
              SUPABASE_URL: !!requiredEnvVars.SUPABASE_URL,
              SUPABASE_SERVICE_ROLE_KEY: !!requiredEnvVars.SUPABASE_SERVICE_ROLE_KEY,
              SUPABASE_ANON_KEY: !!requiredEnvVars.SUPABASE_ANON_KEY,
              SITE_URL: !!requiredEnvVars.SITE_URL
            }
          }
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // ✅ 2. PARSE AND VALIDATE INPUT WITH SECURE LOGGING
    let requestBody
    try {
      const rawBody = await req.text()
      console.log('Request body received (length):', rawBody.length)
      requestBody = JSON.parse(rawBody)
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

    // ✅ SECURE PAYLOAD LOGGING (without sensitive data)
    console.log('✅ Input payload received:', {
      email: email ? `${email.substring(0, 3)}***@${email.split('@')[1] || 'unknown'}` : 'MISSING',
      name: name ? `${name.substring(0, 3)}***` : 'MISSING', 
      role: role || 'MISSING',
      companyId: companyId ? `${companyId.substring(0, 8)}...` : 'MISSING',
      hasEmail: !!email,
      hasName: !!name,
      hasRole: !!role,
      hasCompanyId: !!companyId
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

    // ✅ 3. RATE LIMITING CHECK
    if (!checkRateLimit(email)) {
      console.warn('⚠️ Rate limit exceeded for email:', email)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Too many invitation requests. Please wait before trying again.',
          debug: { rateLimited: true }
        }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      console.error('❌ Invalid email format')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid email format',
          debug: { emailValid: false }
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
          debug: { role, validRoles: ['admin', 'user'] }
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // ✅ 4. CREATE SUPABASE CLIENT WITH SERVICE ROLE
    console.log('Creating Supabase admin client with service role...')
    const supabaseAdmin = createClient(
      requiredEnvVars.SUPABASE_URL!,
      requiredEnvVars.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // ✅ 5. VERIFY COMPANY EXISTS AND RLS PERMISSIONS
    console.log('Verifying company exists and checking permissions...')
    const { data: companyData, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('id, name, account_id')
      .eq('id', companyId)
      .single()

    if (companyError || !companyData) {
      console.error('❌ Company verification failed:', companyError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid company ID or insufficient permissions',
          debug: { 
            companyId, 
            companyError: companyError?.message,
            companyErrorCode: companyError?.code,
            hint: 'Check if company exists and RLS policies allow service_role access'
          }
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ Company verified:', { 
      name: companyData.name, 
      id: companyData.id,
      hasAccountId: !!companyData.account_id 
    })

    // ✅ 6. CHECK FOR EXISTING USER - OPTIMIZED FOR PERFORMANCE
    console.log('Checking for existing auth user...')
    let existingAuthUser = null
    
    try {
      // Use a more efficient approach - try to get user by email first
      const { data: listUsersData, error: listUsersError } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000 // Reasonable limit to avoid performance issues
      })
      
      if (listUsersError) {
        console.error('❌ Auth API error:', listUsersError)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Auth API error: ${listUsersError.message}`,
            debug: { 
              authApiError: listUsersError.message,
              authApiErrorCode: listUsersError.code,
              hint: 'Check Supabase Auth API limits and service role permissions'
            }
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Find user with matching email
      existingAuthUser = listUsersData?.users?.find(user => user.email === email) || null
      console.log('Auth user lookup result:', { 
        exists: !!existingAuthUser,
        userId: existingAuthUser?.id || 'none',
        totalUsersChecked: listUsersData?.users?.length || 0,
        authApiLimitCheck: listUsersData?.users?.length < 1000 ? 'OK' : 'APPROACHING_LIMIT'
      })
    } catch (authError) {
      console.error('❌ Unexpected auth lookup error:', authError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to verify user status: ${authError.message}`,
          debug: { 
            authError: authError.message,
            hint: 'Check Auth API rate limits and service role permissions'
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
      
      // ✅ 7. HANDLE EXISTING USER WITH IDEMPOTENCY
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
            debug: { 
              profileLookupError: profileLookupError.message,
              profileLookupErrorCode: profileLookupError.code,
              hint: 'Check RLS policies on users table for service_role'
            }
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      if (existingProfile) {
        if (existingProfile.company_id === companyId) {
          console.log('✅ User already in this company - idempotent success')
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'User is already a member of this company',
              userId: existingProfile.id,
              debug: { 
                idempotent: true,
                existingProfile: {
                  id: existingProfile.id,
                  company_id: existingProfile.company_id,
                  role: existingProfile.role
                }
              }
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        } else if (existingProfile.company_id) {
          console.log('❌ User already in another company')
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'User is already a member of another company',
              debug: { 
                existingProfile: {
                  id: existingProfile.id,
                  company_id: existingProfile.company_id,
                  role: existingProfile.role
                }
              }
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
                error: `Failed to update user profile: ${updateError.message}`,
                debug: { 
                  updateError: updateError.message,
                  updateErrorCode: updateError.code,
                  hint: 'Check RLS policies allow service_role to update users table'
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
              error: `Failed to create user profile: ${profileError.message}`,
              debug: { 
                profileError: profileError.message,
                profileErrorCode: profileError.code,
                hint: 'Check RLS policies allow service_role to insert into users table'
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
      // ✅ 8. CREATE NEW AUTH USER WITH ENHANCED ERROR HANDLING
      console.log('Creating new auth user...')
      
      // Generate a secure temporary password
      const tempPassword = `Temp${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}!`
      
      console.log('Auth user creation parameters:', {
        email,
        passwordLength: tempPassword.length,
        emailConfirm: true,
        userMetadata: { name, invited: true }
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
          errorMessage: authError?.message
        })

        if (authError) {
          console.error('❌ Auth creation error details:', {
            name: authError.name,
            message: authError.message,
            status: authError.status,
            code: authError.code
          })

          // Handle specific auth errors with better recovery
          if (authError.message?.includes('User already registered') || authError.code === 'user_already_exists') {
            console.log('User already exists, attempting recovery...')
            const { data: existingUsersData } = await supabaseAdmin.auth.admin.listUsers()
            const existingUser = existingUsersData?.users?.find(user => user.email === email)
            if (existingUser) {
              authUserId = existingUser.id
              console.log('✅ Using existing auth user:', authUserId)
            } else {
              return new Response(
                JSON.stringify({ 
                  success: false, 
                  error: 'User already exists but cannot be retrieved',
                  debug: { authError: authError.message }
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
                    code: authError.code,
                    message: authError.message
                  },
                  hint: 'Check Auth API quotas and email provider configuration'
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
              error: 'Failed to create user: No user ID returned',
              debug: { authData }
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
            error: `Unexpected error creating user: ${unexpectedError.message}`,
            debug: { 
              unexpectedError: unexpectedError.message,
              stack: unexpectedError.stack,
              hint: 'Check Auth API availability and service role permissions'
            }
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // ✅ 9. CREATE USER PROFILE WITH TRIGGER AWARENESS
      if (authUserId) {
        console.log('Creating user profile for new user...')
        
        // Wait for any triggers to complete
        await new Promise(resolve => setTimeout(resolve, 1000))
        
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
                error: `Failed to create user profile: ${profileError.message}`,
                debug: { 
                  profileError: profileError.message,
                  profileErrorCode: profileError.code,
                  profileData: {
                    id: authUserId,
                    email,
                    name,
                    role,
                    company_id: companyId
                  },
                  hint: 'Check RLS policies and handle_new_user_with_company trigger'
                }
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

    // ✅ 10. SEND INVITATION EMAIL WITH TEMPLATE VERIFICATION
    try {
      console.log('Sending invitation email...')
      const { data: linkData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: {
          redirectTo: `${requiredEnvVars.SITE_URL}/login`
        }
      })

      if (resetError) {
        console.warn('⚠️ Failed to send invitation email:', resetError)
        // Don't fail the entire operation, but include in debug
        console.log('Email error details:', {
          error: resetError.message,
          code: resetError.code,
          hint: 'Check email template configuration and SMTP settings'
        })
      } else {
        console.log('✅ Invitation email sent successfully')
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
        userId: authUserId,
        debug: {
          email: `${email.substring(0, 3)}***@${email.split('@')[1]}`,
          name: `${name.substring(0, 3)}***`,
          role,
          companyId: `${companyId.substring(0, 8)}...`,
          companyName: companyData.name,
          timestamp: new Date().toISOString()
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
          message: error.message,
          timestamp: new Date().toISOString()
        }
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})