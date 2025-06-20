import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Badge from '../ui/Badge';
import { useCompany } from '../../context/CompanyContext';
import { useAuth } from '../../context/AuthContext';
import { CompanyUser } from '../../types';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Mail, 
  Search,
  Calendar,
  Shield,
  UserCheck,
  UserX,
  Crown,
  Send,
  AlertCircle
} from 'lucide-react';

const TeamManagement: React.FC = () => {
  const { companyUsers, currentCompany, loading, inviteUser, updateUserRole, removeUser, fetchCompanyUsers } = useCompany();
  const { user, isCompanyAdmin, isSuperAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'user' as 'admin' | 'user'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  if (!isCompanyAdmin && !isSuperAdmin) {
    return (
      <div className="text-center py-12">
        <Users size={64} className="mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
        <p className="text-gray-600">Only company administrators can manage team members.</p>
      </div>
    );
  }

  const filteredUsers = companyUsers.filter(companyUser =>
    companyUser.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    companyUser.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteData.email.trim()) return;

    setIsSubmitting(true);
    setInviteError('');
    
    try {
      await inviteUser(inviteData.email, inviteData.role);
      setInviteData({ email: '', role: 'user' });
      setShowInviteForm(false);
    } catch (error) {
      console.error('Error inviting user:', error);
      setInviteError(error instanceof Error ? error.message : 'Failed to invite user. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: 'admin' | 'user') => {
    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
      return;
    }

    try {
      await updateUserRole(userId, newRole);
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Failed to update user role. Please try again.');
    }
  };

  const handleRemoveUser = async (userToRemove: CompanyUser) => {
    if (!confirm(`Are you sure you want to remove "${userToRemove.name}" from the company? This action cannot be undone.`)) {
      return;
    }

    try {
      await removeUser(userToRemove.id);
    } catch (error) {
      console.error('Error removing user:', error);
      alert('Failed to remove user. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRoleBadge = (role: string, isCurrentUser: boolean) => {
    if (role === 'admin') {
      return (
        <Badge variant="primary" className="flex items-center">
          <Crown size={12} className="mr-1" />
          Admin {isCurrentUser && '(You)'}
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="flex items-center">
        <UserCheck size={12} className="mr-1" />
        User {isCurrentUser && '(You)'}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Users size={28} className="mr-3 text-blue-600" />
            Team Management
            {currentCompany && (
              <span className="ml-3 text-lg font-normal text-gray-600">
                - {currentCompany.name}
              </span>
            )}
          </h2>
          <p className="text-gray-600 mt-1">Invite and manage team members within your company</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => fetchCompanyUsers()}
            icon={<UserCheck size={18} />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            onClick={() => setShowInviteForm(true)}
            icon={<Plus size={18} />}
          >
            Invite Team Member
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users size={20} className="text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total Team Members</p>
                <p className="text-2xl font-bold text-gray-900">{companyUsers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Crown size={20} className="text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Administrators</p>
                <p className="text-2xl font-bold text-gray-900">
                  {companyUsers.filter(u => u.role === 'admin').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <UserCheck size={20} className="text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Regular Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {companyUsers.filter(u => u.role === 'user').length}
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
              placeholder="Search team members by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Invite Form */}
      {showInviteForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mail size={20} className="mr-2" />
              Invite New Team Member
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <AlertCircle size={20} className="text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-blue-900 mb-1">How Team Invitations Work</h3>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• A temporary account will be created with a default password</li>
                    <li>• The user should change their password on first login</li>
                    <li>• They will be automatically added to your company</li>
                    <li>• You can change their role at any time</li>
                  </ul>
                </div>
              </div>
            </div>

            <form onSubmit={handleInviteUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Email Address"
                  type="email"
                  value={inviteData.email}
                  onChange={(e) => setInviteData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="colleague@company.com"
                  required
                  error={inviteError}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    value={inviteData.role}
                    onChange={(e) => setInviteData(prev => ({ ...prev, role: e.target.value as 'admin' | 'user' }))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="user">User - Can create and manage their own campaigns</option>
                    <option value="admin">Administrator - Can manage team members and company settings</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowInviteForm(false);
                    setInviteError('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                  icon={<Send size={16} />}
                >
                  Send Invitation
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Team Members List */}
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredUsers.length > 0 ? (
          filteredUsers.map(companyUser => {
            const isCurrentUser = companyUser.id === user?.id;
            const canModify = !isCurrentUser && (isSuperAdmin || isCompanyAdmin);
            
            return (
              <Card key={companyUser.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{companyUser.name}</h3>
                        {getRoleBadge(companyUser.role, isCurrentUser)}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center text-gray-600">
                          <Mail size={14} className="mr-1" />
                          <span>{companyUser.email}</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Calendar size={14} className="mr-1" />
                          <span>Joined {formatDate(companyUser.createdAt)}</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Shield size={14} className="mr-1" />
                          <span>Role: {companyUser.role === 'admin' ? 'Administrator' : 'User'}</span>
                        </div>
                      </div>
                    </div>
                    
                    {canModify && (
                      <div className="flex items-center space-x-2">
                        {companyUser.role === 'user' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateRole(companyUser.id, 'admin')}
                            icon={<Crown size={16} />}
                          >
                            Promote to Admin
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateRole(companyUser.id, 'user')}
                            icon={<UserX size={16} />}
                          >
                            Remove Admin
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveUser(companyUser)}
                          icon={<Trash2 size={16} />}
                          className="text-red-600 hover:text-red-700"
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Users size={64} className="mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No team members found' : 'No team members yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm 
                  ? 'Try adjusting your search criteria'
                  : 'Invite your first team member to get started collaborating'
                }
              </p>
              {!searchTerm && (
                <Button
                  variant="primary"
                  onClick={() => setShowInviteForm(true)}
                  icon={<Plus size={18} />}
                >
                  Invite First Team Member
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TeamManagement;