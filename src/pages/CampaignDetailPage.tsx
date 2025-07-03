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
import { ArrowLeft, Calendar, DollarSign, Monitor, Users, Activity, X } from 'lucide-react';

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
    updateCampaignStatus,
    removeAudienceFromCampaign
  } = useCampaign();
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'comments' | 'workflow' | 'activity'>('comments');

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
  }, [id, dataLoaded, fetchCampaignComments, fetchWorkflowHistory, fetchActivityLog, navigate]);

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
            <CampaignStatusTracker campaign={campaign} />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar size={20} className="mr-2 text-blue-600" />
                  Campaign Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-500">Timeline</p>
                    <p className="font-medium flex items-center">
                      <Calendar size={14} className="mr-1 text-gray-400" />
                      {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Budget</p>
                    <p className="font-medium flex items-center">
                      <DollarSign size={14} className="mr-1 text-gray-400" />
                      ${campaign.budget.toLocaleString()}
                    </p>
                  </div>
                </div>
                {(campaign.platforms.social.length > 0 || campaign.platforms.programmatic.length > 0) && (
                  <div className="mt-6">
                    <p className="text-sm text-gray-500 mb-2 flex items-center">
                      <Monitor size={14} className="mr-1" />
                      Platforms
                    </p>
                    <div className="space-y-2">
                      {campaign.platforms.social.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Social Platforms</p>
                          <div className="flex flex-wrap gap-1">
                            {campaign.platforms.social.map(platform => (
                              <Badge key={platform} variant="default" className="text-xs">{platform}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {campaign.platforms.programmatic.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Programmatic Platforms</p>
                          <div className="flex flex-wrap gap-1">
                            {campaign.platforms.programmatic.map(platform => (
                              <Badge key={platform} variant="secondary" className="text-xs">{platform}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

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
                      <div key={audience.id} className="p-4 bg-gray-50 rounded-lg flex justify-between items-center">
                        <div>
                          <h4 className="font-medium text-gray-900">{audience.name}</h4>
                          <p className="text-sm text-gray-600">{audience.description}</p>
                          {audience.dataSupplier && (
                            <p className="text-xs text-gray-500">{audience.dataSupplier}</p>
                          )}
                          <p className="text-xs text-gray-500">Est. Reach: {audience.reach?.toLocaleString() || 'N/A'}</p>
                        </div>
                        <Button 
                          variant="outline"
                          size="sm"
                          icon={<X size={14} />}
                          onClick={() => removeAudienceFromCampaign(audience)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No audiences selected</p>
                )}
              </CardContent>
            </Card>

            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                  <button
                    onClick={() => setActiveTab('comments')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'comments'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Comments ({comments.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('activity')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'activity'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Activity size={16} className="inline mr-1" />
                    Activity ({activityLog.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('workflow')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'workflow'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Workflow History ({workflowHistory.length})
                  </button>
                </nav>
              </div>

              <div className="p-6">
                {activeTab === 'comments' && (
                  <CampaignComments
                    comments={comments}
                    onAddComment={(content, parentCommentId) => addComment(campaign.id, content, parentCommentId)}
                  />
                )}
                {activeTab === 'activity' && (
                  <CampaignActivityTimeline activities={activityLog} />
                )}
                {activeTab === 'workflow' && (
                  <CampaignWorkflowHistory history={workflowHistory} />
                )}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {isAdmin && (
              <AdminStatusUpdater
                campaign={campaign}
                onStatusUpdate={updateCampaignStatus}
              />
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CampaignDetailPage;
