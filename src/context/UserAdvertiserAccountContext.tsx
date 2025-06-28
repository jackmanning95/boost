import React, { createContext, useContext, useState, useEffect } from 'react';
import { AdvertiserAccount } from '../types';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

interface UserAdvertiserAccountContextType {
  // Data
  advertiserAccounts: AdvertiserAccount[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchAdvertiserAccounts: () => Promise<void>;
  createAdvertiserAccount: (accountData: Omit<AdvertiserAccount, 'id' | 'createdAt'>) => Promise<AdvertiserAccount>;
  updateAdvertiserAccount: (accountId: string, updates: Partial<AdvertiserAccount>) => Promise<void>;
  deleteAdvertiserAccount: (accountId: string) => Promise<void>;
  
  // Utilities
  refreshData: () => Promise<void>;
}

const UserAdvertiserAccountContext = createContext<UserAdvertiserAccountContextType | undefined>(undefined);

export const UserAdvertiserAccountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [advertiserAccounts, setAdvertiserAccounts] = useState<AdvertiserAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch advertiser accounts for the current user
  const fetchAdvertiserAccounts = async () => {
    if (!user) {
      console.log('[UserAdvertiserAccountContext] No user available');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('[UserAdvertiserAccountContext] Fetching advertiser accounts for user:', user.id);

      const { data, error: fetchError } = await supabase
        .from('advertiser_accounts')
        .select('id, platform, advertiser_name, advertiser_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('[UserAdvertiserAccountContext] Error fetching advertiser accounts:', fetchError);
        throw fetchError;
      }

      console.log('[UserAdvertiserAccountContext] Fetched advertiser accounts:', data);

      const transformedAccounts: AdvertiserAccount[] = (data || []).map(account => ({
        id: account.id,
        platform: account.platform,
        advertiserName: account.advertiser_name,
        advertiserId: account.advertiser_id,
        createdAt: account.created_at
      }));

      setAdvertiserAccounts(transformedAccounts);

    } catch (err) {
      console.error('[UserAdvertiserAccountContext] Error in fetchAdvertiserAccounts:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch advertiser accounts');
    } finally {
      setLoading(false);
    }
  };

  // Create a new advertiser account
  const createAdvertiserAccount = async (accountData: Omit<AdvertiserAccount, 'id' | 'createdAt'>): Promise<AdvertiserAccount> => {
    if (!user) {
      throw new Error('No user available');
    }

    try {
      console.log('[UserAdvertiserAccountContext] Creating advertiser account:', accountData);

      const insertData = {
        user_id: user.id,
        platform: accountData.platform,
        advertiser_name: accountData.advertiserName,
        advertiser_id: accountData.advertiserId
      };

      const { data, error } = await supabase
        .from('advertiser_accounts')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('[UserAdvertiserAccountContext] Error creating advertiser account:', error);
        throw error;
      }

      console.log('[UserAdvertiserAccountContext] Created advertiser account successfully:', data);

      const newAccount: AdvertiserAccount = {
        id: data.id,
        platform: data.platform,
        advertiserName: data.advertiser_name,
        advertiserId: data.advertiser_id,
        createdAt: data.created_at
      };

      // Update local state
      setAdvertiserAccounts(prev => [newAccount, ...prev]);
      
      return newAccount;

    } catch (err) {
      console.error('[UserAdvertiserAccountContext] Error creating advertiser account:', err);
      throw err;
    }
  };

  // Update an advertiser account
  const updateAdvertiserAccount = async (accountId: string, updates: Partial<AdvertiserAccount>) => {
    try {
      const updateData: any = {};
      if (updates.platform) updateData.platform = updates.platform;
      if (updates.advertiserName) updateData.advertiser_name = updates.advertiserName;
      if (updates.advertiserId) updateData.advertiser_id = updates.advertiserId;

      const { error } = await supabase
        .from('advertiser_accounts')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', accountId);

      if (error) throw error;

      // Update local state
      setAdvertiserAccounts(prev => 
        prev.map(account => 
          account.id === accountId 
            ? { ...account, ...updates }
            : account
        )
      );

    } catch (err) {
      console.error('[UserAdvertiserAccountContext] Error updating advertiser account:', err);
      throw err;
    }
  };

  // Delete an advertiser account
  const deleteAdvertiserAccount = async (accountId: string) => {
    try {
      const { error } = await supabase
        .from('advertiser_accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;

      setAdvertiserAccounts(prev => prev.filter(account => account.id !== accountId));

    } catch (err) {
      console.error('[UserAdvertiserAccountContext] Error deleting advertiser account:', err);
      throw err;
    }
  };

  // Refresh all data
  const refreshData = async () => {
    console.log('[UserAdvertiserAccountContext] Refreshing data...');
    await fetchAdvertiserAccounts();
    console.log('[UserAdvertiserAccountContext] Data refresh completed');
  };

  // Initialize data on mount
  useEffect(() => {
    if (user) {
      console.log('[UserAdvertiserAccountContext] User detected, initializing data for user:', {
        id: user.id,
        email: user.email
      });
      fetchAdvertiserAccounts();
    } else {
      console.log('[UserAdvertiserAccountContext] No user detected, clearing data');
      setAdvertiserAccounts([]);
    }
  }, [user]);

  return (
    <UserAdvertiserAccountContext.Provider value={{
      advertiserAccounts,
      loading,
      error,
      fetchAdvertiserAccounts,
      createAdvertiserAccount,
      updateAdvertiserAccount,
      deleteAdvertiserAccount,
      refreshData
    }}>
      {children}
    </UserAdvertiserAccountContext.Provider>
  );
};

export const useUserAdvertiserAccounts = (): UserAdvertiserAccountContextType => {
  const context = useContext(UserAdvertiserAccountContext);
  if (context === undefined) {
    throw new Error('useUserAdvertiserAccounts must be used within a UserAdvertiserAccountProvider');
  }
  return context;
};