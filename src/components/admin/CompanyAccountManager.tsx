import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Badge from '../ui/Badge';
import { CompanyAccountId } from '../../types';
import { supabase } from '../../lib/supabase';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Hash, 
  Building,
  Calendar,
  ToggleLeft,
  ToggleRight,
  Search
} from 'lucide-react';

interface CompanyAccountManagerProps {
  companyId: string;
  companyName: string;
}

const PLATFORM_OPTIONS = [
  'Meta',
  'Instagram', 
  'TikTok',
  'X/Twitter',
  'LinkedIn',
  'Pinterest',
  'Snapchat',
  'DV360',
  'The Trade Desk',
  'Xandr',
  'MediaMath',
  'Amazon DSP',
  'Yahoo! DSP',
  'StackAdapt',
  'Other'
];

const CompanyAccountManager: React.FC<CompanyAccountManagerProps> = ({
  companyId,
  companyName
}) => {
  const [accounts, setAccounts] = useState<CompanyAccountId[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<CompanyAccountId | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    platform: '',
    accountId: '',
    accountName: '',
    isActive: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, [companyId]);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('company_account_ids')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedAccounts: CompanyAccountId[] = (data || []).map(account => ({
        id: account.id,
        companyId: account.company_id,
        platform: account.platform,
        accountId: account.account_id,
        accountName: account.account_name,
        isActive: account.is_active,
        createdAt: account.created_at,
        updatedAt: account.updated_at
      }));

      setAccounts(transformedAccounts);
    } catch (error) {
      console.error('Error fetching company accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.platform || !formData.accountId) return;

    setIsSubmitting(true);
    try {
      if (editingAccount) {
        // Update existing account
        const { error } = await supabase
          .from('company_account_ids')
          .update({
            platform: formData.platform,
            account_id: formData.accountId,
            account_name: formData.accountName || null,
            is_active: formData.isActive,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingAccount.id);

        if (error) throw error;
      } else {
        // Create new account
        const { error } = await supabase
          .from('company_account_ids')
          .insert({
            company_id: companyId,
            platform: formData.platform,
            account_id: formData.accountId,
            account_name: formData.accountName || null,
            is_active: formData.isActive
          });

        if (error) throw error;
      }

      await fetchAccounts();
      resetForm();
    } catch (error) {
      console.error('Error saving account:', error);
      alert('Failed to save account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (account: CompanyAccountId) => {
    setEditingAccount(account);
    setFormData({
      platform: account.platform,
      accountId: account.accountId,
      accountName: account.accountName || '',
      isActive: account.isActive
    });
    setShowForm(true);
  };

  const handleDelete = async (account: CompanyAccountId) => {
    if (!confirm(`Are you sure you want to delete the ${account.platform} account "${account.accountId}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('company_account_ids')
        .delete()
        .eq('id', account.id);

      if (error) throw error;
      await fetchAccounts();
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Failed to delete account. Please try again.');
    }
  };

  const toggleAccountStatus = async (account: CompanyAccountId) => {
    try {
      const { error } = await supabase
        .from('company_account_ids')
        .update({
          is_active: !account.isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', account.id);

      if (error) throw error;
      await fetchAccounts();
    } catch (error) {
      console.error('Error toggling account status:', error);
      alert('Failed to update account status. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      platform: '',
      accountId: '',
      accountName: '',
      isActive: true
    });
    setEditingAccount(null);
    setShowForm(false);
  };

  const filteredAccounts = accounts.filter(account =>
    account.platform.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.accountId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (account.accountName && account.accountName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900 flex items-center">
            <Hash size={24} className="mr-2 text-blue-600" />
            Account IDs for {companyName}
          </h3>
          <p className="text-gray-600 mt-1">Manage platform account IDs for this company</p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowForm(true)}
          icon={<Plus size={18} />}
        >
          Add Account ID
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Hash size={20} className="text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total Accounts</p>
                <p className="text-2xl font-bold text-gray-900">{accounts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <ToggleRight size={20} className="text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Active Accounts</p>
                <p className="text-2xl font-bold text-gray-900">
                  {accounts.filter(a => a.isActive).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Building size={20} className="text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Platforms</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(accounts.map(a => a.platform)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by platform, account ID, or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingAccount ? 'Edit Account ID' : 'Add New Account ID'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Platform
                  </label>
                  <select
                    value={formData.platform}
                    onChange={(e) => setFormData(prev => ({ ...prev, platform: e.target.value }))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Platform</option>
                    {PLATFORM_OPTIONS.map(platform => (
                      <option key={platform} value={platform}>{platform}</option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Account ID"
                  value={formData.accountId}
                  onChange={(e) => setFormData(prev => ({ ...prev, accountId: e.target.value }))}
                  placeholder="Enter account ID"
                  required
                />

                <Input
                  label="Account Name (Optional)"
                  value={formData.accountName}
                  onChange={(e) => setFormData(prev => ({ ...prev, accountName: e.target.value }))}
                  placeholder="Enter descriptive name"
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Active</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                >
                  {editingAccount ? 'Update Account' : 'Add Account'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Accounts List */}
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredAccounts.length > 0 ? (
          filteredAccounts.map(account => (
            <Card key={account.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-semibold text-gray-900">{account.platform}</h4>
                      <Badge variant={account.isActive ? 'success' : 'default'}>
                        {account.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center text-gray-600">
                        <Hash size={14} className="mr-1" />
                        <span className="font-mono">{account.accountId}</span>
                      </div>
                      {account.accountName && (
                        <div className="flex items-center text-gray-600">
                          <Building size={14} className="mr-1" />
                          <span>{account.accountName}</span>
                        </div>
                      )}
                      <div className="flex items-center text-gray-600">
                        <Calendar size={14} className="mr-1" />
                        <span>Added {formatDate(account.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleAccountStatus(account)}
                      icon={account.isActive ? <ToggleLeft size={16} /> : <ToggleRight size={16} />}
                    >
                      {account.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(account)}
                      icon={<Edit size={16} />}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(account)}
                      icon={<Trash2 size={16} />}
                      className="text-red-600 hover:text-red-700"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Hash size={64} className="mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No accounts found' : 'No account IDs yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm 
                  ? 'Try adjusting your search criteria'
                  : 'Add platform account IDs to get started'
                }
              </p>
              {!searchTerm && (
                <Button
                  variant="primary"
                  onClick={() => setShowForm(true)}
                  icon={<Plus size={18} />}
                >
                  Add First Account ID
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CompanyAccountManager;