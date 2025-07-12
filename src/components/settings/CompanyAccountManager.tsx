import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import CompanyAccountModal from './CompanyAccountModal';
import { useCompany } from '../../context/CompanyContext';
import { useAuth } from '../../context/AuthContext';
import { Building, Plus, Edit, Trash2, Calendar, AlertCircle } from 'lucide-react';
import { CompanyAccountId } from '../../types';

const CompanyAccountManager: React.FC = () => {
  const { user } = useAuth();
  const { 
    companyAccountIds, 
    loading, 
    error, 
    fetchCompanyAccountIds, 
    createCompanyAccountId, 
    updateCompanyAccountId, 
    deleteCompanyAccountId 
  } = useCompany();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<CompanyAccountId | null>(null);

  useEffect(() => {
    if (user) {
      console.log('[CompanyAccountManager] User detected, fetching account IDs');
      fetchCompanyAccountIds().catch(error => {
        console.error('Error fetching account IDs:', error);
      });
    }
  }, [user, fetchCompanyAccountIds]);

  // Add a separate effect to ensure loading state is reset
  useEffect(() => {
    if (companyAccountIds) {
      // If we have account IDs (even empty array), we're done loading
      if (loading) {
        console.log('[CompanyAccountManager] Account IDs loaded, setting loading to false');
      }
    }
  }, [companyAccountIds, loading]);

  const handleAdd = async (accountData: Omit<CompanyAccountId, 'id' | 'createdAt' | 'updatedAt' | 'companyId'>) => {
    try {
      console.log('Adding company account:', accountData);
      await createCompanyAccountId(accountData);
    } catch (error) {
      console.error('Error adding company account:', error);
      alert('Failed to add company account. Please try again.');
    }
  };

  const handleUpdate = async (account: CompanyAccountId) => {
    try {
      console.log('Updating company account:', account);
      await updateCompanyAccountId(account.id, {
        platform: account.platform,
        accountId: account.accountId,
        accountName: account.accountName,
        isActive: account.isActive
      });
    } catch (error) {
      console.error('Error updating company account:', error);
      alert('Failed to update company account. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this company account?')) {
      return;
    }

    try {
      console.log('Deleting company account:', id);
      await deleteCompanyAccountId(id);
    } catch (error) {
      console.error('Error deleting company account:', error);
      alert('Failed to delete company account. Please try again.');
    }
  };

  const handleEdit = (account: CompanyAccountId) => {
    setEditingAccount(account);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingAccount(null);
    setIsModalOpen(true);
  };

  const handleSave = async (data: Omit<CompanyAccountId, 'id' | 'createdAt' | 'updatedAt' | 'companyId'>) => {
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
          <p className="text-gray-600">Loading platform accounts...</p>
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
          <Button variant="primary" onClick={() => fetchCompanyAccountIds()}>
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
            Company Platform IDs
          </CardTitle>
          <Button variant="primary" onClick={handleAddNew} icon={<Plus size={16} />}>
            Add Account
          </Button>
        </CardHeader>
        <CardContent>
          {(companyAccountIds || []).length === 0 ? (
            <div className="text-center py-8">
              <Building size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-600 mb-4">No platform accounts added yet.</p>
              <p className="text-sm text-gray-500 mb-6">
                Add your platform account IDs to track and manage your advertising campaigns. 
                All team members in your company will be able to access these accounts.
              </p>
              <Button variant="primary" onClick={handleAddNew} icon={<Plus size={16} />}>
                Add Your First Account
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {(companyAccountIds || []).map(account => (
                <div
                  key={account.id}
                  className="border border-gray-200 rounded-lg p-4 flex justify-between items-center hover:shadow-sm transition-shadow"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-medium text-gray-900">{account.accountName || account.platform}</h3>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                        {account.platform}
                      </span>
                      {account.isActive && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span className="font-mono">{account.accountId}</span>
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
      <CompanyAccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        account={editingAccount}
      />
    </>
  );
};

export default CompanyAccountManager;