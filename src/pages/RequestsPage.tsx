import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import { useCampaign } from '../context/CampaignContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { supabase } from '../lib/supabase';
import { 
  Calendar, 
  Clock, 
  Users, 
  CheckCircle, 
  XCircle, 
  ChevronRight, 
  Search,
  Filter,
  Building,
  User,
  Mail,
  Eye,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';
import { AudienceRequest } from '../types';

interface RequestFilters {
  search: string;
  agency: string;
  advertiser: string;
  status: string;
}

// Error Boundary Component
class RequestsErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('RequestsPage Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Layout>
          <div className="text-center py-12 bg-red-50 rounded-lg border border-red-200">
            <AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold text-red-900 mb-2">Something went wrong</h2>
            <p className="text-red-700 mb-4">
              There was an error loading the requests page. Please try refreshing the page.
            </p>
            <Button 
              variant="primary" 
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
          </div>
        </Layout>
      );
    }

    return this.props.children;
  }
}

const RequestsPageContent: React.FC = () => {
  const { requests = [], campaigns = [], updateCampaignStatus } = useCampaign();
  const { isAdmin, user } = useAuth();
  const { refreshNotifications } = useNotifications();
  const navigate = useNavigate();
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filters, setFilters] = useState<RequestFilters>({
    search: '',
    agency: '',
    advertiser: '',
    status: ''
  });
  const [requestUsers, setRequestUsers] = useState<Record<string, any>>({});
  const [companies, setCompanies] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Redirect if user is not admin
  if (!isAdmin) {
    return <Navigate to="/campaigns" replace />;
  }

  // Fetch user and company data for requests
  useEffect(() => {
    const fetchRequestData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Ensure requests is an array
        if (!Array.isArray(requests)) {
          console.warn('Requests is not an array:', requests);
          setLoading(false);
          return;
        }

        // Get unique client IDs from requests
        const clientIds = [...new Set(requests.map(r => r?.clientId).filter(Boolean))];
        
        if (clientIds.length > 0) {
          // Fetch user data
          const { data: users, error: usersError } = await supabase
            .from('users')
            .select(`
              id,
              name,
              email,
              company_id,
              companies!users_company_id_fkey (
                id,
                name
              )
            `)
            .in('id', clientIds);

          if (usersError) {
            console.error('Error fetching users:', usersError);
            throw usersError;
          }

          // Create lookup objects with null checks
          const userLookup: Record<string, any> = {};
          const companyLookup: Record<string, string> = {};

          if (Array.isArray(users)) {
            users.forEach(user => {
              if (user?.id) {
                userLookup[user.id] = user;
                if (user.companies?.name && user.company_id) {
                  companyLookup[user.company_id] = user.companies.name;
                }
              }
            });
          }

          setRequestUsers(userLookup);
          setCompanies(companyLookup);
        }
      } catch (error) {
        console.error('Error fetching request data:', error);
        setError('Failed to load request data. Please try refreshing the page.');
      } finally {
        setLoading(false);
      }
    };

    fetchRequestData();
  }, [requests]);

  const handleApprove = async (requestId: string) => {
    if (!requestId) return;
    
    setIsUpdating(requestId);
    try {
      const { error } = await supabase
        .from('audience_requests')
        .update({ 
          status: 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      // Find the request and create notification
      const request = requests.find(r => r?.id === requestId);
      if (request?.clientId) {
        const campaign = campaigns.find(c => c?.id === request.campaignId);
        
        // Create notification for client
        await supabase
          .from('notifications')
          .insert({
            user_id: request.clientId,
            title: 'Campaign Request Approved',
            message: `Your campaign request "${campaign?.name || 'Unknown Campaign'}" has been approved and is now in progress.`,
            read: false,
            campaign_id: request.campaignId || null
          });

        // Update campaign status to in_progress
        if (campaign?.id && updateCampaignStatus) {
          await updateCampaignStatus(campaign.id, 'in_progress', 'Request approved by admin');
        }
      }

      if (refreshNotifications) {
        await refreshNotifications();
      }
      window.location.reload(); // Refresh to show updated data
    } catch (error) {
      console.error('Error approving request:', error);
      setError('Failed to approve request. Please try again.');
    } finally {
      setIsUpdating(null);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!requestId) return;
    
    const reason = prompt('Please provide a reason for rejection (optional):');
    
    setIsUpdating(requestId);
    try {
      const { error } = await supabase
        .from('audience_requests')
        .update({ 
          status: 'rejected',
          notes: reason || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      // Find the request and create notification
      const request = requests.find(r => r?.id === requestId);
      if (request?.clientId) {
        const campaign = campaigns.find(c => c?.id === request.campaignId);
        
        // Create notification for client
        await supabase
          .from('notifications')
          .insert({
            user_id: request.clientId,
            title: 'Campaign Request Rejected',
            message: `Your campaign request "${campaign?.name || 'Unknown Campaign'}" has been rejected.${reason ? ` Reason: ${reason}` : ''}`,
            read: false,
            campaign_id: request.campaignId || null
          });

        // Update campaign status to failed
        if (campaign?.id && updateCampaignStatus) {
          await updateCampaignStatus(campaign.id, 'failed', reason || 'Request rejected by admin');
        }
      }

      if (refreshNotifications) {
        await refreshNotifications();
      }
      window.location.reload(); // Refresh to show updated data
    } catch (error) {
      console.error('Error rejecting request:', error);
      setError('Failed to reject request. Please try again.');
    } finally {
      setIsUpdating(null);
    }
  };

  const handleViewCampaign = (campaignId: string) => {
    if (campaignId) {
      navigate(`/campaigns/${campaignId}`);
    }
  };

  const handleViewDetails = (requestId: string) => {
    setSelectedRequest(requestId === selectedRequest ? null : requestId);
  };

  // Filter and search logic with null checks
  const filteredRequests = (requests || []).filter(request => {
    if (!request) return false;
    
    const user = requestUsers[request.clientId] || {};
    const companyName = user?.companies?.name || '';
    const campaignName = getCampaignName(request.campaignId) || '';
    
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const searchableText = `${campaignName} ${user?.name || ''} ${companyName}`.toLowerCase();
      if (!searchableText.includes(searchLower)) {
        return false;
      }
    }

    // Agency filter
    if (filters.agency && !companyName.toLowerCase().includes(filters.agency.toLowerCase())) {
      return false;
    }

    // Status filter
    if (filters.status && request.status !== filters.status) {
      return false;
    }

    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRequests = filteredRequests.slice(startIndex, startIndex + itemsPerPage);

  // Sort requests by creation date (newest first)
  const sortedRequests = [...paginatedRequests].sort(
    (a, b) => {
      const dateA = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    }
  );

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { variant: 'warning' as const, label: 'Pending Review' },
      reviewed: { variant: 'primary' as const, label: 'Under Review' },
      approved: { variant: 'success' as const, label: 'Approved' },
      rejected: { variant: 'danger' as const, label: 'Rejected' }
    };

    const config = statusMap[status as keyof typeof statusMap] || { variant: 'default' as const, label: status || 'Unknown' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };
  
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown Date';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };
  
  const getCampaignName = (campaignId: string) => {
    if (!campaignId) return 'Unknown Campaign';
    const campaign = campaigns.find(c => c?.id === campaignId);
    return campaign?.name || 'Unknown Campaign';
  };

  const getUniqueAgencies = () => {
    const agencies = new Set<string>();
    Object.values(requestUsers).forEach(user => {
      if (user?.companies?.name) {
        agencies.add(user.companies.name);
      }
    });
    return Array.from(agencies).sort();
  };

  const renderRequestDetails = (request: AudienceRequest) => {
    if (!request || request.id !== selectedRequest) return null;

    const user = requestUsers[request.clientId] || {};

    return (
      <div className="mt-6 border-t border-gray-200 pt-6 space-y-6">
        {/* Submitter Information */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="text-lg font-medium mb-3 flex items-center">
            <User size={20} className="mr-2 text-blue-600" />
            Request Submitted By
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Full Name</p>
              <p className="font-medium">{user?.name || 'Unknown User'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium flex items-center">
                <Mail size={14} className="mr-1 text-gray-400" />
                {user?.email || 'Unknown Email'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Company</p>
              <p className="font-medium flex items-center">
                <Building size={14} className="mr-1 text-gray-400" />
                {user?.companies?.name || 'Unknown Company'}
              </p>
            </div>
          </div>
        </div>

        {/* Selected Audiences */}
        <div>
          <h4 className="text-lg font-medium mb-4 flex items-center">
            <Users size={20} className="mr-2 text-blue-600" />
            Selected Audiences ({request.audiences?.length || 0})
          </h4>
          <div className="space-y-3">
            {(request.audiences || []).map((audience, index) => (
              <div key={audience?.id || index} className="bg-gray-50 rounded-md p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h5 className="font-medium">{audience?.name || 'Unknown Audience'}</h5>
                    <p className="text-sm text-gray-600 mt-1">{audience?.description || 'No description'}</p>
                    {audience?.dataSupplier && (
                      <p className="text-xs text-gray-500 mt-1">{audience.dataSupplier}</p>
                    )}
                  </div>
                  <div className="text-right text-sm ml-4">
                    <p className="text-gray-500">Est. Reach</p>
                    <p className="font-medium">{audience?.reach?.toLocaleString() || 'N/A'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Campaign Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={() => handleViewCampaign(request.campaignId)}
            icon={<Eye size={16} />}
          >
            View Full Campaign
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/campaigns/${request.campaignId}`)}
            icon={<MessageSquare size={16} />}
          >
            Add Comments
          </Button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#509fe0]"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="text-center py-12 bg-red-50 rounded-lg border border-red-200">
          <AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold text-red-900 mb-2">Error Loading Requests</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <Button 
            variant="primary" 
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </Button>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Campaign Requests</h1>
          <p className="text-gray-600">Manage client audience segment requests and campaign approvals</p>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter size={20} className="mr-2" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              {/* Search */}
              <div className="relative">
                <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search campaigns, users, companies..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>

              {/* Agency Filter */}
              <select
                value={filters.agency}
                onChange={(e) => setFilters(prev => ({ ...prev, agency: e.target.value }))}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Agencies</option>
                {getUniqueAgencies().map(agency => (
                  <option key={agency} value={agency}>{agency}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="reviewed">Under Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
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

            {/* Results summary */}
            <div className="text-sm text-gray-600">
              Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredRequests.length)} of {filteredRequests.length} requests
            </div>
          </CardContent>
        </Card>
        
        {sortedRequests.length > 0 ? (
          <div className="space-y-6">
            {sortedRequests.map(request => {
              if (!request) return null;
              
              const user = requestUsers[request.clientId] || {};
              const campaign = campaigns.find(c => c?.id === request.campaignId);
              
              return (
                <Card key={request.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="p-6">
                      <div className="flex justify-between items-start flex-wrap gap-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {getCampaignName(request.campaignId)}
                          </h3>
                          <div className="flex items-center mt-2 space-x-4">
                            <div className="flex items-center text-sm text-gray-600">
                              <User size={14} className="mr-1" />
                              <span className="font-medium">{user?.name || 'Unknown User'}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <Building size={14} className="mr-1" />
                              <span>{user?.companies?.name || 'Unknown Company'}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-500">
                              <Clock size={14} className="mr-1" />
                              <span>{formatDate(request.createdAt)}</span>
                            </div>
                          </div>
                          
                          {/* Campaign Status Preview */}
                          <div className="mt-3 p-3 bg-gray-50 rounded-md">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-700">Current Status</p>
                                <div className="flex items-center mt-1">
                                  {getStatusBadge(request.status)}
                                  {campaign && (
                                    <span className="ml-2 text-sm text-gray-500">
                                      Campaign: {campaign.status?.replace('_', ' ') || 'Unknown'}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-500">Last Updated</p>
                                <p className="text-sm font-medium">
                                  {formatDate(campaign?.updatedAt || request.createdAt)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          {request.status === 'pending' && (
                            <div className="flex space-x-2">
                              <Button 
                                variant="outline"
                                size="sm"
                                icon={<XCircle size={16} />}
                                onClick={() => handleReject(request.id)}
                                disabled={isUpdating === request.id}
                              >
                                Reject
                              </Button>
                              <Button 
                                variant="success"
                                size="sm"
                                icon={<CheckCircle size={16} />}
                                onClick={() => handleApprove(request.id)}
                                isLoading={isUpdating === request.id}
                              >
                                Approve
                              </Button>
                            </div>
                          )}
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewCampaign(request.campaignId)}
                            icon={<Eye size={16} />}
                          >
                            View Campaign
                          </Button>
                        </div>
                      </div>
                      
                      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-gray-500">Selected Audiences</p>
                          <div className="flex items-center">
                            <Users size={16} className="text-gray-400 mr-1" />
                            <p className="font-medium">{request.audiences?.length || 0} segments</p>
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-xs text-gray-500">Campaign Timeline</p>
                          <div className="flex items-center">
                            <Calendar size={16} className="text-gray-400 mr-1" />
                            <p className="font-medium">
                              {formatDate(request.startDate)} - {formatDate(request.endDate)}
                            </p>
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-xs text-gray-500">Budget</p>
                          <p className="font-medium">${(request.budget || 0).toLocaleString()}</p>
                        </div>
                      </div>
                      
                      {(request.platforms?.social?.length > 0 || request.platforms?.programmatic?.length > 0) && (
                        <div className="mt-4">
                          <p className="text-xs text-gray-500 mb-1">Platforms</p>
                          <div className="flex flex-wrap gap-1">
                            {(request.platforms.social || []).map(platform => (
                              <Badge key={platform} variant="default" className="text-xs">{platform}</Badge>
                            ))}
                            {(request.platforms.programmatic || []).map(platform => (
                              <Badge key={platform} variant="secondary" className="text-xs">{platform}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {request.notes && (
                        <div className="mt-4 p-3 bg-yellow-50 rounded-md border border-yellow-200">
                          <p className="text-xs text-yellow-700 mb-1 font-medium">Client Notes</p>
                          <p className="text-sm text-yellow-800">{request.notes}</p>
                        </div>
                      )}

                      {renderRequestDetails(request)}
                    </div>
                    
                    <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-end">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewDetails(request.id)}
                        icon={selectedRequest === request.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      >
                        {selectedRequest === request.id ? 'Hide Details' : 'View Details'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

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
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {Object.keys(filters).some(key => filters[key as keyof RequestFilters])
                ? 'No requests match your filters'
                : 'No requests yet'
              }
            </h3>
            <p className="text-gray-600">
              {Object.keys(filters).some(key => filters[key as keyof RequestFilters])
                ? 'Try adjusting your search criteria or filters'
                : "You'll see client campaign requests here when they're submitted"
              }
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

const RequestsPage: React.FC = () => {
  return (
    <RequestsErrorBoundary>
      <RequestsPageContent />
    </RequestsErrorBoundary>
  );
};

export default RequestsPage;