import React, { useState } from 'react';
import Layout from '../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import CompanyManagement from '../components/admin/CompanyManagement';
import UserManagement from '../components/admin/UserManagement';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { Navigate } from 'react-router-dom';
import { 
  Building, 
  Users, 
  Settings, 
  BarChart3,
  Shield,
  Crown,
  Activity,
  TrendingUp
} from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const { user, isSuperAdmin, isCompanyAdmin } = useAuth();
  const { companies, companyUsers } = useCompany();
  const [activeTab, setActiveTab] = useState<'overview' | 'companies' | 'users' | 'settings'>('overview');

  // Redirect if not admin
  if (!isCompanyAdmin && !isSuperAdmin) {
    return <Navigate to="/campaigns" replace />;
  }

  const tabs = [
    { 
      id: 'overview' as const, 
      label: 'Overview', 
      icon: <BarChart3 size={18} />,
      show: true
    },
    { 
      id: 'companies' as const, 
      label: 'Companies', 
      icon: <Building size={18} />,
      show: isSuperAdmin
    },
    { 
      id: 'users' as const, 
      label: 'Users', 
      icon: <Users size={18} />,
      show: isCompanyAdmin || isSuperAdmin
    },
    { 
      id: 'settings' as const, 
      label: 'Settings', 
      icon: <Settings size={18} />,
      show: true
    },
  ].filter(tab => tab.show);

  const getOverviewStats = () => {
    if (isSuperAdmin) {
      return {
        totalCompanies: companies.length,
        totalUsers: companies.reduce((sum, company) => sum + (company.userCount || 0), 0),
        totalAdmins: companies.reduce((sum, company) => sum + (company.adminCount || 0), 0),
        companiesWithAccountIds: companies.filter(c => c.accountId).length
      };
    } else {
      return {
        companyUsers: companyUsers.length,
        companyAdmins: companyUsers.filter(u => u.role === 'admin').length,
        regularUsers: companyUsers.filter(u => u.role === 'user').length,
        recentJoins: companyUsers.filter(u => {
          const joinDate = new Date(u.createdAt);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return joinDate > thirtyDaysAgo;
        }).length
      };
    }
  };

  const stats = getOverviewStats();

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            {isSuperAdmin ? (
              <>
                <Crown size={28} className="mr-3 text-yellow-600" />
                Super Admin Dashboard
              </>
            ) : (
              <>
                <Shield size={28} className="mr-3 text-blue-600" />
                Company Admin Dashboard
              </>
            )}
          </h2>
          <p className="text-gray-600 mt-1">
            {isSuperAdmin 
              ? 'Manage all companies and platform-wide settings'
              : 'Manage your company users and settings'
            }
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      {isSuperAdmin ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building size={20} className="text-blue-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Total Companies</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalCompanies}</p>
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
                  <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
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
                  <p className="text-sm font-medium text-gray-500">Total Admins</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalAdmins}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Activity size={20} className="text-orange-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">With Account IDs</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.companiesWithAccountIds}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users size={20} className="text-blue-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Company Users</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.companyUsers}</p>
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
                  <p className="text-2xl font-bold text-gray-900">{stats.companyAdmins}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Shield size={20} className="text-green-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Regular Users</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.regularUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <TrendingUp size={20} className="text-orange-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Recent Joins</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.recentJoins}</p>
                  <p className="text-xs text-gray-500">Last 30 days</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {isSuperAdmin && (
              <button
                onClick={() => setActiveTab('companies')}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <Building size={24} className="text-blue-600 mb-2" />
                <h3 className="font-medium text-gray-900">Manage Companies</h3>
                <p className="text-sm text-gray-600">Add, edit, or remove companies</p>
              </button>
            )}
            
            <button
              onClick={() => setActiveTab('users')}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <Users size={24} className="text-green-600 mb-2" />
              <h3 className="font-medium text-gray-900">Manage Users</h3>
              <p className="text-sm text-gray-600">Invite and manage team members</p>
            </button>
            
            <button
              onClick={() => setActiveTab('settings')}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <Settings size={24} className="text-purple-600 mb-2" />
              <h3 className="font-medium text-gray-900">Settings</h3>
              <p className="text-sm text-gray-600">Configure system preferences</p>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Admin Settings</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>System Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Admin settings and configuration options will be available here.</p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
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

          {/* Main Content */}
          <div className="md:w-3/4">
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'companies' && isSuperAdmin && <CompanyManagement />}
            {activeTab === 'users' && <UserManagement />}
            {activeTab === 'settings' && renderSettings()}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminDashboard;