import React, { useState } from 'react';
import Layout from '../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import TeamManagement from '../components/company/TeamManagement';
import { useAuth } from '../context/AuthContext';
import { User, Settings, Shield, Save, Users, Building } from 'lucide-react';
import AdvertiserAccountManager from '../components/settings/AdvertiserAccountManager';

const SettingsPage: React.FC = () => {
  const { user, updateUserProfile, isCompanyAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');
  
  // Profile form state
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || ''
  });
  
  if (!user) {
    return null;
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setUpdateMessage('');

    try {
      await updateUserProfile({
        name: profileData.name
      });
      setUpdateMessage('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      setUpdateMessage('Failed to update profile. Please try again.');
    } finally {
      setIsUpdating(false);
      // Clear message after 3 seconds
      setTimeout(() => setUpdateMessage(''), 3000);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const tabs = [
    { id: 'profile', label: 'Profile', icon: <User size={18} /> },
    { id: 'platforms', label: 'Platform IDs', icon: <Settings size={18} /> },
    { id: 'team', label: 'Team', icon: <Users size={18} />, show: isCompanyAdmin },
    { id: 'company', label: 'Company', icon: <Building size={18} />, show: isCompanyAdmin },
    { id: 'security', label: 'Security', icon: <Shield size={18} /> },
  ].filter(tab => tab.show !== false);
  
  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600">Manage your account settings and preferences</p>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-6">
          {/* Tabs */}
          <div className="md:w-1/4">
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-200">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      className={`w-full text-left px-4 py-3 flex items-center space-x-3 ${
                        activeTab === tab.id
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Content */}
          <div className="md:w-3/4">
            {activeTab === 'profile' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User size={20} className="mr-2 text-blue-600" />
                    Profile Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProfileUpdate} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Input
                        label="Full Name"
                        value={profileData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        required
                      />
                      
                      <Input
                        label="Email Address"
                        type="email"
                        value={profileData.email}
                        disabled
                        className="bg-gray-50"
                      />
                      
                      <Input
                        label="Company"
                        value={user.companyName || ''}
                        disabled
                        className="bg-gray-50"
                      />
                      
                      <Input
                        label="Role"
                        value={user.role === 'admin' ? 'Administrator' : user.role === 'super_admin' ? 'Super Administrator' : 'User'}
                        disabled
                        className="bg-gray-50"
                      />
                    </div>
                    
                    {updateMessage && (
                      <div className={`p-3 rounded-md text-sm ${
                        updateMessage.includes('successfully') 
                          ? 'bg-green-50 text-green-700 border border-green-200' 
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {updateMessage}
                      </div>
                    )}
                    
                    <div className="flex justify-end">
                      <Button 
                        variant="primary" 
                        type="submit"
                        isLoading={isUpdating}
                        icon={<Save size={16} />}
                        disabled={profileData.name === user.name}
                      >
                        {isUpdating ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
            
            {activeTab === 'platforms' && (
              <AdvertiserAccountManager />
            )}

            {activeTab === 'team' && isCompanyAdmin && (
              <TeamManagement />
            )}

            {activeTab === 'company' && isCompanyAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Building size={20} className="mr-2 text-blue-600" />
                    Company Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-4">Company Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="Company Name"
                          value={user.companyName || ''}
                          disabled
                          className="bg-gray-50"
                        />
                        <Input
                          label="Company ID"
                          value={user.companyId || ''}
                          disabled
                          className="bg-gray-50"
                        />
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-gray-200">
                      <h3 className="text-lg font-medium mb-4">Account Management</h3>
                      <p className="text-gray-600 mb-4">
                        Manage platform account IDs and team member access from the Team tab.
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => setActiveTab('team')}
                        icon={<Users size={16} />}
                      >
                        Manage Team
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {activeTab === 'security' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield size={20} className="mr-2 text-blue-600" />
                    Security Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-lg font-medium mb-4">Change Password</h3>
                      <form className="space-y-4">
                        <Input
                          label="Current Password"
                          type="password"
                          placeholder="••••••••"
                        />
                        
                        <Input
                          label="New Password"
                          type="password"
                          placeholder="••••••••"
                        />
                        
                        <Input
                          label="Confirm New Password"
                          type="password"
                          placeholder="••••••••"
                        />
                        
                        <div className="flex justify-end">
                          <Button variant="primary">
                            Update Password
                          </Button>
                        </div>
                      </form>
                    </div>
                    
                    <div className="pt-4 border-t border-gray-200">
                      <h3 className="text-lg font-medium mb-4">Two-Factor Authentication</h3>
                      <p className="text-gray-600 mb-4">
                        Add an extra layer of security to your account by enabling two-factor authentication.
                      </p>
                      <Button variant="outline">
                        Enable 2FA
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SettingsPage;