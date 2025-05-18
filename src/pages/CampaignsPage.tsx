import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useCampaign } from '../context/CampaignContext';
import { useAuth } from '../context/AuthContext';
import { Calendar, Clock, Plus, Users } from 'lucide-react';
import Input from '../components/ui/Input';

const CampaignsPage: React.FC = () => {
  const { campaigns, initializeCampaign } = useCampaign();
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
  
  // Filter campaigns for client users
  const filteredCampaigns = isAdmin 
    ? campaigns 
    : campaigns.filter(campaign => campaign.clientId === user?.id);
  
  // Sort campaigns by date (newest first)
  const sortedCampaigns = [...filteredCampaigns].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="default">Draft</Badge>;
      case 'submitted':
        return <Badge variant="primary">Submitted</Badge>;
      case 'approved':
        return <Badge variant="success">Approved</Badge>;
      case 'active':
        return <Badge variant="secondary">Active</Badge>;
      case 'completed':
        return <Badge variant="outline">Completed</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
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
          <p className="text-gray-600">Manage your audience campaigns</p>
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
      
      {sortedCampaigns.length > 0 ? (
        <div className="grid grid-cols-1 gap-6">
          {sortedCampaigns.map(campaign => (
            <Card key={campaign.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-0">
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{campaign.name}</h3>
                      <div className="flex items-center mt-1">
                        <Clock size={16} className="text-gray-400 mr-1" />
                        <span className="text-sm text-gray-500">
                          Created on {formatDate(campaign.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {getStatusBadge(campaign.status)}
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
          <p className="text-gray-600 mb-6">
            {isAdmin 
              ? "You'll see client campaign requests here when they're submitted"
              : "Create your first campaign to start selecting audiences"}
          </p>
          
          {!isAdmin && !showNewCampaignForm && (
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