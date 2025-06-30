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
  AlertCircle,
  Eye,
  Settings
} from 'lucide-react';

export const TeamManagement: React.FC = () => {
  const { companyUsers, currentCompany, loading, inviteUser, updateUserRole, removeUser, fetchCompanyUsers } = useCompany();
  const { user, isCompanyAdmin, isSuperAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'user' as 'admin' | 'user'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  // Allow all users to view the team list, but only admins can manage
  const canManage = isCompanyAdmin || isSuperAdmin;

  const filteredUsers = (companyUsers || []).filter(companyUser =>
    companyUser.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    companyUser.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteData.email.trim() || !inviteData.firstName.trim() || !inviteData.lastName.trim() || !canManage) return;

    setIsSubmitting(true);
    setInviteError('');
    
    try {
      await inviteUser(inviteData.email, inviteData.role, inviteData.firstName, inviteData.lastName);
      setInviteData({ email: '', firstName: '', lastName: '', role: 'user' });
      setShowInviteForm(false);
    } catch (error) {
      console.error('Error inviting user:', error);
      
      // Enhanced error handling with specific guidance for environment variable issues
      let errorMessage = 'Failed to invite user. Please try again.';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Check for specific error patterns that indicate environment variable issues
        if (error.message.includes('🚨') || 
            error.message.includes('ENVIRONMENT VARIABLE') || 
            error.message.includes('CONFIGURATION ERROR') ||
            error.message.includes('Auth API unexpected failure') ||
            error.message.includes('Edge Function returned a non-2xx status code')) {
          // These are configuration errors that need immediate attention
          setInviteError(error.message);
        } else {
          // Generic error handling
          setInviteError(errorMessage);
        }
      } else {
        setInviteError('An unexpected error occurred. This may be due to missing environment variables in the invite-user Edge Function.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: 'admin' | 'user') => {
    if (!canManage) return;
    
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
    if (!canManage) return;
    
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
            Team Members
            {currentCompany && (
              <span className="ml-3 text-lg font-normal text-gray-600">
                - {currentCompany.name}
              </span>
            )}
          </h2>
          <p className="text-gray-600 mt-1">
            {canManage 
              ? 'Invite and manage team members within your company'
              : 'View team members within your company'
            }
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => fetchCompanyUsers()}
            icon={<Eye size={18} />}
          >
            Refresh
          </Button>
          {canManage && (
            <Button
              variant="primary"
              onClick={() => setShowInviteForm(true)}
              icon={<Plus size={18} />}
            >
              Invite Team Member
            </Button>
          )}
        </div>
      </div>

      {/* Environment Variable Warning - Show if there are invitation errors */}
      {inviteError && (inviteError.includes('🚨') || inviteError.includes('ENVIRONMENT VARIABLE') || inviteError.includes('CONFIGURATION ERROR')) && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start">
              <Settings size={20} className="text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-red-900 mb-2">Configuration Issue Detected</h3>
                <div className="text-sm text-red-700 space-y-2">
                  <p>The invite-user Edge Function needs to be configured properly:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Go to your <strong>Supabase Dashboard</strong></li>
                    <li>Navigate to <strong>Settings → API</strong></li>
                    <li>Copy your <strong>service_role</strong> key (NOT the anon key)</li>
                    <li>Go to <strong>Edge Functions → invite-user → Settings</strong></li>
                    <li>Add <strong>SUPABASE_SERVICE_ROLE_KEY</strong> with the copied value</li>
                    <li>Click <strong>Deploy</strong> to redeploy the function</li>
                  </ol>
                  <p className="mt-2 font-medium">This is the most common cause of invitation failures.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                <p className="text-2xl font-bold text-gray-900">{(companyUsers || []).length}</p>
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
                  {(companyUsers || []).filter(u => u.role === 'admin').length}
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
                  {(companyUsers || []).filter(u => u.role === 'user').length}
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

      {/* Invite Form - Only show for admins */}
      {canManage && showInviteForm && (
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
                    <li>• A secure invitation will be sent to create their account</li>
                    <li>• They will receive an email with setup instructions</li>
                    <li>• They will be automatically added to your company</li>
                    <li>• You can change their role at any time</li>
                  </ul>
                </div>
              </div>
            </div>

            <form onSubmit={handleInviteUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  type="text"
                  value={inviteData.firstName}
                  onChange={(e) => setInviteData(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="John"
                  required
                />
                <Input
                  label="Last Name"
                  type="text"
                  value={inviteData.lastName}
                  onChange={(e) => setInviteData(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Smith"
                  required
                />
              </div>
              
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

              {/* Enhanced error display */}
              {inviteError && (
                <div className={`p-4 rounded-lg ${
                  inviteError.includes('🚨') || inviteError.includes('ENVIRONMENT VARIABLE') || inviteError.includes('CONFIGURATION ERROR')
                    ? 'bg-red-50 border border-red-200'
                    : 'bg-yellow-50 border border-yellow-200'
                }`}>
                  <div className="flex items-start">
                    <AlertCircle size={16} className={`mt-0.5 mr-2 flex-shrink-0 ${
                      inviteError.includes('🚨') ? 'text-red-600' : 'text-yellow-600'
                    }`} />
                    <div className={`text-sm ${
                      inviteError.includes('🚨') ? 'text-red-700' : 'text-yellow-700'
                    }`}>
                      <div className="whitespace-pre-line">{inviteError}</div>
                    </div>
                  </div>
                </div>
              )}
              
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
            const canModifyThisUser = canManage && !isCurrentUser;
            
            return (
              <Card key={companyUser.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{companyUser.name || companyUser.email}</h3>
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
                    
                    {canModifyThisUser && (
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
                  : canManage
                    ? 'Invite your first team member to get started collaborating'
                    : 'No team members have been added to your company yet'
                }
              </p>
              {!searchTerm && canManage && (
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