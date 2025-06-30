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
    
    // Step 1: Check if user profile already exists in public.users
    const { data: existingProfile, error: lookupError } = await supabase
      .from('users')
      .select('id, company_id, email')
      .eq('email', email)
      .maybeSingle();
      
    if (lookupError) {
      console.error('DirectAuth: Error looking up existing user:', lookupError);
      return { success: false, error: `Database error: ${lookupError.message}` };
    }
    
    // If a profile exists with this email, we need to handle it properly
    if (existingProfile) {
      console.log('DirectAuth: Found existing profile:', existingProfile);
      
      // Check if this profile has a corresponding auth user
      const { data: authUserData, error: authLookupError } = await supabase.auth.admin.getUserById(existingProfile.id);
      
      if (authLookupError) {
        console.error('DirectAuth: Error looking up auth user:', authLookupError);
        // Continue with the process - this might be an orphaned profile
      }
      
      const authUser = authUserData?.user;
      
      if (!authUser) {
        // This is an orphaned profile - delete it to clear the constraint
        console.log('DirectAuth: Detected orphaned profile, cleaning up...');
        const { error: deleteError } = await supabase
          .from('users')
          .delete()
          .eq('id', existingProfile.id);
          
        if (deleteError) {
          console.error('DirectAuth: Error deleting orphaned profile:', deleteError);
          return { success: false, error: `Failed to clean up orphaned profile: ${deleteError.message}` };
        }
        
        console.log('DirectAuth: Orphaned profile cleaned up successfully');
      } else {
        // Valid user exists
        if (existingProfile.company_id === companyId) {
          return { 
            success: true, 
            userId: existingProfile.id,
            error: 'User is already a member of this company' 
          };
        } else if (existingProfile.company_id) {
          return { success: false, error: 'User is already a member of another company' };
        } else {
          // User exists but has no company - update their profile
          console.log('DirectAuth: Updating existing user with company info');
          const { error: updateError } = await supabase
            .from('users')
            .update({
              company_id: companyId,
              role: role,
              name: firstName && lastName ? `${firstName} ${lastName}` : email.split('@')[0],
              updated_at: new Date().toISOString()
            })
            .eq('id', existingProfile.id);
            
          if (updateError) {
            console.error('DirectAuth: Error updating existing user:', updateError);
            return { success: false, error: `Failed to update user: ${updateError.message}` };
          }
          
          return { success: true, userId: existingProfile.id };
        }
      }
    }
    
    // Step 2: Generate a secure temporary password
    const tempPassword = `Temp${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}!`;
    
    // Step 3: Create the user in Auth
    console.log('DirectAuth: Creating new user in Auth');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        name: firstName && lastName ? `${firstName} ${lastName}` : email.split('@')[0],
        invited: true,
        company_id: companyId
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
    
    // Step 4: Create user profile (using insert instead of upsert to avoid conflicts)
    const fullName = firstName && lastName ? `${firstName} ${lastName}` : email.split('@')[0];
    
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email,
        name: fullName,
        role,
        company_id: companyId,
        platform_ids: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
    if (profileError) {
      console.error('DirectAuth: Profile creation error:', profileError);
      
      // If profile creation fails, clean up the auth user
      try {
        await supabase.auth.admin.deleteUser(userId);
        console.log('DirectAuth: Cleaned up auth user after profile creation failure');
      } catch (cleanupError) {
        console.error('DirectAuth: Failed to clean up auth user:', cleanupError);
      }
      
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