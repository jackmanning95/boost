import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { Company, User } from '../types';

interface CompanyContextType {
  company: Company | null;
  teamMembers: User[];
  loading: boolean;
  error: string | null;
  refreshCompany: () => Promise<void>;
  refreshTeamMembers: () => Promise<void>;
  inviteUser: (email: string, firstName: string, lastName: string, role: 'admin' | 'user') => Promise<void>;
  updateUserRole: (userId: string, role: 'admin' | 'user') => Promise<void>;
  removeUser: (userId: string) => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};

interface CompanyProviderProps {
  children: ReactNode;
}

export const CompanyProvider: React.FC<CompanyProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshCompany = async () => {
    if (!user?.companyId) {
      setCompany(null);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', user.companyId)
        .single();

      if (error) throw error;
      setCompany(data);
    } catch (err) {
      console.error('Error fetching company:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch company');
    } finally {
      setLoading(false);
    }
  };

  const refreshTeamMembers = async () => {
    if (!user?.companyId) {
      setTeamMembers([]);
      return;
    }

    try {
      setError(null);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('company_id', user.companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTeamMembers(data || []);
    } catch (err) {
      console.error('Error fetching team members:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch team members');
    }
  };

  const inviteUser = async (email: string, firstName: string, lastName: string, role: 'admin' | 'user') => {
    if (!user?.companyId) {
      throw new Error('No company ID available');
    }

    try {
      setError(null);
      
      // Construct full name from firstName and lastName
      const name = `${firstName} ${lastName}`.trim();
      
      // Get the Supabase URL from environment
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('Supabase URL not configured');
      }

      const functionUrl = `${supabaseUrl}/functions/v1/invite-user`;
      
      console.log('Calling invite-user function:', {
        url: functionUrl,
        payload: { email, name, role, companyId: user.companyId }
      });

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          email,
          name,
          role,
          companyId: user.companyId,
        }),
      });

      console.log('Edge Function response status:', response.status);
      console.log('Edge Function response headers:', Object.fromEntries(response.headers.entries()));

      // Get response text first to handle both JSON and non-JSON responses
      const responseText = await response.text();
      console.log('Edge Function raw response:', responseText);

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        throw new Error(`Edge Function returned invalid JSON. Status: ${response.status}, Response: ${responseText.substring(0, 200)}`);
      }

      if (!response.ok) {
        console.error('Edge Function error response:', {
          status: response.status,
          statusText: response.statusText,
          data: responseData
        });

        // Provide detailed error information
        const errorMessage = responseData?.error || `HTTP ${response.status}: ${response.statusText}`;
        const debugInfo = responseData?.debug ? `\n\nDebug Info: ${JSON.stringify(responseData.debug, null, 2)}` : '';
        
        throw new Error(`Edge Function Error: ${errorMessage}${debugInfo}`);
      }

      if (!responseData.success) {
        const errorMessage = responseData.error || 'Unknown error occurred';
        const debugInfo = responseData.debug ? `\n\nDebug Info: ${JSON.stringify(responseData.debug, null, 2)}` : '';
        throw new Error(`Invite failed: ${errorMessage}${debugInfo}`);
      }

      console.log('User invited successfully:', responseData);
      
      // Refresh team members to show the new user
      await refreshTeamMembers();
      
    } catch (err) {
      console.error('CompanyContext: Edge Function error:', err);
      
      // Enhanced error handling with more context
      if (err instanceof Error) {
        if (err.message.includes('fetch')) {
          throw new Error(`Network error: Unable to reach the invite service. Please check your connection and try again.\n\nOriginal error: ${err.message}`);
        } else if (err.message.includes('JSON')) {
          throw new Error(`Server response error: The invite service returned an invalid response.\n\nOriginal error: ${err.message}`);
        } else {
          throw err; // Re-throw with original message if it's already descriptive
        }
      } else {
        throw new Error(`Unexpected error during user invitation: ${String(err)}`);
      }
    }
  };

  const updateUserRole = async (userId: string, role: 'admin' | 'user') => {
    try {
      setError(null);
      const { error } = await supabase
        .from('users')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;
      
      // Refresh team members to show the updated role
      await refreshTeamMembers();
    } catch (err) {
      console.error('Error updating user role:', err);
      throw new Error(err instanceof Error ? err.message : 'Failed to update user role');
    }
  };

  const removeUser = async (userId: string) => {
    try {
      setError(null);
      
      // First, remove the user from the company (set company_id to null)
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          company_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) throw updateError;
      
      // Refresh team members to remove the user from the list
      await refreshTeamMembers();
    } catch (err) {
      console.error('Error removing user:', err);
      throw new Error(err instanceof Error ? err.message : 'Failed to remove user');
    }
  };

  useEffect(() => {
    if (user) {
      refreshCompany();
      refreshTeamMembers();
    } else {
      setCompany(null);
      setTeamMembers([]);
      setLoading(false);
    }
  }, [user]);

  const value: CompanyContextType = {
    company,
    teamMembers,
    loading,
    error,
    refreshCompany,
    refreshTeamMembers,
    inviteUser,
    updateUserRole,
    removeUser,
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
};