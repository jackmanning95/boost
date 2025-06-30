import { supabase } from './supabase';

/**
 * Direct Auth API implementation that bypasses the Edge Function
 * This provides a more reliable way to invite users when Edge Functions are problematic
 */
export async function inviteUserDirectly(
  email: string,
  role: 'admin' | 'user',
  firstName?: string,
  lastName?: string,
  companyId?: string
): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    console.log('DirectAuth: Starting user invitation process');
    
    if (!email || !role) {
      return { success: false, error: 'Email and role are required' };
    }
    
    // If no company ID is provided, use the current user's company
    if (!companyId) {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        return { success: false, error: 'Not authenticated' };
      }
      
      const { data: profile } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', userData.user.id)
        .single();
        
      companyId = profile?.company_id;
      
      if (!companyId) {
        return { success: false, error: 'No company associated with current user' };
      }
    }
    
    console.log('DirectAuth: Using company ID:', companyId);
    
    // Step 1: Check if user already exists
    const { data: existingUsers, error: lookupError } = await supabase
      .from('users')
      .select('id, company_id, email')
      .eq('email', email)
      .maybeSingle();
      
    if (lookupError) {
      console.error('DirectAuth: Error looking up existing user:', lookupError);
      return { success: false, error: `Database error: ${lookupError.message}` };
    }
    
    if (existingUsers) {
      if (existingUsers.company_id === companyId) {
        return { 
          success: true, 
          userId: existingUsers.id,
          error: 'User is already a member of this company' 
        };
      } else if (existingUsers.company_id) {
        return { success: false, error: 'User is already a member of another company' };
      }
    }
    
    // Step 2: Generate a secure temporary password
    const tempPassword = `Temp${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}!`;
    
    // Step 3: Create the user in Auth
    console.log('DirectAuth: Creating new user in Auth');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: tempPassword,
      options: {
        data: {
          name: firstName && lastName ? `${firstName} ${lastName}` : email.split('@')[0],
          invited: true,
          company_id: companyId
        }
      }
    });
    
    if (authError) {
      console.error('DirectAuth: Auth creation error:', authError);
      return { success: false, error: `Auth error: ${authError.message}` };
    }
    
    if (!authData?.user) {
      return { success: false, error: 'Failed to create user: No user data returned' };
    }
    
    const userId = authData.user.id;
    console.log('DirectAuth: Auth user created with ID:', userId);
    
    // Step 4: Create or update user profile
    const fullName = firstName && lastName ? `${firstName} ${lastName}` : email.split('@')[0];
    
    const { error: profileError } = await supabase
      .from('users')
      .upsert({
        id: userId,
        email,
        name: fullName,
        role,
        company_id: companyId,
        platform_ids: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });
      
    if (profileError) {
      console.error('DirectAuth: Profile creation error:', profileError);
      return { success: false, error: `Profile error: ${profileError.message}` };
    }
    
    console.log('DirectAuth: User profile created successfully');
    
    // Step 5: Send password reset email
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`
    });
    
    if (resetError) {
      console.warn('DirectAuth: Password reset email failed:', resetError);
      // Don't fail the whole operation if just the email fails
    } else {
      console.log('DirectAuth: Password reset email sent successfully');
    }
    
    return { success: true, userId };
    
  } catch (error) {
    console.error('DirectAuth: Unexpected error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    };
  }
}