import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import CampaignStatusTracker from '../components/campaigns/CampaignStatusTracker';
import CampaignComments from '../components/campaigns/CampaignComments';
import CampaignWorkflowHistory from '../components/campaigns/CampaignWorkflowHistory';
import CampaignActivityTimeline from '../components/campaigns/CampaignActivityTimeline';
import AdminStatusUpdater from '../components/campaigns/AdminStatusUpdater';
import { useCampaign } from '../context/CampaignContext';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Calendar, DollarSign, Monitor, Users, Activity, MessageCircle } from 'lucide-react';

const CampaignDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    getCampaignById, 
    comments, 
    workflowHistory,
    activityLog,
    fetchCampaignComments, 
    fetchWorkflowHistory,
    fetchActivityLog,
    addComment,
    updateCampaignStatus
  } = useCampaign();
  const { isAdmin, isSuperAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'comments' | 'workflow' | 'activity'>('overview');

  const campaign = id ? getCampaignById(id) : null;

  useEffect(() => {
    if (!id) {
      navigate('/campaigns');
      return;
    }

    if (!dataLoaded) {
      const loadCampaignData = async () => {
        setLoading(true);
        try {
          await Promise.all([
            fetchCampaignComments(id),
            fetchWorkflowHistory(id),
            fetchActivityLog(id)
          ]);
          setDataLoaded(true);
        } catch (error) {
          console.error('Error loading campaign data:', error);
        } finally {
          setLoading(false);
        }
      };

      loadCampaignData();
    } else {
      setLoading(false);
    }
  }, [id, dataLoaded, fetchCampaignComments, fetchWorkflowHistory, fetchActivityLog, navigate, campaign]);

  if (!campaign) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Campaign not found</h2>
          <p className="text-gray-600 mb-4">The campaign you're looking for doesn't exist or you don't have access to it.</p>
          <Button variant="primary" onClick={() => navigate('/campaigns')}>
            Back to Campaigns
          </Button>
        </div>
      </Layout>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { variant: 'default' as const, label: 'Draft' },
      submitted: { variant: 'primary' as const, label: 'Submitted' },
      pending_review: { variant: 'warning' as const, label: 'Pending Review' },
      in_progress: { variant: 'secondary' as const, label: 'In Progress' },
      waiting_on_client: { variant: 'warning' as const, label: 'Waiting on Client' },
      delivered: { variant: 'success' as const, label: 'Delivered' },
      failed: { variant: 'danger' as const, label: 'Failed' },
      completed: { variant: 'success' as const, label: 'Completed' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { variant: 'default' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleAddComment = async (content: string, parentCommentId?: string) => {
    if (!campaign) return;
    await addComment(campaign.id, content, parentCommentId);
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

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => navigate('/campaigns')}
              icon={<ArrowLeft size={18} />}
            >
              Back to Campaigns
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
              <div className="flex items-center space-x-2 mt-1">
                {getStatusBadge(campaign.status)}
                <span className="text-sm text-gray-500">
                  Created {formatDate(campaign.createdAt)}
                </span>
                {campaign.users && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="text-sm text-gray-500">
                      {campaign.users.name} ({campaign.users.companies?.name})
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'overview'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('comments')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'comments'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <MessageCircle size={16} className="inline mr-1" />
                  Comments ({comments.length})
                </button>
                <button
                  onClick={() => setActiveTab('workflow')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'workflow'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Workflow History
                </button>
                <button
                  onClick={() => setActiveTab('activity')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'activity'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Activity Timeline
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                <CampaignStatusTracker campaign={campaign} />

                {/* Campaign Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Calendar size={20} className="mr-2 text-blue-600" />
                        Campaign Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-gray-500">Campaign Name</p>
                          <p className="font-medium">{campaign.name}</p>
                        </div>
                        
                        {campaign.startDate && campaign.endDate && (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-500">Start Date</p>
                              <p className="font-medium">{formatDate(campaign.startDate)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">End Date</p>
                              <p className="font-medium">{formatDate(campaign.endDate)}</p>
                            </div>
                          </div>
                        )}
                        
                        {campaign.budget > 0 && (
                          <div>
                            <p className="text-sm text-gray-500">Budget</p>
                            <p className="font-medium">${campaign.budget.toLocaleString()}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Monitor size={20} className="mr-2 text-blue-600" />
                        Platforms
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {campaign.platforms.social.length > 0 && (
                          <div>
                            <p className="text-sm text-gray-500 mb-2">Social Platforms</p>
                            <div className="flex flex-wrap gap-2">
                              {campaign.platforms.social.map(platform => (
                                <Badge key={platform} variant="primary">{platform}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {campaign.platforms.programmatic.length > 0 && (
                          <div>
                            <p className="text-sm text-gray-500 mb-2">Programmatic Platforms</p>
                            <div className="flex flex-wrap gap-2">
                              {campaign.platforms.programmatic.map(platform => (
                                <Badge key={platform} variant="secondary">{platform}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Selected Audiences */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Users size={20} className="mr-2 text-blue-600" />
                      Selected Audiences ({campaign.audiences.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {campaign.audiences.length > 0 ? (
                      <div className="space-y-3">
                        {campaign.audiences.map(audience => (
                          <div key={audience.id} className="p-4 bg-gray-50 rounded-lg">
                            <div>
                              <h4 className="font-medium text-gray-900">{audience.name}</h4>
                              <p className="text-sm text-gray-600">{audience.description}</p>
                              {audience.dataSupplier && (
                                <p className="text-xs text-gray-500">{audience.dataSupplier}</p>
                              )}
                              <p className="text-xs text-gray-500">Est. Reach: {audience.reach?.toLocaleString() || 'N/A'}</p>
                            </div>
                          </div>
                        ))}
                        <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
                          <p className="text-sm text-blue-700">
                            <strong>Note:</strong> Audiences cannot be modified after campaign submission. 
                            Contact support if changes are needed.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500 italic">No audiences selected</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'comments' && (
              <CampaignComments
                comments={comments}
                onAddComment={handleAddComment}
              />
            )}

            {activeTab === 'workflow' && (
              <CampaignWorkflowHistory history={workflowHistory} />
            )}

            {activeTab === 'activity' && (
              <CampaignActivityTimeline activities={activityLog} />
            )}
          </div>

          <div className="space-y-8">
            {/* Only Boost staff (super admins) can update campaign status */}
            {isSuperAdmin && (
              <AdminStatusUpdater
                campaign={campaign}
                onStatusUpdate={updateCampaignStatus}
              />
            )}

            {/* Campaign Summary Card for all users */}
            <Card>
              <CardHeader>
                <CardTitle>Campaign Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status:</span>
                    <span>{getStatusBadge(campaign.status)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Audiences:</span>
                    <span className="font-medium">{campaign.audiences.length}</span>
                  </div>
                  {campaign.budget > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Budget:</span>
                      <span className="font-medium">${campaign.budget.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Created:</span>
                    <span className="font-medium">{formatDate(campaign.createdAt)}</span>
                  </div>
                  {campaign.updatedAt !== campaign.createdAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Last Updated:</span>
                      <span className="font-medium">{formatDate(campaign.updatedAt)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CampaignDetailPage;
