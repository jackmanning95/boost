import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, Company } from '../types';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signUp: (data: SignUpData) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isCompanyAdmin: boolean;
  updateUserProfile: (updates: Partial<User>) => Promise<void>;
}

interface SignUpData {
  email: string;
  password: string;
  name: string;
  companyName?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const initializeAuth = async () => {
      try {
        // Check for existing session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setLoading(true);
        try {
          await fetchUserProfile(session.user.id);
        } catch (error) {
          console.error('Error fetching user profile:', error);
        } finally {
          setLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    const { data: profile, error } = await supabase
      .from('users')
      .select(`
        *,
        companies (
          id,
          name
        )
      `)
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }

    if (profile) {
      setUser({
        id: userId,
        email: profile.email,
        name: profile.name,
        role: profile.role,
        companyId: profile.company_id,
        companyName: profile.companies?.name,
        platformIds: profile.platform_ids || {}
      });
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      if (data.user) {
        await fetchUserProfile(data.user.id);
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async ({ email, password, name, companyName }: SignUpData) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`
        }
      });

      if (error) throw error;

      if (data.user) {
        // Determine if user should be super admin
        const isSuperAdmin = email.endsWith('@boostdata.io');
        let companyId: string | null = null;
        
        // Only create/find company if not super admin
        if (!isSuperAdmin && companyName && companyName.trim()) {
          // Try to create new company
          const { data: company, error: companyError } = await supabase
            .from('companies')
            .insert({ name: companyName.trim() })
            .select()
            .single();
            
          if (companyError) {
            // Company might already exist, try to find it
            const { data: existingCompany } = await supabase
              .from('companies')
              .select('id')
              .eq('name', companyName.trim())
              .single();
              
            companyId = existingCompany?.id || null;
          } else {
            companyId = company.id;
          }
        }

        // Create user profile
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email,
            name,
            role: isSuperAdmin ? 'super_admin' : 'user', // Will be auto-updated to 'admin' by trigger if first in company
            company_id: companyId,
            platform_ids: {}
          });

        if (profileError) throw profileError;
      }
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateUserProfile = async (updates: Partial<User>) => {
    if (!user) return;

    try {
      const updateData: any = {};
      
      if (updates.name) updateData.name = updates.name;
      if (updates.platformIds) updateData.platform_ids = updates.platformIds;
      
      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;

      // Update local state
      setUser(prev => prev ? { ...prev, ...updates } : null);
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Role checks
  const isSuperAdmin = user?.role === 'super_admin' || user?.email?.endsWith('@boostdata.io') || false;
  const isAdmin = user?.role === 'admin' || isSuperAdmin;
  const isCompanyAdmin = user?.role === 'admin' && !isSuperAdmin;

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      signUp, 
      logout, 
      isAdmin,
      isSuperAdmin,
      isCompanyAdmin,
      updateUserProfile 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};