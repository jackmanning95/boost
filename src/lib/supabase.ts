import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  throw new Error('Missing required Supabase configuration');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Initialize connection and verify it's working
const initializeSupabase = async () => {
  try {
    console.log('Supabase: Testing connection...');
    const { error } = await supabase.from('users').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('Supabase: Connection error:', error);
      throw error;
    }
    
    console.log('Supabase: Connection established successfully');
    return true;
  } catch (error) {
    console.error('Supabase: Failed to initialize:', error);
    return false;
  }
};

// Initialize connection
initializeSupabase();