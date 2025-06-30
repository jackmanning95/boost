import React, { useState } from 'react';
import { useCompany } from '../../context/CompanyContext';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Badge from '../ui/Badge';
import { UserPlus, Mail, Shield, User, Trash2, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

export const TeamManagement: React.FC = () => {
  const { user } = useAuth();
  const { company, teamMembers, loading, inviteUser, updateUserRole, removeUser } = useCompany();
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    name: '',
    role: 'user' as 'admin' | 'user'
  });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin';

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.email || !inviteForm.name) return;

    setInviteLoading(true);
    setInviteError(null);
    setInviteSuccess(null);

    try {
      await inviteUser(inviteForm.email, inviteForm.name, inviteForm.role);
      setInviteSuccess(`Successfully invited ${inviteForm.name} (${inviteForm.email})`);
      setInviteForm({ email: '', name: '', role: 'user' });
      setShowInviteForm(false);
      
      // Clear success message after 5 seconds
      setTimeout(() => setInviteSuccess(null), 5000);
    } catch (error) {
      console.error('Error inviting user:', error);
      
      // Enhanced error display with better formatting
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setInviteError(`Failed to invite user: ${errorMessage}`);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'user') => {
    try {
      await updateUserRole(userId, newRole);
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Failed to update user role');
    }
  };

  const handleRemoveUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to remove ${userName} from the team?`)) {
      return;
    }

    try {
      await removeUser(userId);
    } catch (error) {
      console.error('Error removing user:', error);
      alert('Failed to remove user');
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {inviteSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-green-800 font-medium">Invitation Sent!</p>
            <p className="text-green-700 text-sm">{inviteSuccess}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {inviteError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800 font-medium">Invitation Failed</p>
              <div className="text-red-700 text-sm mt-1 whitespace-pre-wrap">{inviteError}</div>
              
              {/* Troubleshooting Help */}
              {inviteError.includes('Edge Function') && (
                <div className="mt-3 p-3 bg-red-100 rounded border border-red-200">
                  <p className="text-red-800 font-medium text-sm mb-2">🔧 Troubleshooting Steps:</p>
                  <ol className="text-red-700 text-sm space-y-1 list-decimal list-inside">
                    <li>Check that the invite-user Edge Function is deployed</li>
                    <li>Verify environment variables are set in Supabase Dashboard</li>
                    <li>Ensure SUPABASE_SERVICE_ROLE_KEY is configured correctly</li>
                    <li>Check Edge Function logs in Supabase Dashboard</li>
                  </ol>
                  <p className="text-red-700 text-sm mt-2">
                    📖 See <code>CRITICAL-FIX-STEPS.md</code> for detailed instructions.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Team Management</h2>
            <p className="text-gray-600 mt-1">
              Manage your team members and their roles
            </p>
          </div>
          {isAdmin && (
            <Button
              onClick={() => setShowInviteForm(!showInviteForm)}
              className="flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Invite User
            </Button>
          )}
        </div>

        {/* Invite Form */}
        {showInviteForm && isAdmin && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Invite New Team Member</h3>
            <form onSubmit={handleInviteUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    placeholder="user@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <Input
                    type="text"
                    value={inviteForm.name}
                    onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                    placeholder="John Doe"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as 'admin' | 'user' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={inviteLoading}
                  className="flex items-center gap-2"
                >
                  {inviteLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Sending Invitation...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4" />
                      Send Invitation
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowInviteForm(false);
                    setInviteError(null);
                    setInviteSuccess(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Team Members List */}
        <div className="space-y-4">
          {teamMembers.length === 0 ? (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No team members found</p>
              {isAdmin && (
                <p className="text-gray-400 text-sm mt-2">
                  Click "Invite User" to add your first team member
                </p>
              )}
            </div>
          ) : (
            teamMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{member.name || member.email}</h4>
                    <p className="text-sm text-gray-500">{member.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Badge
                    variant={member.role === 'admin' ? 'default' : 'secondary'}
                    className="flex items-center gap-1"
                  >
                    {member.role === 'admin' ? (
                      <Shield className="h-3 w-3" />
                    ) : (
                      <User className="h-3 w-3" />
                    )}
                    {member.role}
                  </Badge>
                  
                  {isAdmin && member.id !== user?.id && (
                    <div className="flex items-center gap-2">
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.id, e.target.value as 'admin' | 'user')}
                        className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveUser(member.id, member.name || member.email)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};