import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import CampaignStatusTracker from '../components/campaigns/CampaignStatusTracker';
import CampaignComments from '../components/campaigns/CampaignComments';
import CampaignWorkflowHistory from '../components/campaigns/CampaignWorkflowHistory';
import AdminStatusUpdater from '../components/campaigns/AdminStatusUpdater';
import { useCampaign } from '../context/CampaignContext';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Calendar, DollarSign, Monitor, Users } from 'lucide-react';

const CampaignDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    getCampaignById, 
    comments, 
    workflowHistory, 
    fetchCampaignComments, 
    fetchWorkflowHistory,
    addComment,
    updateCampaignStatus
  } = useCampaign();
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);

  const campaign = id ? getCampaignById(id) : null;

  useEffect(() => {
    if (!id) {
      navigate('/campaigns');
      return;
    }

    const loadCampaignData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchCampaignComments(id),
          fetchWorkflowHistory(id)
        ]);
      } catch (error) {
        console.error('Error loading campaign data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCampaignData();
  }, [id, fetchCampaignComments, fetchWorkflowHistory, navigate]);

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
        {/* Header */}
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
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Status Tracker */}
            <CampaignStatusTracker campaign={campaign} />

            {/* Campaign Details */}
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

                {/* Platforms */}
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
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{audience.name}</h4>
                            <p className="text-sm text-gray-600 mt-1">{audience.description}</p>
                            {audience.dataSupplier && (
                              <p className="text-xs text-gray-500 mt-1">{audience.dataSupplier}</p>
                            )}
                          </div>
                          <div className="text-right text-sm ml-4">
                            <p className="text-gray-500">Est. Reach</p>
                            <p className="font-medium">{audience.reach?.toLocaleString() || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No audiences selected</p>
                )}
              </CardContent>
            </Card>

            {/* Comments */}
            <CampaignComments
              comments={comments}
              onAddComment={(content, parentCommentId) => addComment(campaign.id, content, parentCommentId)}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Admin Status Updater */}
            {isAdmin && (
              <AdminStatusUpdater
                campaign={campaign}
                onStatusUpdate={updateCampaignStatus}
              />
            )}

            {/* Workflow History */}
            <CampaignWorkflowHistory history={workflowHistory} />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CampaignDetailPage;