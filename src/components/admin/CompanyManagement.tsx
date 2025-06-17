import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import CompanyAccountManager from './CompanyAccountManager';
import { useCompany } from '../../context/CompanyContext';
import { useAuth } from '../../context/AuthContext';
import { Company } from '../../types';
import { 
  Building, 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Search,
  Calendar,
  Hash,
  UserCheck,
  ArrowLeft
} from 'lucide-react';

const CompanyManagement: React.FC = () => {
  const { companies, loading, createCompany, updateCompany, deleteCompany, refreshData } = useCompany();
  const { isSuperAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    accountId: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isSuperAdmin) {
    return (
      <div className="text-center py-12">
        <Building size={64} className="mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
        <p className="text-gray-600">Only super administrators can manage companies.</p>
      </div>
    );
  }

  // If viewing a specific company's account IDs
  if (selectedCompany) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => setSelectedCompany(null)}
            icon={<ArrowLeft size={18} />}
          >
            Back to Companies
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Company Details</h2>
            <p className="text-gray-600">{selectedCompany.name}</p>
          </div>
        </div>
        
        <CompanyAccountManager 
          companyId={selectedCompany.id}
          companyName={selectedCompany.name}
        />
      </div>
    );
  }

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (company.accountId && company.accountId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      await createCompany(formData.name, formData.accountId || undefined);
      setFormData({ name: '', accountId: '' });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating company:', error);
      alert('Failed to create company. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany || !formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      await updateCompany(editingCompany.id, {
        name: formData.name,
        accountId: formData.accountId || undefined
      });
      setEditingCompany(null);
      setFormData({ name: '', accountId: '' });
    } catch (error) {
      console.error('Error updating company:', error);
      alert('Failed to update company. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCompany = async (company: Company) => {
    if (!confirm(`Are you sure you want to delete "${company.name}"? This will remove all associated users and data.`)) {
      return;
    }

    try {
      await deleteCompany(company.id);
    } catch (error) {
      console.error('Error deleting company:', error);
      alert('Failed to delete company. Please try again.');
    }
  };

  const startEdit = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      accountId: company.accountId || ''
    });
    setShowCreateForm(false);
  };

  const cancelEdit = () => {
    setEditingCompany(null);
    setFormData({ name: '', accountId: '' });
  };

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
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Building size={28} className="mr-3 text-blue-600" />
            Company Management
          </h2>
          <p className="text-gray-600 mt-1">Manage all companies and their account settings</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={refreshData}
            icon={<Eye size={18} />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setShowCreateForm(true);
              setEditingCompany(null);
              setFormData({ name: '', accountId: '' });
            }}
            icon={<Plus size={18} />}
          >
            Add Company
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building size={20} className="text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total Companies</p>
                <p className="text-2xl font-bold text-gray-900">{companies.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users size={20} className="text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {companies.reduce((sum, company) => sum + (company.userCount || 0), 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <UserCheck size={20} className="text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total Admins</p>
                <p className="text-2xl font-bold text-gray-900">
                  {companies.reduce((sum, company) => sum + (company.adminCount || 0), 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Hash size={20} className="text-orange-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">With Account IDs</p>
                <p className="text-2xl font-bold text-gray-900">
                  {companies.filter(c => c.accountId).length}
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
              placeholder="Search companies by name or account ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Form */}
      {(showCreateForm || editingCompany) && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingCompany ? 'Edit Company' : 'Create New Company'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={editingCompany ? handleUpdateCompany : handleCreateCompany} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Company Name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter company name"
                  required
                />
                <Input
                  label="Primary Account ID (Optional)"
                  value={formData.accountId}
                  onChange={(e) => setFormData(prev => ({ ...prev, accountId: e.target.value }))}
                  placeholder="Enter primary account ID"
                  helpText="You can add multiple account IDs after creating the company"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    cancelEdit();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                >
                  {editingCompany ? 'Update Company' : 'Create Company'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Companies List */}
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredCompanies.length > 0 ? (
          filteredCompanies.map(company => (
            <Card key={company.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{company.name}</h3>
                      {company.accountId && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                          Primary ID: {company.accountId}
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center text-gray-600">
                        <Users size={14} className="mr-1" />
                        <span>{company.userCount || 0} users</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <UserCheck size={14} className="mr-1" />
                        <span>{company.adminCount || 0} admins</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Calendar size={14} className="mr-1" />
                        <span>Created {formatDate(company.createdAt)}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Hash size={14} className="mr-1" />
                        <span>{company.accountId || 'No Primary ID'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedCompany(company)}
                      icon={<Hash size={16} />}
                    >
                      Account IDs
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(company)}
                      icon={<Edit size={16} />}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteCompany(company)}
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
              <Building size={64} className="mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No companies found' : 'No companies yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm 
                  ? 'Try adjusting your search criteria'
                  : 'Create your first company to get started'
                }
              </p>
              {!searchTerm && (
                <Button
                  variant="primary"
                  onClick={() => setShowCreateForm(true)}
                  icon={<Plus size={18} />}
                >
                  Create First Company
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CompanyManagement;