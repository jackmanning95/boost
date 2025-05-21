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
    console.log('AuthProvider: Initializing auth state');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, !!session);
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('User signed in, fetching profile');
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('Error fetching user profile:', profileError);
          setUser(null);
          setLoading(false);
          return;
        }

        if (profile) {
          console.log('Profile fetched successfully');
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
        console.log('User signed out');
        setUser(null);
      }
      
      setLoading(false);
    });

    // Check initial session
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      console.log('Initial session check:', !!session, error ? 'Error: ' + error.message : 'No error');
      
      if (!session) {
        console.log('No initial session found');
        setLoading(false);
      }
    };

    checkSession();

    return () => {
      console.log('Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    console.log('Login attempt for:', email);
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Login error:', error);
        throw error;
      }

      console.log('Login successful, user data:', !!data.user);

      if (data.user) {
        console.log('Fetching user profile');
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          console.error('Profile fetch error:', profileError);
          throw profileError;
        }

        if (profile) {
          console.log('Profile fetched successfully');
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
      console.error('Login process error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async ({ email, password, name, companyName }: SignUpData) => {
    console.log('Sign up attempt for:', email);
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`
        }
      });

      if (error) {
        console.error('Sign up error:', error);
        throw error;
      }

      console.log('Sign up successful, creating profile');

      if (data.user) {
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
          console.error('Profile creation error:', profileError);
          throw profileError;
        }
        
        console.log('Profile created successfully');
      }
    } catch (error) {
      console.error('Sign up process error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    console.log('Logout attempt');
    try {
      await supabase.auth.signOut();
      setUser(null);
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isAdmin = user?.role === 'admin';

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