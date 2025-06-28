import React, { useState } from 'react';
import { useCampaign } from '../../context/CampaignContext';
import { useUserAdvertiserAccounts } from '../../context/UserAdvertiserAccountContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { ChevronRight, Calendar, DollarSign, Monitor, Users, Send, Building, User } from 'lucide-react';
import Input from '../ui/Input';

interface CampaignSummaryProps {
  onSubmit: () => void;
}

const CampaignSummary: React.FC<CampaignSummaryProps> = ({ onSubmit }) => {
  const { activeCampaign, submitCampaignRequest } = useCampaign();
  const { advertiserAccounts } = useUserAdvertiserAccounts();
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  if (!activeCampaign) {
    return null;
  }
  
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await submitCampaignRequest(notes);
      onSubmit();
    } catch (error) {
      console.error('Error submitting request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const selectedAccount = advertiserAccounts.find(account => account.id === activeCampaign.selectedAdvertiserAccountId);
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Campaign Summary</h2>
      <p className="text-gray-600">
        Please review your campaign details before submitting your request.
      </p>
      
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
                <p className="font-medium">{activeCampaign.name}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Start Date</p>
                  <p className="font-medium">{formatDate(activeCampaign.startDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">End Date</p>
                  <p className="font-medium">{formatDate(activeCampaign.endDate)}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Budget</p>
                <p className="font-medium">${activeCampaign.budget.toLocaleString()}</p>
              </div>
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
              {activeCampaign.platforms.social.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Social Platforms</p>
                  <div className="flex flex-wrap gap-2">
                    {activeCampaign.platforms.social.map(platform => (
                      <Badge key={platform} variant="primary">{platform}</Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {activeCampaign.platforms.programmatic.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Programmatic Platforms</p>
                  <div className="flex flex-wrap gap-2">
                    {activeCampaign.platforms.programmatic.map(platform => (
                      <Badge key={platform} variant="secondary">{platform}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building size={20} className="mr-2 text-blue-600" />
            Platform Account & Advertiser
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedAccount ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Platform</p>
                <p className="font-medium">{selectedAccount.platform}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Advertiser Name</p>
                <p className="font-medium">{selectedAccount.advertiserName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Account ID</p>
                <p className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                  {selectedAccount.advertiserId}
                </p>
              </div>
            </div>
          ) : activeCampaign.advertiserName ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Advertiser Name</p>
                <p className="font-medium flex items-center">
                  <User size={16} className="mr-2 text-green-600" />
                  {activeCampaign.advertiserName}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 italic">No platform account or advertiser selected</p>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users size={20} className="mr-2 text-blue-600" />
            Selected Audiences ({activeCampaign.audiences.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeCampaign.audiences.length > 0 ? (
            <div className="space-y-3">
              {activeCampaign.audiences.map(audience => (
                <div key={audience.id} className="p-3 bg-gray-50 rounded-md">
                  <div className="flex justify-between">
                    <div>
                      <h4 className="font-medium">{audience.name}</h4>
                      <p className="text-sm text-gray-600">{audience.description}</p>
                    </div>
                    <div className="text-right text-sm">
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
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Send size={20} className="mr-2 text-blue-600" />
            Additional Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            as="textarea"
            placeholder="Any additional requirements or information for your campaign..."
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </CardContent>
      </Card>
      
      <div className="flex justify-end pt-4">
        <Button
          variant="primary"
          size="lg"
          icon={<ChevronRight size={18} />}
          isLoading={isSubmitting}
          onClick={handleSubmit}
        >
          Submit Request
        </Button>
      </div>
    </div>
  );
};

export default CampaignSummary;