import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import CampaignFilters from '../components/campaigns/CampaignFilters';
import { useCampaign } from '../context/CampaignContext';
import { useAuth } from '../context/AuthContext';
import { Calendar, Clock, Plus, Users, Eye } from 'lucide-react';
import Input from '../components/ui/Input';

const CampaignsPage: React.FC = () => {
  const { filteredCampaigns, initializeCampaign, filters, setFilters, loading } = useCampaign();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [showNewCampaignForm, setShowNewCampaignForm] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  
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
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  return (
    <Layout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-600">
            {isAdmin ? 'Manage all client campaigns' : 'Manage your audience campaigns'}
          </p>
        </div>
        
        {!isAdmin && (
          <div className="flex gap-4">
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
          </div>
        )}
      </div>

      {/* Filters */}
      <CampaignFilters
        filters={filters}
        onFiltersChange={setFilters}
      />
      
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
      ) : filteredCampaigns.length > 0 ? (
        <div className="grid grid-cols-1 gap-6">
          {filteredCampaigns.map(campaign => (
            <Card key={campaign.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-0">
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{campaign.name}</h3>
                      <div className="flex items-center mt-1">
                        <Clock size={16} className="text-gray-400 mr-1" />
                        <span className="text-sm text-gray-500">
                          Created on {formatDate(campaign.createdAt)}
                        </span>
                        {isAdmin && campaign.users && (
                          <>
                            <span className="mx-2 text-gray-300">•</span>
                            <span className="text-sm text-gray-500">
                              {campaign.users.name} ({campaign.users.companies?.name})
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {getStatusBadge(campaign.status)}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewCampaign(campaign.id)}
                        icon={<Eye size={16} />}
                      >
                        View Details
                      </Button>
                      {campaign.status === 'draft' && !isAdmin && (
                        <Link to="/audiences">
                          <Button variant="primary" size="sm">Continue</Button>
                        </Link>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Selected Audiences</p>
                      <p className="font-medium">{campaign.audiences.length}</p>
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
                        <p className="font-medium">${campaign.budget.toLocaleString()}</p>
                      </div>
                    )}
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
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {filters.search || filters.status || filters.dateRange.start || filters.dateRange.end
              ? 'No campaigns match your filters'
              : 'No campaigns yet'
            }
          </h3>
          <p className="text-gray-600 mb-6">
            {filters.search || filters.status || filters.dateRange.start || filters.dateRange.end
              ? 'Try adjusting your search criteria or filters'
              : isAdmin 
                ? "You'll see client campaigns here when they're created"
                : "Create your first campaign to start selecting audiences"
            }
          </p>
          
          {!isAdmin && !showNewCampaignForm && !(filters.search || filters.status || filters.dateRange.start || filters.dateRange.end) && (
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
    </Layout>
  );
};

export default CampaignsPage;