import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signUp: (data: SignUpData) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
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

  useEffect(() => {
    console.log('AuthContext: Initializing auth state');
    const initializeAuth = async () => {
      try {
        console.log('AuthContext: Getting session');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('AuthContext: Session error:', sessionError);
          return;
        }
        
        if (session?.user) {
          console.log('AuthContext: Session found, fetching user profile');
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profileError) {
            console.error('AuthContext: Profile fetch error:', profileError);
            return;
          }

          if (profile) {
            console.log('AuthContext: Setting user profile');
            setUser({
              id: session.user.id,
              email: session.user.email!,
              name: profile.name,
              role: profile.role,
              companyName: profile.company_name,
              platformIds: profile.platform_ids || {}
            });
          }
        } else {
          console.log('AuthContext: No session found');
        }
      } catch (error) {
        console.error('AuthContext: Initialization error:', error);
      } finally {
        console.log('AuthContext: Setting loading to false');
        setLoading(false);
      }
    };

    initializeAuth();

    console.log('AuthContext: Setting up auth state change subscription');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthContext: Auth state changed:', event);
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('AuthContext: User signed in, fetching profile');
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('AuthContext: Profile fetch error on auth change:', profileError);
          return;
        }

        if (profile) {
          console.log('AuthContext: Updating user profile');
          setUser({
            id: session.user.id,
            email: session.user.email!,
            name: profile.name,
            role: profile.role,
            companyName: profile.company_name,
            platformIds: profile.platform_ids || {}
          });
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('AuthContext: User signed out');
        setUser(null);
      }
    });

    return () => {
      console.log('AuthContext: Cleaning up subscription');
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      console.log('AuthContext: Attempting login');
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('AuthContext: Login error:', error);
        throw error;
      }

      if (data.user) {
        console.log('AuthContext: Login successful, fetching profile');
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          console.error('AuthContext: Profile fetch error after login:', profileError);
          throw profileError;
        }

        if (profile) {
          console.log('AuthContext: Setting user profile after login');
          setUser({
            id: data.user.id,
            email: data.user.email!,
            name: profile.name,
            role: profile.role,
            companyName: profile.company_name,
            platformIds: profile.platform_ids || {}
          });
        }
      }
    } catch (error) {
      console.error('AuthContext: Login process failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async ({ email, password, name, companyName }: SignUpData) => {
    try {
      console.log('AuthContext: Starting sign up process');
      setLoading(true);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${import.meta.env.VITE_SUPABASE_SITE_URL}/login`
        }
      });

      if (error) {
        console.error('AuthContext: Sign up error:', error);
        throw error;
      }

      if (data.user) {
        console.log('AuthContext: Creating user profile');
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email,
            name,
            role: 'client',
            company_name: companyName,
            platform_ids: {}
          });

        if (profileError) {
          console.error('AuthContext: Profile creation error:', profileError);
          throw profileError;
        }
        
        console.log('AuthContext: Sign up completed successfully');
      }
    } catch (error) {
      console.error('AuthContext: Sign up process failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('AuthContext: Logging out');
      await supabase.auth.signOut();
      setUser(null);
      console.log('AuthContext: Logout successful');
    } catch (error) {
      console.error('AuthContext: Logout failed:', error);
    }
  };

  const isAdmin = Boolean(user?.role === 'admin');

  return (
    <AuthContext.Provider value={{ user, loading, login, signUp, logout, isAdmin }}>
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