import React from 'react';
import { Navigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { Card, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useCampaign } from '../context/CampaignContext';
import { useAuth } from '../context/AuthContext';
import { Calendar, Clock, Users, CheckCircle, XCircle } from 'lucide-react';

const RequestsPage: React.FC = () => {
  const { requests, campaigns } = useCampaign();
  const { isAdmin } = useAuth();
  
  // Redirect if user is not admin
  if (!isAdmin) {
    return <Navigate to="/campaigns" replace />;
  }
  
  // Sort requests by creation date (newest first)
  const sortedRequests = [...requests].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
  const getClientName = (clientId: string) => {
    // In a real app, you would fetch client details from the API
    return clientId === '2' ? 'Demo Client' : 'Unknown Client';
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="primary">Pending</Badge>;
      case 'reviewed':
        return <Badge variant="warning">Under Review</Badge>;
      case 'approved':
        return <Badge variant="success">Approved</Badge>;
      case 'rejected':
        return <Badge variant="danger">Rejected</Badge>;
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
  
  const getCampaignName = (campaignId: string) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    return campaign ? campaign.name : 'Unknown Campaign';
  };
  
  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Audience Requests</h1>
        <p className="text-gray-600">Manage client audience segment requests</p>
      </div>
      
      {sortedRequests.length > 0 ? (
        <div className="space-y-6">
          {sortedRequests.map(request => (
            <Card key={request.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="p-6">
                  <div className="flex justify-between items-start flex-wrap gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {getCampaignName(request.campaignId)}
                      </h3>
                      <div className="flex items-center mt-1">
                        <span className="text-sm font-medium text-gray-600 mr-2">
                          {getClientName(request.clientId)}
                        </span>
                        <Clock size={14} className="text-gray-400 mr-1" />
                        <span className="text-sm text-gray-500">
                          {formatDate(request.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {getStatusBadge(request.status)}
                      
                      {request.status === 'pending' && (
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline"
                            size="sm"
                            icon={<XCircle size={16} />}
                          >
                            Reject
                          </Button>
                          <Button 
                            variant="success"
                            size="sm"
                            icon={<CheckCircle size={16} />}
                          >
                            Approve
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Selected Audiences</p>
                      <div className="flex items-center">
                        <Users size={16} className="text-gray-400 mr-1" />
                        <p className="font-medium">{request.audiences.length} segments</p>
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
                      <p className="font-medium">${request.budget.toLocaleString()}</p>
                    </div>
                  </div>
                  
                  {(request.platforms.social.length > 0 || request.platforms.programmatic.length > 0) && (
                    <div className="mt-4">
                      <p className="text-xs text-gray-500 mb-1">Platforms</p>
                      <div className="flex flex-wrap gap-1">
                        {request.platforms.social.map(platform => (
                          <Badge key={platform} variant="default" className="text-xs">{platform}</Badge>
                        ))}
                        {request.platforms.programmatic.map(platform => (
                          <Badge key={platform} variant="secondary" className="text-xs">{platform}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {request.notes && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-md">
                      <p className="text-xs text-gray-500 mb-1">Notes</p>
                      <p className="text-sm">{request.notes}</p>
                    </div>
                  )}
                </div>
                
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-end">
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No requests yet</h3>
          <p className="text-gray-600">
            You'll see client audience requests here when they're submitted
          </p>
        </div>
      )}
    </Layout>
  );
};

export default RequestsPage;