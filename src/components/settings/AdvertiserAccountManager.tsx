import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import AdvertiserAccountModal from '../settings/AdvertiserAccountModal';
import { useCompany } from '../../context/CompanyContext';
import { useAuth } from '../../context/AuthContext';
import { Building, Plus, Edit, Trash2, Calendar, AlertCircle } from 'lucide-react';
import { AdvertiserAccount } from '../../types';

const AdvertiserAccountManager: React.FC = () => {
  const { user } = useAuth();
  const { 
    advertiserAccounts, 
    loading: companyContextLoading, 
    error, 
    fetchAdvertiserAccounts, 
    createAdvertiserAccount, 
    updateAdvertiserAccount, 
    deleteAdvertiserAccount 
  } = useCompany();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AdvertiserAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // Add effect to log loading and error states
  useEffect(() => {
    console.log('[AdvertiserAccountManager] Current loading state:', loading);
    console.log('[AdvertiserAccountManager] Current error state:', error);
  }, [loading, error]);

  useEffect(() => {
    if (user) {
      console.log('[AdvertiserAccountManager] User detected, fetching advertiser accounts');
      try {
        setLoading(true);
        fetchAdvertiserAccounts()
          .then(() => {
            console.log('[AdvertiserAccountManager] Advertiser accounts fetched successfully');
            setLoading(false);
          })
          .catch(error => {
            console.error('[AdvertiserAccountManager] Error fetching advertiser accounts:', error);
            setLoading(false);
          });
      } catch (error) {
        console.error('[AdvertiserAccountManager] Exception in useEffect:', error);
        setLoading(false);
      }
    }
  }, [user, fetchAdvertiserAccounts]);

  // Add a separate effect to ensure loading state is reset
  useEffect(() => {
    if (advertiserAccounts) {
      // If we have accounts (even empty array), we're done loading
      if (loading || companyContextLoading) {
        console.log('[AdvertiserAccountManager] Accounts loaded, setting loading to false');
        setLoading(false);
      }
    }
  }, [advertiserAccounts, loading, companyContextLoading]);
  
  // Debug logging for loading states
  useEffect(() => {
    console.log('[AdvertiserAccountManager] Loading states:', { 
      isModalOpen, 
      localLoading: loading, 
      contextLoading: companyContextLoading,
      accountsLength: advertiserAccounts?.length || 0,
      hasError: !!error
    });
    
    // Force loading to false after 10 seconds to prevent infinite loading
    const timeout = setTimeout(() => {
      if (loading) {
        console.log('[AdvertiserAccountManager] Force ending loading state after timeout');
        setLoading(false);
      }
    }, 10000);
    
    return () => clearTimeout(timeout);
  }, [loading, companyContextLoading, advertiserAccounts]);

  const handleAdd = async (accountData: Omit<AdvertiserAccount, 'id' | 'createdAt'>) => {
    try {
      console.log('Adding advertiser account:', accountData);
      await createAdvertiserAccount(accountData);
    } catch (error) {
      console.error('Error adding advertiser account:', error);
      alert('Failed to add advertiser account. Please try again.');
    }
  };

  const handleUpdate = async (account: AdvertiserAccount) => {
    try {
      console.log('Updating advertiser account:', account);
      await updateAdvertiserAccount(account.id, {
        platform: account.platform,
        advertiserId: account.advertiserId,
        advertiserName: account.advertiserName
      });
    } catch (error) {
      console.error('Error updating advertiser account:', error);
      alert('Failed to update advertiser account. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this advertiser account?')) {
      return;
    }

    try {
      console.log('Deleting advertiser account:', id);
      await deleteAdvertiserAccount(id);
    } catch (error) {
      console.error('Error deleting advertiser account:', error);
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
    console.log('[AdvertiserAccountManager] Opening modal for new account');
    
    // Force update with setTimeout to ensure state change is processed
    setTimeout(() => {
      console.log('[AdvertiserAccountManager] Checking modal state after timeout:', isModalOpen);
    }, 100);
    
    // Debug info to track state changes
    setDebugInfo({
      timestamp: new Date().toISOString(),
      action: 'handleAddNew called',
      isModalOpenBefore: isModalOpen
    });
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
          <Button variant="primary" onClick={() => fetchAdvertiserAccounts()}>
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
            Platform Accounts {debugInfo && `(Debug: ${isModalOpen ? 'Modal Open' : 'Modal Closed'})`}
          </CardTitle>
        <Button 
          variant="primary" 
          onClick={(e) => {
            e.preventDefault(); // Prevent any default behavior
            console.log('Add Account button clicked!');
            
            // Direct state update with callback to verify
            setIsModalOpen(true);
            console.log('Set isModalOpen to true directly');
            
            // Skip the handleAddNew function for now
            setEditingAccount(null);
            
            // Debug info
            setDebugInfo({
              timestamp: new Date().toISOString(),
              action: 'Add Account button clicked',
              isModalOpenBefore: isModalOpen
            });
          }}
          icon={<Plus size={16} />}
        >
          Add Account
        </Button>
        </CardHeader>
        <CardContent>
          {(advertiserAccounts || []).length === 0 ? (
            <div className="text-center py-8">
              <Building size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-600 mb-4">No advertiser accounts added yet.</p>
              <p className="text-sm text-gray-500 mb-6">
                Add your advertiser accounts to track and manage your advertising campaigns. 
                All team members in your company will be able to access these accounts.
              </p>
              <Button 
                variant="primary" 
                onClick={(e) => {
                  e.preventDefault(); // Prevent any default behavior
                  console.log('Add Your First Account button clicked!');
                  
                  // Direct state update with callback to verify
                  setIsModalOpen(true);
                  console.log('Set isModalOpen to true directly');
                  
                  // Skip the handleAddNew function for now
                  setEditingAccount(null);
                  
                  // Debug info
                  setDebugInfo({
                    timestamp: new Date().toISOString(),
                    action: 'Add Your First Account button clicked',
                    isModalOpenBefore: isModalOpen
                  });
                }}
                icon={<Plus size={16} />}
              >
                Add Your First Account
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {(advertiserAccounts || []).map(account => (
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
      {/* Always render the modal and log its props */}
      <div className="modal-container">
        {console.log('[AdvertiserAccountManager] Rendering modal with isOpen:', isModalOpen)}
        <AdvertiserAccountModal
          isOpen={isModalOpen}
          onClose={() => {
            console.log('[AdvertiserAccountManager] Closing modal');
            setIsModalOpen(false);
          }}
          onSave={handleSave}
          account={editingAccount}
        />
      </div>
      
      {/* Debug info display - only visible in development */}
      {process.env.NODE_ENV === 'development' && debugInfo && (
        <div className="fixed bottom-0 right-0 bg-black bg-opacity-75 text-white p-2 text-xs max-w-xs z-50">
          <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
          <div>Modal state: {isModalOpen ? 'OPEN' : 'CLOSED'}</div>
        </div>
      )}
    </>
  );
};

export default AdvertiserAccountManager;