import React, { useState } from 'react';
import Layout from '../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { User, Settings, Briefcase, Shield } from 'lucide-react';

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  
  if (!user) {
    return null;
  }
  
  const tabs = [
    { id: 'profile', label: 'Profile', icon: <User size={18} /> },
    { id: 'platforms', label: 'Platform IDs', icon: <Briefcase size={18} /> },
    { id: 'security', label: 'Security', icon: <Shield size={18} /> },
  ];
  
  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
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
                  <form className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Input
                        label="Full Name"
                        defaultValue={user.name}
                      />
                      
                      <Input
                        label="Email Address"
                        type="email"
                        defaultValue={user.email}
                        disabled
                      />
                      
                      <Input
                        label="Company"
                        defaultValue={user.companyName || ''}
                      />
                      
                      <Input
                        label="Role"
                        defaultValue={user.role === 'admin' ? 'Administrator' : 'Client'}
                        disabled
                      />
                    </div>
                    
                    <div className="flex justify-end">
                      <Button variant="primary">
                        Save Changes
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
            
            {activeTab === 'platforms' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Briefcase size={20} className="mr-2 text-blue-600" />
                    Platform Integration IDs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-6">
                    Add your platform account IDs to ensure audiences are dispatched to the correct accounts.
                  </p>
                  
                  <form className="space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                      <Input
                        label="Meta Business ID"
                        defaultValue={user.platformIds.meta || ''}
                        placeholder="Enter your Meta Business ID"
                      />
                      
                      <Input
                        label="The Trade Desk Advertiser ID"
                        defaultValue={user.platformIds.ttd || ''}
                        placeholder="Enter your TTD Advertiser ID"
                      />
                      
                      <Input
                        label="DV360 Partner ID"
                        defaultValue={user.platformIds.dv360 || ''}
                        placeholder="Enter your DV360 Partner ID"
                      />
                      
                      <Input
                        label="Amazon DSP Advertiser ID"
                        defaultValue={user.platformIds.amazon || ''}
                        placeholder="Enter your Amazon DSP Advertiser ID"
                      />
                    </div>
                    
                    <div className="flex justify-end">
                      <Button variant="primary">
                        Save Platform IDs
                      </Button>
                    </div>
                  </form>
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