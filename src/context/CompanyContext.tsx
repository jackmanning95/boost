import React, { createContext, useContext, useState, useEffect } from 'react';
import { Company, CompanyUser, UserInvitation, CompanyAccountId } from '../types';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

interface CompanyContextType {
  // Data
  companies: Company[];
  companyUsers: CompanyUser[];
  userInvitations: UserInvitation[];
  companyAccountIds: CompanyAccountId[];
  currentCompany: Company | null;
  loading: boolean;
  error: string | null;

  // Company Management
  createCompany: (name: string, accountId?: string) => Promise<Company>;
  updateCompany: (companyId: string, updates: Partial<Company>) => Promise<void>;
  deleteCompany: (companyId: string) => Promise<void>;
  
  // User Management
  inviteUser: (email: string, role: 'admin' | 'user', firstName?: string, lastName?: string) => Promise<void>;
  updateUserRole: (userId: string, role: 'admin' | 'user') => Promise<void>;
  removeUser: (userId: string) => Promise<void>;
  
  // Company Account Management
  fetchCompanyAccountIds: (companyId?: string) => Promise<void>;
  createCompanyAccountId: (accountData: Omit<CompanyAccountId, 'id' | 'createdAt' | 'updatedAt' | 'companyId'>) => Promise<CompanyAccountId>;
  updateCompanyAccountId: (accountId: string, updates: Partial<CompanyAccountId>) => Promise<void>;
  deleteCompanyAccountId: (accountId: string) => Promise<void>;
  
  // Data Fetching
  fetchCompanies: () => Promise<void>;
  fetchCompanyUsers: (companyId?: string) => Promise<void>;
  fetchUserInvitations: (companyId?: string) => Promise<void>;
  
  // Utilities
  refreshData: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isSuperAdmin, isCompanyAdmin } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [userInvitations, setUserInvitations] = useState<UserInvitation[]>([]);
  const [companyAccountIds, setCompanyAccountIds] = useState<CompanyAccountId[]>([]);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch companies based on user role
  const fetchCompanies = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('companies')
        .select(`
          *,
          users!users_company_id_fkey (
            id,
            role
          )
        `)
        .order('created_at', { ascending: false });

      // If not super admin, only fetch user's company
      if (!isSuperAdmin && user.companyId) {
        query = query.eq('id', user.companyId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Transform data to include user counts
      const companiesWithCounts = (data || []).map(company => ({
        id: company.id,
        name: company.name,
        accountId: company.account_id,
        createdAt: company.created_at,
        updatedAt: company.updated_at,
        userCount: company.users?.length || 0,
        adminCount: company.users?.filter((u: any) => u.role === 'admin').length || 0
      }));

      setCompanies(companiesWithCounts);

      // Set current company
      if (user.companyId) {
        const userCompany = companiesWithCounts.find(c => c.id === user.companyId);
        setCurrentCompany(userCompany || null);
      }

    } catch (err) {
      console.error('Error fetching companies:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch companies');
    } finally {
      setLoading(false);
    }
  };

  // Fetch users for a specific company
  const fetchCompanyUsers = async (companyId?: string) => {
    if (!user) return;

    const targetCompanyId = companyId || user.companyId;
    if (!targetCompanyId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('company_id', targetCompanyId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const transformedUsers: CompanyUser[] = (data || []).map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.company_id,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }));

      setCompanyUsers(transformedUsers);

    } catch (err) {
      console.error('Error fetching company users:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch company users');
    } finally {
      setLoading(false);
    }
  };

  // Fetch company account IDs - ENHANCED WITH BETTER ERROR HANDLING
  const fetchCompanyAccountIds = async (companyId?: string) => {
    if (!user) {
      console.log('[CompanyContext] fetchCompanyAccountIds: No user available');
      return;
    }

    const targetCompanyId = companyId || user.companyId;
    if (!targetCompanyId) {
      console.error('[CompanyContext] fetchCompanyAccountIds: No company ID available');
      console.log('[CompanyContext] Debug info:', {
        providedCompanyId: companyId,
        userCompanyId: user.companyId,
        user: user
      });
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('[CompanyContext] Fetching account IDs for company:', targetCompanyId);
      console.log('[CompanyContext] Current user:', {
        id: user.id,
        email: user.email,
        companyId: user.companyId,
        role: user.role
      });

      // Check if Supabase URL is accessible
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      console.log('[CompanyContext] Using Supabase URL:', supabaseUrl);
      
      const { data, error: fetchError } = await supabase
        .from('company_account_ids')
        .select('*')
        .eq('company_id', targetCompanyId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      console.log('[CompanyContext] Supabase response for company_account_ids:', {
        data,
        error: fetchError,
        targetCompanyId,
        queryUsed: `company_account_ids where company_id = ${targetCompanyId} and is_active = true`
      });

      if (fetchError) {
        console.error('[CompanyContext] Error fetching company account IDs:', fetchError);
        throw fetchError;
      }

      console.log('[CompanyContext] Raw data from Supabase:', data);
      console.log('[CompanyContext] Number of records found:', data?.length || 0);

      const transformedAccounts: CompanyAccountId[] = (data || []).map(account => {
        console.log('[CompanyContext] Transforming account:', account);
        return {
          id: account.id,
          companyId: account.company_id,
          platform: account.platform,
          accountId: account.account_id,
          accountName: account.account_name,
          isActive: account.is_active,
          createdAt: account.created_at,
          updatedAt: account.updated_at
        };
      });

      console.log('[CompanyContext] Transformed accounts:', transformedAccounts);
      setCompanyAccountIds(transformedAccounts);

      // Additional debugging for RLS issues
      if (data && data.length === 0) {
        console.warn('[CompanyContext] No account IDs found. Checking RLS permissions...');
        
        // Test if we can read from the table at all
        const { data: testData, error: testError } = await supabase
          .from('company_account_ids')
          .select('count')
          .limit(1);
        
        console.log('[CompanyContext] RLS test query result:', { testData, testError });
        
        if (testError) {
          console.error('[CompanyContext] RLS test failed - user cannot read company_account_ids table:', testError);
        } else {
          console.log('[CompanyContext] RLS test passed - user can read table, but no records match the filter');
        }
      }

    } catch (err) {
      console.error('[CompanyContext] Error in fetchCompanyAccountIds:', err);
      
      // Enhanced error handling for network issues
      if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
        const errorMessage = 'Network error: Unable to connect to Supabase. Please check your internet connection and verify the Supabase URL in your environment configuration.';
        console.error('[CompanyContext] Network connectivity issue detected');
        console.error('[CompanyContext] Current Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
        console.error('[CompanyContext] Please verify this URL matches your Supabase project settings');
        setError(errorMessage);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch company account IDs');
      }
    } finally {
      setLoading(false);
    }
  };

  // Create a new company account ID - ENHANCED WITH DEBUGGING
  const createCompanyAccountId = async (accountData: Omit<CompanyAccountId, 'id' | 'createdAt' | 'updatedAt' | 'companyId'>): Promise<CompanyAccountId> => {
    if (!user?.companyId) {
      throw new Error('No company associated with user');
    }

    try {
      console.log('[CompanyContext] Creating account ID with data:', accountData);
      console.log('[CompanyContext] For company ID:', user.companyId);
      
      const insertData = {
        company_id: user.companyId,
        platform: accountData.platform,
        account_id: accountData.accountId,
        account_name: accountData.accountName,
        is_active: accountData.isActive
      };
      
      console.log('[CompanyContext] Insert data:', insertData);
      
      const { data, error } = await supabase
        .from('company_account_ids')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('[CompanyContext] Error creating company account ID:', error);
        throw error;
      }

      console.log('[CompanyContext] Created account ID successfully:', data);

      const newAccount: CompanyAccountId = {
        id: data.id,
        companyId: data.company_id,
        platform: data.platform,
        accountId: data.account_id,
        accountName: data.account_name,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

      // Update local state
      setCompanyAccountIds(prev => {
        const updated = [newAccount, ...prev];
        console.log('[CompanyContext] Updated local state with new account:', updated);
        return updated;
      });
      
      return newAccount;

    } catch (err) {
      console.error('[CompanyContext] Error creating company account ID:', err);
      throw err;
    }
  };

  // Update company account ID
  const updateCompanyAccountId = async (accountId: string, updates: Partial<CompanyAccountId>) => {
    try {
      const updateData: any = {};
      if (updates.platform) updateData.platform = updates.platform;
      if (updates.accountId) updateData.account_id = updates.accountId;
      if (updates.accountName !== undefined) updateData.account_name = updates.accountName;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

      const { error } = await supabase
        .from('company_account_ids')
        .update(updateData)
        .eq('id', accountId);

      if (error) throw error;

      // Update local state
      setCompanyAccountIds(prev => 
        prev.map(account => 
          account.id === accountId 
            ? { ...account, ...updates, updatedAt: new Date().toISOString() }
            : account
        )
      );

    } catch (err) {
      console.error('Error updating company account ID:', err);
      throw err;
    }
  };

  // Delete company account ID
  const deleteCompanyAccountId = async (accountId: string) => {
    try {
      const { error } = await supabase
        .from('company_account_ids')
        .delete()
        .eq('id', accountId);

      if (error) throw error;

      setCompanyAccountIds(prev => prev.filter(account => account.id !== accountId));

    } catch (err) {
      console.error('Error deleting company account ID:', err);
      throw err;
    }
  };

  // Create a new company (super admin only)
  const createCompany = async (name: string, accountId?: string): Promise<Company> => {
    if (!isSuperAdmin) {
      throw new Error('Only super admins can create companies');
    }

    try {
      const { data, error } = await supabase
        .from('companies')
        .insert({
          name: name.trim(),
          account_id: accountId?.trim() || null
        })
        .select()
        .single();

      if (error) throw error;

      const newCompany: Company = {
        id: data.id,
        name: data.name,
        accountId: data.account_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        userCount: 0,
        adminCount: 0
      };

      setCompanies(prev => [newCompany, ...prev]);
      return newCompany;

    } catch (err) {
      console.error('Error creating company:', err);
      throw err;
    }
  };

  // Update company details
  const updateCompany = async (companyId: string, updates: Partial<Company>) => {
    try {
      const updateData: any = {};
      if (updates.name) updateData.name = updates.name;
      if (updates.accountId !== undefined) updateData.account_id = updates.accountId;

      const { error } = await supabase
        .from('companies')
        .update(updateData)
        .eq('id', companyId);

      if (error) throw error;

      // Update local state
      setCompanies(prev => 
        prev.map(company => 
          company.id === companyId 
            ? { ...company, ...updates, updatedAt: new Date().toISOString() }
            : company
        )
      );

      // Update current company if it's the one being updated
      if (currentCompany?.id === companyId) {
        setCurrentCompany(prev => prev ? { ...prev, ...updates } : null);
      }

    } catch (err) {
      console.error('Error updating company:', err);
      throw err;
    }
  };

  // Delete company (super admin only)
  const deleteCompany = async (companyId: string) => {
    if (!isSuperAdmin) {
      throw new Error('Only super admins can delete companies');
    }

    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', companyId);

      if (error) throw error;

      setCompanies(prev => prev.filter(company => company.id !== companyId));

    } catch (err) {
      console.error('Error deleting company:', err);
      throw err;
    }
  };

  // Invite a user to the company - ENHANCED WITH BETTER ERROR HANDLING
  const inviteUser = async (email: string, role: 'admin' | 'user', firstName?: string, lastName?: string) => {
    if (!user || (!isCompanyAdmin && !isSuperAdmin)) {
      throw new Error('Insufficient permissions to invite users');
    }

    const targetCompanyId = user.companyId;
    if (!targetCompanyId && !isSuperAdmin) {
      throw new Error('No company associated with user');
    }

    try {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, company_id')
        .eq('email', email)
        .maybeSingle();

      if (existingUser) {
        if (existingUser.company_id === targetCompanyId) {
          throw new Error('User is already a member of this company');
        } else if (existingUser.company_id) {
          throw new Error('User is already a member of another company');
        }
        
        // User exists but has no company - add them to this company
        const fullName = firstName && lastName ? `${firstName} ${lastName}` : email.split('@')[0];
        
        const { error: updateError } = await supabase
          .from('users')
          .update({
            company_id: targetCompanyId,
            role: role,
            name: fullName,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingUser.id);

        if (updateError) throw updateError;
      } else {
        // Call the secure Edge Function to create the user
        const fullName = firstName && lastName ? `${firstName} ${lastName}` : email.split('@')[0];
        
        console.log('[CompanyContext] Calling invite-user Edge Function with:', {
          email,
          name: fullName,
          role,
          companyId: targetCompanyId
        });

        const { data: inviteResponse, error: inviteError } = await supabase.functions.invoke('invite-user', {
          body: {
            email,
            name: fullName,
            role,
            companyId: targetCompanyId
          }
        });

        console.log('[CompanyContext] Edge Function response:', {
          data: inviteResponse,
          error: inviteError
        });

        if (inviteError) {
          console.error('[CompanyContext] Edge function error:', inviteError);
          
          // Enhanced error handling for Edge Function errors
          if (inviteError.message?.includes('FunctionsHttpError')) {
            throw new Error('Edge function error: The invitation service is currently unavailable. Please try again later.');
          } else if (inviteError.message?.includes('FunctionsFetchError')) {
            throw new Error('Network error: Unable to send invitation. Please check your connection and try again.');
          } else {
            throw new Error(`Edge function error: ${inviteError.message || 'Unknown error occurred'}`);
          }
        }

        if (!inviteResponse?.success) {
          console.error('[CompanyContext] Edge function returned error:', inviteResponse);
          
          // Extract detailed error information from the response
          let errorMessage = inviteResponse?.error || 'Failed to create user invitation';
          
          // Check for specific error patterns and provide helpful messages
          if (inviteResponse?.debug) {
            const debug = inviteResponse.debug;
            
            if (debug.missingVars && debug.missingVars.length > 0) {
              errorMessage = 'Server configuration error: Missing environment variables. Please contact support.';
            } else if (debug.authError?.code === 'unexpected_failure') {
              errorMessage = 'Authentication service error: Please try again in a few minutes. If the problem persists, contact support.';
            } else if (debug.profileError) {
              errorMessage = 'Database error: Unable to create user profile. Please contact support.';
            } else if (debug.troubleshooting) {
              errorMessage = `${errorMessage}. This appears to be a configuration issue.`;
            }
          }
          
          throw new Error(errorMessage);
        }

        console.log('[CompanyContext] User invitation successful:', inviteResponse);
      }

      // Refresh company users
      await fetchCompanyUsers(targetCompanyId);

    } catch (err) {
      console.error('[CompanyContext] Error inviting user:', err);
      
      // Re-throw with enhanced error message if it's a generic error
      if (err instanceof Error) {
        if (err.message === 'Failed to send invitation. Please try again.') {
          throw new Error('Unable to send invitation. This may be due to a temporary service issue. Please try again in a few minutes.');
        }
        throw err;
      } else {
        throw new Error('An unexpected error occurred while inviting the user. Please try again.');
      }
    }
  };

  // Update user role
  const updateUserRole = async (userId: string, role: 'admin' | 'user') => {
    if (!user || (!isCompanyAdmin && !isSuperAdmin)) {
      throw new Error('Insufficient permissions to update user roles');
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          role,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      // Update local state
      setCompanyUsers(prev =>
        prev.map(user =>
          user.id === userId ? { ...user, role } : user
        )
      );

    } catch (err) {
      console.error('Error updating user role:', err);
      throw err;
    }
  };

  // Remove user from company
  const removeUser = async (userId: string) => {
    if (!user || (!isCompanyAdmin && !isSuperAdmin)) {
      throw new Error('Insufficient permissions to remove users');
    }

    if (userId === user.id) {
      throw new Error('Cannot remove yourself');
    }

    try {
      // Instead of deleting the user, we'll remove them from the company
      const { error } = await supabase
        .from('users')
        .update({
          company_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      // Update local state
      setCompanyUsers(prev => prev.filter(user => user.id !== userId));

    } catch (err) {
      console.error('Error removing user:', err);
      throw err;
    }
  };

  // Fetch user invitations (placeholder)
  const fetchUserInvitations = async (companyId?: string) => {
    // Placeholder for invitation system
    setUserInvitations([]);
  };

  // Refresh all data
  const refreshData = async () => {
    console.log('[CompanyContext] Refreshing all data...');
    await Promise.all([
      fetchCompanies(),
      fetchCompanyUsers(),
      fetchUserInvitations(),
      fetchCompanyAccountIds()
    ]);
    console.log('[CompanyContext] Data refresh completed');
  };

  // Initialize data on mount - ENHANCED WITH DEBUGGING
  useEffect(() => {
    if (user) {
      console.log('[CompanyContext] User detected, initializing data for user:', {
        id: user.id,
        email: user.email,
        companyId: user.companyId,
        role: user.role
      });
      refreshData();
    } else {
      console.log('[CompanyContext] No user detected, skipping data initialization');
    }
  }, [user]);

  return (
    <CompanyContext.Provider value={{
      companies,
      companyUsers,
      userInvitations,
      companyAccountIds,
      currentCompany,
      loading,
      error,
      createCompany,
      updateCompany,
      deleteCompany,
      inviteUser,
      updateUserRole,
      removeUser,
      fetchCompanyAccountIds,
      createCompanyAccountId,
      updateCompanyAccountId,
      deleteCompanyAccountId,
      fetchCompanies,
      fetchCompanyUsers,
      fetchUserInvitations,
      refreshData
    }}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = (): CompanyContextType => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};