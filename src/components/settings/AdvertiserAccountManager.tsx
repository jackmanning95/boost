import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import AdvertiserAccountModal from './AdvertiserAccountModal';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Building, Plus, Edit, Trash2, Calendar, AlertCircle } from 'lucide-react';

export type AdvertiserAccount = {
  id: string;
  platform: string;
  advertiserName: string;
  advertiserId: string;
  createdAt: string;
};

const AdvertiserAccountManager: React.FC = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<AdvertiserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AdvertiserAccount | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchAccounts();
    }
  }, [user]);

  const fetchAccounts = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching advertiser accounts for user:', user.id);
      
 const { data, error } = await supabase
  .from('advertiser_accounts')
  .select('id, name, created_at, user_id')  // only fields from advertiser_accounts
  .eq('user_id', userId)
  .order('created_at', { ascending: false });


      if (error) {
        console.error('Error fetching advertiser accounts:', error);
        setError('Failed to load advertiser accounts. Please try again.');
        return;
      }

      console.log('Fetched advertiser accounts:', data);

      const transformedAccounts: AdvertiserAccount[] = (data || []).map(account => ({
        id: account.id,
        platform: account.platform,
        advertiserName: account.advertiser_name,
        advertiserId: account.advertiser_id,
        createdAt: account.created_at
      }));

      setAccounts(transformedAccounts);
    } catch (error) {
      console.error('Error in fetchAccounts:', error);
      setError('Failed to load advertiser accounts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (accountData: Omit<AdvertiserAccount, 'id' | 'createdAt'>) => {
    if (!user) return;

    try {
      console.log('Adding advertiser account:', accountData);
      
      const { data, error } = await supabase
        .from('advertiser_accounts')
        .insert({
          user_id: user.id,
          platform: accountData.platform,
          advertiser_name: accountData.advertiserName,
          advertiser_id: accountData.advertiserId
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding advertiser account:', error);
        alert('Failed to add advertiser account. Please try again.');
        return;
      }

      console.log('Successfully added advertiser account:', data);
      await fetchAccounts();
    } catch (error) {
      console.error('Error in handleAdd:', error);
      alert('Failed to add advertiser account. Please try again.');
    }
  };

  const handleUpdate = async (account: AdvertiserAccount) => {
    try {
      console.log('Updating advertiser account:', account);
      
      const { error } = await supabase
        .from('advertiser_accounts')
        .update({
          platform: account.platform,
          advertiser_name: account.advertiserName,
          advertiser_id: account.advertiserId,
          updated_at: new Date().toISOString()
        })
        .eq('id', account.id);

      if (error) {
        console.error('Error updating advertiser account:', error);
        alert('Failed to update advertiser account. Please try again.');
        return;
      }

      console.log('Successfully updated advertiser account');
      await fetchAccounts();
    } catch (error) {
      console.error('Error in handleUpdate:', error);
      alert('Failed to update advertiser account. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this advertiser account?')) {
      return;
    }

    try {
      console.log('Deleting advertiser account:', id);
      
      const { error } = await supabase
        .from('advertiser_accounts')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting advertiser account:', error);
        alert('Failed to delete advertiser account. Please try again.');
        return;
      }

      console.log('Successfully deleted advertiser account');
      await fetchAccounts();
    } catch (error) {
      console.error('Error in handleDelete:', error);
      alert('Failed to delete advertiser account. Please try again.');
    }
  };

  const handleEdit = (account: AdvertiserAccount) => {
    setEditingAccount(account);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingAccount(null);
    setIsModalOpen(true);
  };

  const handleSave = async (data: Omit<AdvertiserAccount, 'id' | 'createdAt'>) => {
    if (editingAccount) {
      await handleUpdate({ ...editingAccount, ...data });
    } else {
      await handleAdd(data);
    }
    setIsModalOpen(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading advertiser accounts...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
          <p className="text-red-600 mb-4">{error}</p>
          <Button variant="primary" onClick={fetchAccounts}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="text-blue-600 flex items-center">
            <Building size={20} className="mr-2" />
            Connected Platform IDs
          </CardTitle>
          <Button variant="primary" onClick={handleAddNew} icon={<Plus size={16} />}>
            Add Account
          </Button>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="text-center py-8">
              <Building size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-600 mb-4">No advertiser accounts added yet.</p>
              <p className="text-sm text-gray-500 mb-6">
                Add your platform account IDs to track and manage your advertising campaigns.
              </p>
              <Button variant="primary" onClick={handleAddNew} icon={<Plus size={16} />}>
                Add Your First Account
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {accounts.map(account => (
                <div
                  key={account.id}
                  className="border border-gray-200 rounded-lg p-4 flex justify-between items-center hover:shadow-sm transition-shadow"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-medium text-gray-900">{account.advertiserName}</h3>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                        {account.platform}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span className="font-mono">{account.advertiserId}</span>
                      <div className="flex items-center">
                        <Calendar size={14} className="mr-1" />
                        <span>Added {formatDate(account.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEdit(account)}
                      icon={<Edit size={14} />}
                    >
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDelete(account.id)}
                      icon={<Trash2 size={14} />}
                      className="text-red-600 hover:text-red-700"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      <AdvertiserAccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        account={editingAccount}
      />
    </>
  );
};

export default AdvertiserAccountManager;