import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import CampaignFilters from '../components/campaigns/CampaignFilters';
import { useCampaign } from '../context/CampaignContext';
import { useAuth } from '../context/AuthContext';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Users, 
  Eye, 
  Search, 
  Filter, 
  Building,
  TrendingUp,
  DollarSign,
  Target,
  Activity,
  BarChart3,
  PlayCircle,
  CheckCircle2,
  Trash2,
  Archive,
  RotateCcw,
  CheckSquare,
  Square,
  AlertTriangle,
  MoreVertical,
  FileText,
  Inbox,
  Hash
} from 'lucide-react';

interface ClientFilters {
  search: string;
  advertiser: string;
  status: string;
}

const CampaignsPage: React.FC = () => {
  const { 
    filteredCampaigns, 
    campaigns,
    requests,
    pendingRequests,
    rejectedRequests,
    archivedRequests,
    initializeCampaign, 
    filters, 
    setFilters, 
    loading,
    getCampaignStatusCategory,
    activeCampaigns,
    completedCampaigns,
    deleteCampaign,
    archiveCampaign,
    unarchiveCampaign
  } = useCampaign();
  const { user, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [showNewCampaignForm, setShowNewCampaignForm] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string>>(new Set());
  const [showArchived, setShowArchived] = useState(false);
  const [activeTab, setActiveTab] = useState<'campaigns' | 'requests'>('campaigns');
  const [clientFilters, setClientFilters] = useState<ClientFilters>({
    search: '',
    advertiser: '',
    status: ''
  });
  
  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCampaignName.trim()) {
      initializeCampaign(newCampaignName.trim());
      setNewCampaignName('');
      setShowNewCampaignForm(false);
      navigate('/audiences');
    }
  };

  const handleStartWithAudiences = () => {
    const defaultName = `Campaign ${new Date().toLocaleDateString()}`;
    initializeCampaign(defaultName);
    navigate('/audiences');
  };

  const handleViewCampaign = (campaignId: string) => {
    navigate(`/campaigns/${campaignId}`);
  };

  // Selection handlers
  const handleSelectCampaign = (campaignId: string, checked: boolean) => {
    const newSelected = new Set(selectedCampaignIds);
    if (checked) {
      newSelected.add(campaignId);
    } else {
      newSelected.delete(campaignId);
    }
    setSelectedCampaignIds(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(displayCampaigns.map(c => c.id));
      setSelectedCampaignIds(allIds);
    } else {
      setSelectedCampaignIds(new Set());
    }
  };

  // Bulk action handlers
  const handleBulkDelete = async () => {
    if (selectedCampaignIds.size === 0) return;
    
    if (!confirm(`Permanently delete ${selectedCampaignIds.size} selected campaign(s)? This action cannot be undone.`)) return;
    
    try {
      await Promise.all(Array.from(selectedCampaignIds).map(id => deleteCampaign(id)));
      setSelectedCampaignIds(new Set());
    } catch (error) {
      console.error('Error deleting campaigns:', error);
    }
  };

  const handleBulkArchive = async () => {
    if (selectedCampaignIds.size === 0) return;
    
    if (!confirm(`Archive ${selectedCampaignIds.size} selected campaign(s)?`)) return;
    
    try {
      await Promise.all(Array.from(selectedCampaignIds).map(id => archiveCampaign(id)));
      setSelectedCampaignIds(new Set());
    } catch (error) {
      console.error('Error archiving campaigns:', error);
    }
  };

  const handleBulkUnarchive = async () => {
    if (selectedCampaignIds.size === 0) return;
    
    try {
      await Promise.all(Array.from(selectedCampaignIds).map(id => unarchiveCampaign(id)));
      setSelectedCampaignIds(new Set());
    } catch (error) {
      console.error('Error unarchiving campaigns:', error);
    }
  };

  // Individual action handlers
  const handleDeleteCampaign = async (campaignId: string, campaignName: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${campaignName}"? This action cannot be undone.`)) return;
    
    try {
      await deleteCampaign(campaignId);
    } catch (error) {
      console.error('Error deleting campaign:', error);
    }
  };

  const handleArchiveCampaign = async (campaignId: string) => {
    try {
      await archiveCampaign(campaignId);
    } catch (error) {
      console.error('Error archiving campaign:', error);
    }
  };

  const handleUnarchiveCampaign = async (campaignId: string) => {
    try {
      await unarchiveCampaign(campaignId);
    } catch (error) {
      console.error('Error unarchiving campaign:', error);
    }
  };

  // Client-side filtering for non-admin users
  const getFilteredCampaigns = () => {
    let baseCampaigns = isSuperAdmin ? filteredCampaigns : filteredCampaigns;

    // Filter by archived status
    baseCampaigns = baseCampaigns.filter(campaign => {
      if (showArchived) {
        return campaign.archived === true;
      } else {
        return !campaign.archived;
      }
    });

    if (isSuperAdmin) {
      return baseCampaigns; // Use existing admin filters
    }

    return baseCampaigns.filter(campaign => {
      // Search filter
      if (clientFilters.search) {
        const searchLower = clientFilters.search.toLowerCase();
        const searchableText = `${campaign.name} ${campaign.users?.name || ''} ${campaign.users?.companies?.name || ''}`.toLowerCase();
        if (!searchableText.includes(searchLower)) {
          return false;
        }
      }

      // Advertiser filter (using campaign name as proxy for advertiser)
      if (clientFilters.advertiser && !campaign.name.toLowerCase().includes(clientFilters.advertiser.toLowerCase())) {
        return false;
      }

      // Status filter
      if (clientFilters.status) {
        // Map status categories
        const statusCategory = getStatusCategory(campaign.status);
        if (statusCategory !== clientFilters.status) {
          return false;
        }
      }

      return true;
    });
  };

  const getStatusCategory = (status: string) => {
    switch (status) {
      case 'draft':
      case 'submitted':
      case 'pending_review':
        return 'upcoming';
      case 'approved':
      case 'in_progress':
      case 'waiting_on_client':
      case 'delivered':
      case 'live':
      case 'paused':
        return 'active';
      case 'completed':
      case 'failed':
        return 'past';
      default:
        return 'upcoming';
    }
  };

  const displayCampaigns = getFilteredCampaigns();

  // Get current requests based on user role
  const getCurrentRequests = () => {
    if (isSuperAdmin) {
      return requests; // Super admin sees all requests
    } else {
      // Regular users see their own requests
      return requests.filter(request => request.clientId === user?.id);
    }
  };

  const currentRequests = getCurrentRequests();

  // Calculate topline figures
  const getToplineStats = () => {
    const allCampaigns = isSuperAdmin ? campaigns : campaigns.filter(c => c.clientId === user?.id);
    const nonArchivedCampaigns = allCampaigns.filter(c => !c.archived);
    
    const activeCampaignsList = nonArchivedCampaigns.filter(c => getStatusCategory(c.status) === 'active');
    const upcomingCampaignsList = nonArchivedCampaigns.filter(c => getStatusCategory(c.status) === 'upcoming');
    const archivedCount = allCampaigns.filter(c => c.archived).length;
    
    // Calculate total audiences for active & upcoming campaigns
    const totalAudiences = [...activeCampaignsList, ...upcomingCampaignsList]
      .reduce((sum, campaign) => sum + (campaign.audiences?.length || 0), 0);
    
    // Calculate total budget for active & upcoming campaigns
    const totalBudget = [...activeCampaignsList, ...upcomingCampaignsList]
      .reduce((sum, campaign) => sum + (campaign.budget || 0), 0);

    return {
      activeCampaigns: activeCampaignsList.length,
      upcomingCampaigns: upcomingCampaignsList.length,
      archivedCampaigns: archivedCount,
      totalAudiences,
      totalBudget,
      pendingRequests: currentRequests.filter(r => r.status === 'pending' && !r.archived).length,
      rejectedRequests: currentRequests.filter(r => r.status === 'rejected' && !r.archived).length
    };
  };

  const stats = getToplineStats();

  // Get unique companies for admin filtering
  const getUniqueCompanies = () => {
    const companies = new Set<string>();
    campaigns.forEach(campaign => {
      if (campaign.users?.companies?.name) {
        companies.add(campaign.users.companies.name);
      }
    });
    return Array.from(companies).sort();
  };

  // Pagination
  const totalPages = Math.ceil(displayCampaigns.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCampaigns = displayCampaigns.slice(startIndex, startIndex + itemsPerPage);
  
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { variant: 'default' as const, label: 'Draft' },
      submitted: { variant: 'primary' as const, label: 'Submitted' },
      pending_review: { variant: 'warning' as const, label: 'Pending Review' },
      approved: { variant: 'success' as const, label: 'Approved' },
      in_progress: { variant: 'secondary' as const, label: 'In Progress' },
      waiting_on_client: { variant: 'warning' as const, label: 'Waiting on Client' },
      delivered: { variant: 'success' as const, label: 'Delivered' },
      live: { variant: 'success' as const, label: 'Live' },
      paused: { variant: 'warning' as const, label: 'Paused' },
      failed: { variant: 'danger' as const, label: 'Failed' },
      completed: { variant: 'success' as const, label: 'Completed' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { variant: 'default' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getLastUpdate = (campaign: any) => {
    // This would ideally come from the last comment or activity
    return `Updated ${formatDate(campaign.updatedAt)}`;
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Campaign actions dropdown component
  const CampaignActionsDropdown: React.FC<{ campaign: any }> = ({ campaign }) => {
    const [isOpen, setIsOpen] = useState(false);
    const isSelected = selectedCampaignIds.has(campaign.id);

    return (
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          icon={<MoreVertical size={16} />}
        />
        
        {isOpen && (
          <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
            <div className="py-1">
              <button
                
                onClick={() => {
                  handleViewCampaign(campaign.id);
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
              >
                <Eye size={14} className="mr-2" />
                View Details
              </button>
              
              {!campaign.archived ? (
                <button
                  onClick={() => {
                    handleArchiveCampaign(campaign.id);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                >
                  <Archive size={14} className="mr-2" />
                  Archive
                </button>
              ) : (
                <button
                  onClick={() => {
                    handleUnarchiveCampaign(campaign.id);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                >
                  <RotateCcw size={14} className="mr-2" />
                  Unarchive
                </button>
              )}
              
              <button
                onClick={() => {
                  handleDeleteCampaign(campaign.id, campaign.name);
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
              >
                <Trash2 size={14} className="mr-2" />
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderRequestsTab = () => (
    <div className="space-y-6">
      {/* Requests Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock size={20} className="text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Pending Requests</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingRequests}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Rejected Requests</p>
                <p className="text-2xl font-bold text-gray-900">{stats.rejectedRequests}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText size={20} className="text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total Requests</p>
                <p className="text-2xl font-bold text-gray-900">{currentRequests.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {currentRequests.length > 0 ? (
          currentRequests.map(request => (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Campaign Request
                      </h3>
                      <Badge variant={
                        request.status === 'pending' ? 'warning' :
                        request.status === 'approved' ? 'success' :
                        request.status === 'rejected' ? 'danger' : 'default'
                      }>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center text-gray-600">
                        <Users size={14} className="mr-1" />
                        <span>{request.audiences.length} audiences</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <DollarSign size={14} className="mr-1" />
                        <span>${request.budget.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Calendar size={14} className="mr-1" />
                        <span>{formatDate(request.startDate)} - {formatDate(request.endDate)}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Clock size={14} className="mr-1" />
                        <span>Submitted {formatDate(request.createdAt)}</span>
                      </div>
                    </div>

                    {request.notes && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-md">
                        <p className="text-sm text-gray-700">{request.notes}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {request.campaignId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewCampaign(request.campaignId)}
                        icon={<Eye size={16} />}
                      >
                        View Campaign
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Inbox size={64} className="mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No requests yet</h3>
              <p className="text-gray-600 mb-6">
                Submit campaign requests to see them here
              </p>
              <Button
                variant="primary"
                onClick={handleStartWithAudiences}
                icon={<Plus size={18} />}
              >
                Create First Campaign
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
  
  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <BarChart3 size={28} className="mr-3 text-blue-600" />
                {activeTab === 'campaigns' ? 'Campaigns' : 'Requests'}
                {showArchived && activeTab === 'campaigns' && (
                  <Badge variant="outline" className="ml-3">
                    <Archive size={14} className="mr-1" />
                    Archived
                  </Badge>
                )}
              </h1>
              <p className="text-gray-600">
                {activeTab === 'campaigns' 
                  ? (isSuperAdmin ? 'Manage all client campaigns and track performance' : 'Manage your audience campaigns and track progress')
                  : 'Track your campaign requests and their approval status'
                }
              </p>
            </div>
            
            <div className="flex gap-4">
              {/* Tab Toggle for non-admin users */}
              {!isSuperAdmin && (
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setActiveTab('campaigns')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'campaigns'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Campaigns
                  </button>
                  <button
                    onClick={() => setActiveTab('requests')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'requests'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Requests
                    {stats.pendingRequests > 0 && (
                      <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                        {stats.pendingRequests}
                      </span>
                    )}
                  </button>
                </div>
              )}

              {activeTab === 'campaigns' && (
                <>
                  {/* Archive Toggle */}
                  <Button
                    variant={showArchived ? "primary" : "outline"}
                    onClick={() => {
                      setShowArchived(!showArchived);
                      setSelectedCampaignIds(new Set());
                      setCurrentPage(1);
                    }}
                    icon={showArchived ? <RotateCcw size={18} /> : <Archive size={18} />}
                  >
                    {showArchived ? `Show Active (${stats.archivedCampaigns} Archived)` : `Show Archived (${stats.archivedCampaigns})`}
                  </Button>

                  {!isSuperAdmin && (
                    <>
                      <Button 
                        variant="outline"
                        onClick={handleStartWithAudiences}
                        icon={<Users size={18} />}
                      >
                        Start with Audiences
                      </Button>
                      <Button 
                        variant="primary" 
                        onClick={() => setShowNewCampaignForm(true)}
                        icon={<Plus size={18} />}
                      >
                        New Campaign
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Topline Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Activity size={20} className="text-green-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Active Campaigns</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.activeCampaigns}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <PlayCircle size={20} className="text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">
                      {activeTab === 'campaigns' ? 'Upcoming Campaigns' : 'Pending Requests'}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {activeTab === 'campaigns' ? stats.upcomingCampaigns : stats.pendingRequests}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Target size={20} className="text-purple-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Total Audiences</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalAudiences}</p>
                    <p className="text-xs text-gray-500">Active & Upcoming</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <DollarSign size={20} className="text-emerald-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Total Budget</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${stats.totalBudget.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">Active & Upcoming</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Render content based on active tab */}
        {activeTab === 'requests' ? renderRequestsTab() : (
          <>
            {/* Filters */}
            {isSuperAdmin ? (
              <CampaignFilters
                filters={filters}
                onFiltersChange={setFilters}
              />
            ) : (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Filter size={20} className="mr-2" />
                    Filter Your Campaigns
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    {/* Search */}
                    <div className="relative">
                      <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <Input
                        placeholder="Search campaigns..."
                        value={clientFilters.search}
                        onChange={(e) => setClientFilters(prev => ({ ...prev, search: e.target.value }))}
                        className="pl-10"
                      />
                    </div>

                    {/* Advertiser Filter */}
                    <Input
                      placeholder="Filter by advertiser..."
                      value={clientFilters.advertiser}
                      onChange={(e) => setClientFilters(prev => ({ ...prev, advertiser: e.target.value }))}
                    />

                    {/* Status Filter */}
                    <select
                      value={clientFilters.status}
                      onChange={(e) => setClientFilters(prev => ({ ...prev, status: e.target.value }))}
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Campaigns</option>
                      <option value="upcoming">Upcoming</option>
                      <option value="active">Active</option>
                      <option value="past">Past</option>
                    </select>

                    {/* Items per page */}
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value={10}>10 per page</option>
                      <option value={25}>25 per page</option>
                      <option value={50}>50 per page</option>
                    </select>
                  </div>

                  {/* Results summary and bulk actions */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, displayCampaigns.length)} of {displayCampaigns.length} campaigns
                    </div>
                    
                    {/* Bulk Actions */}
                    {paginatedCampaigns.length > 0 && (
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={selectedCampaignIds.size === paginatedCampaigns.length && paginatedCampaigns.length > 0}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-600">
                            Select All ({selectedCampaignIds.size} selected)
                          </span>
                        </div>
                        
                        {selectedCampaignIds.size > 0 && (
                          <div className="flex space-x-2">
                            {showArchived ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleBulkUnarchive}
                                icon={<RotateCcw size={16} />}
                              >
                                Unarchive ({selectedCampaignIds.size})
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleBulkArchive}
                                icon={<Archive size={16} />}
                              >
                                Archive ({selectedCampaignIds.size})
                              </Button>
                            )}
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={handleBulkDelete}
                              icon={<Trash2 size={16} />}
                            >
                              Delete ({selectedCampaignIds.size})
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {showNewCampaignForm && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>Create New Campaign</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateCampaign} className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <Input
                        placeholder="Campaign Name"
                        value={newCampaignName}
                        onChange={(e) => setNewCampaignName(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setShowNewCampaignForm(false)}>
                        Cancel
                      </Button>
                      <Button variant="primary" type="submit">
                        Create
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#509fe0]"></div>
              </div>
            ) : paginatedCampaigns.length > 0 ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  {paginatedCampaigns.map(campaign => {
                    const isSelected = selectedCampaignIds.has(campaign.id);
                    
                    return (
                      <Card key={campaign.id} className={`hover:shadow-md transition-shadow ${
                        campaign.archived ? 'border-gray-300 bg-gray-50' : ''
                      } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
                        <CardContent className="p-0">
                          <div className="p-6">
                            <div className="flex justify-between items-start">
                              <div className="flex items-start space-x-3 flex-1">
                                {/* Selection Checkbox */}
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => handleSelectCampaign(campaign.id, e.target.checked)}
                                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3 mb-2">
                                    <h3 className="text-lg font-semibold text-gray-900">{campaign.name}</h3>
                                    {getStatusBadge(campaign.status)}
                                    <Badge variant="outline" className="text-xs">
                                      {getStatusCategory(campaign.status)}
                                    </Badge>
                                    {campaign.archived && (
                                      <Badge variant="outline" className="text-xs">
                                        <Archive size={12} className="mr-1" />
                                        Archived
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center mt-1">
                                    <Clock size={16} className="text-gray-400 mr-1" />
                                    <span className="text-sm text-gray-500">
                                      Created on {formatDate(campaign.createdAt)}
                                    </span>
                                    {isSuperAdmin && campaign.users && (
                                      <>
                                        <span className="mx-2 text-gray-300">•</span>
                                        <Building size={14} className="text-gray-400 mr-1" />
                                        <span className="text-sm text-gray-500">
                                          {campaign.users.name} ({campaign.users.companies?.name})
                                        </span>
                                      </>
                                    )}
                                  </div>

                                  {/* Enhanced Status Preview with Last Update */}
                                  <div className={`mt-3 p-3 rounded-md ${
                                    campaign.archived ? 'bg-gray-100 border border-gray-200' : 'bg-gray-50'
                                  }`}>
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-3">
                                        <div className="flex items-center space-x-2">
                                          <CheckCircle2 size={16} className="text-green-500" />
                                          <span className="text-sm font-medium text-gray-700">
                                            {campaign.archived ? `Archived on ${formatDate(campaign.updatedAt)}` : getLastUpdate(campaign)}
                                          </span>
                                        </div>
                                        {/* NEW: Display selected platform account */}
                                        {campaign.selectedCompanyAccount && (
                                          <div className="flex items-center space-x-2">
                                            <Hash size={14} className="text-blue-500" />
                                            <span className="text-sm text-blue-700 font-medium">
                                              {campaign.selectedCompanyAccount.platform} - {campaign.selectedCompanyAccount.accountName}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                      <div className="text-right">
                                        <p className="text-xs text-gray-500">Performance</p>
                                        <div className="flex items-center space-x-1">
                                          <TrendingUp size={14} className="text-green-500" />
                                          <p className="text-sm font-medium text-green-600">On Track</p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewCampaign(campaign.id)}
                                  icon={<Eye size={16} />}
                                >
                                  View Details
                                </Button>
                                {campaign.status === 'draft' && !isSuperAdmin && (
                                  <Link to="/audiences">
                                    <Button variant="primary" size="sm">Continue</Button>
                                  </Link>
                                )}
                                <CampaignActionsDropdown campaign={campaign} />
                              </div>
                            </div>
                            
                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-4">
                              <div>
                                <p className="text-xs text-gray-500">Selected Audiences</p>
                                <div className="flex items-center">
                                  <Users size={14} className="text-gray-400 mr-1" />
                                  <p className="font-medium">{campaign.audiences.length}</p>
                                </div>
                              </div>
                              {campaign.startDate && campaign.endDate && (
                                <div>
                                  <p className="text-xs text-gray-500">Timeline</p>
                                  <p className="font-medium flex items-center">
                                    <Calendar size={14} className="mr-1 text-gray-400" />
                                    {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}
                                  </p>
                                </div>
                              )}
                              {campaign.budget > 0 && (
                                <div>
                                  <p className="text-xs text-gray-500">Budget</p>
                                  <p className="font-medium flex items-center">
                                    <DollarSign size={14} className="mr-1 text-gray-400" />
                                    ${campaign.budget.toLocaleString()}
                                  </p>
                                </div>
                              )}
                              <div>
                                <p className="text-xs text-gray-500">Est. Reach</p>
                                <p className="font-medium">
                                  {campaign.audiences.reduce((sum, aud) => sum + (aud.reach || 0), 0).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            
                            {campaign.platforms.social.length > 0 || campaign.platforms.programmatic.length > 0 ? (
                              <div className="mt-4">
                                <p className="text-xs text-gray-500 mb-1">Platforms</p>
                                <div className="flex flex-wrap gap-1">
                                  {campaign.platforms.social.map(platform => (
                                    <Badge key={platform} variant="default" className="text-xs">{platform}</Badge>
                                  ))}
                                  {campaign.platforms.programmatic.map(platform => (
                                    <Badge key={platform} variant="secondary" className="text-xs">{platform}</Badge>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-8">
                    <div className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                {showArchived ? (
                  <Archive size={64} className="mx-auto mb-4 text-gray-300" />
                ) : (
                  <BarChart3 size={64} className="mx-auto mb-4 text-gray-300" />
                )}
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {showArchived ? 'No archived campaigns' : 
                   (isSuperAdmin ? (filters.search || filters.status || filters.dateRange.start || filters.dateRange.end) : 
                    (clientFilters.search || clientFilters.advertiser || clientFilters.status))
                    ? 'No campaigns match your filters'
                    : 'No campaigns yet'
                  }
                </h3>
                <p className="text-gray-600 mb-6">
                  {showArchived ? 'No campaigns have been archived yet.' :
                   (isSuperAdmin ? (filters.search || filters.status || filters.dateRange.start || filters.dateRange.end) : 
                    (clientFilters.search || clientFilters.advertiser || clientFilters.status))
                    ? 'Try adjusting your search criteria or filters'
                    : isSuperAdmin 
                      ? "You'll see client campaigns here when they're created"
                      : "Create your first campaign to start selecting audiences"
                  }
                </p>
                
                {!isSuperAdmin && !showArchived && !(clientFilters.search || clientFilters.advertiser || clientFilters.status) && !showNewCampaignForm && (
                  <div className="flex justify-center gap-4">
                    <Button 
                      variant="outline"
                      onClick={handleStartWithAudiences}
                      icon={<Users size={18} />}
                    >
                      Start with Audiences
                    </Button>
                    <Button 
                      variant="primary" 
                      onClick={() => setShowNewCampaignForm(true)}
                      icon={<Plus size={18} />}
                    >
                      Create Campaign
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default CampaignsPage;