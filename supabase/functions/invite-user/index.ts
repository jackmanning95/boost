import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Parse request body
    const { email, name, role, companyId } = await req.json()

    // Validate required fields
    if (!email || !name || !role || !companyId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: email, name, role, companyId' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // First, check if user already exists in auth.users
    const { data: existingAuthUser, error: authLookupError } = await supabaseAdmin.auth.admin.getUserByEmail(email)
    
    if (authLookupError && authLookupError.message !== 'User not found') {
      console.error('Auth lookup error:', authLookupError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to check existing user: ${authLookupError.message}` 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    let authUserId: string

    if (existingAuthUser?.user) {
      // User exists in auth, check if they have a profile in public.users
      const { data: existingProfile, error: profileLookupError } = await supabaseAdmin
        .from('users')
        .select('id, company_id, email')
        .eq('id', existingAuthUser.user.id)
        .single()

      if (profileLookupError && profileLookupError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Profile lookup error:', profileLookupError)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Failed to check user profile: ${profileLookupError.message}` 
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      if (existingProfile) {
        // User has a profile, check if they're already in this company
        if (existingProfile.company_id === companyId) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'User is already a member of this company' 
            }),
            { 
              status: 200, 
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
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        } else {
          // User exists but has no company, update their profile
          const { error: updateError } = await supabaseAdmin
            .from('users')
            .update({
              name,
              role,
              company_id: companyId
            })
            .eq('id', existingAuthUser.user.id)

          if (updateError) {
            console.error('Profile update error:', updateError)
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: `Failed to update user profile: ${updateError.message}` 
              }),
              { 
                status: 200, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            )
          }

          authUserId = existingAuthUser.user.id
        }
      } else {
        // User exists in auth but no profile, create profile
        const { error: profileError } = await supabaseAdmin
          .from('users')
          .insert({
            id: existingAuthUser.user.id,
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
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        authUserId = existingAuthUser.user.id
      }
    } else {
      // User doesn't exist, create new auth user
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
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

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
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Failed to create user profile: ${profileError.message}` 
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      authUserId = authData.user.id
    }

    // Send password reset email so user can set their own password
    const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${Deno.env.get('SITE_URL') || 'http://localhost:5173'}/login`
      }
    })

    if (resetError) {
      console.warn('Failed to send password reset email:', resetError)
      // Don't fail the entire operation if email sending fails
    }

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
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'An unexpected error occurred' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})