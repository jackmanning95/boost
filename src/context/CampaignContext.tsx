import React, { createContext, useContext, useState } from 'react';
import { Campaign, AudienceSegment, AudienceRequest } from '../types';
import { useAuth } from './AuthContext';

interface CampaignContextType {
  campaigns: Campaign[];
  activeCampaign: Campaign | null;
  requests: AudienceRequest[];
  initializeCampaign: (name: string) => void;
  addAudienceToCampaign: (audience: AudienceSegment) => void;
  removeAudienceFromCampaign: (audienceId: string) => void;
  updateCampaignDetails: (details: Partial<Campaign>) => void;
  submitCampaignRequest: (notes?: string) => Promise<void>;
  getCampaignById: (id: string) => Campaign | undefined;
  getRequestById: (id: string) => AudienceRequest | undefined;
}

const CampaignContext = createContext<CampaignContextType | undefined>(undefined);

// Mock campaign data
const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: '1',
    name: 'Summer Brand Awareness',
    clientId: '2',
    audiences: [],
    platforms: {
      social: ['Meta', 'Instagram'],
      programmatic: ['DV360']
    },
    budget: 50000,
    startDate: '2025-06-01',
    endDate: '2025-08-31',
    status: 'draft',
    createdAt: '2025-05-15T10:30:00Z',
    updatedAt: '2025-05-15T10:30:00Z'
  }
];

const MOCK_REQUESTS: AudienceRequest[] = [];

export const CampaignProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>(MOCK_CAMPAIGNS);
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [requests, setRequests] = useState<AudienceRequest[]>(MOCK_REQUESTS);

  const initializeCampaign = (name: string) => {
    if (!user) return;

    const newCampaign: Campaign = {
      id: `campaign-${Date.now()}`,
      name,
      clientId: user.id,
      audiences: [],
      platforms: {
        social: [],
        programmatic: []
      },
      budget: 0,
      startDate: '',
      endDate: '',
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setCampaigns(prev => [...prev, newCampaign]);
    setActiveCampaign(newCampaign);
  };

  const addAudienceToCampaign = (audience: AudienceSegment) => {
    if (!activeCampaign) {
      console.warn('No active campaign to add audience to');
      return;
    }

    try {
      // Check if audience is already in campaign
      if (activeCampaign.audiences.some(a => a.id === audience.id)) {
        console.log('Audience already in campaign:', audience.id);
        return;
      }

      const updatedCampaign = {
        ...activeCampaign,
        audiences: [...activeCampaign.audiences, audience],
        updatedAt: new Date().toISOString()
      };

      setActiveCampaign(updatedCampaign);
      setCampaigns(prev => 
        prev.map(c => c.id === updatedCampaign.id ? updatedCampaign : c)
      );

      console.log('Successfully added audience:', audience.id);
    } catch (error) {
      console.error('Error adding audience to campaign:', error);
    }
  };

  const removeAudienceFromCampaign = (audienceId: string) => {
    if (!activeCampaign) {
      console.warn('No active campaign to remove audience from');
      return;
    }

    try {
      const updatedCampaign = {
        ...activeCampaign,
        audiences: activeCampaign.audiences.filter(a => a.id !== audienceId),
        updatedAt: new Date().toISOString()
      };

      setActiveCampaign(updatedCampaign);
      setCampaigns(prev => 
        prev.map(c => c.id === updatedCampaign.id ? updatedCampaign : c)
      );

      console.log('Successfully removed audience:', audienceId);
    } catch (error) {
      console.error('Error removing audience from campaign:', error);
    }
  };

  const updateCampaignDetails = (details: Partial<Campaign>) => {
    if (!activeCampaign) {
      console.warn('No active campaign to update');
      return;
    }

    try {
      const updatedCampaign = {
        ...activeCampaign,
        ...details,
        updatedAt: new Date().toISOString()
      };

      setActiveCampaign(updatedCampaign);
      setCampaigns(prev => 
        prev.map(c => c.id === updatedCampaign.id ? updatedCampaign : c)
      );

      console.log('Successfully updated campaign details');
    } catch (error) {
      console.error('Error updating campaign details:', error);
    }
  };

  const submitCampaignRequest = async (notes?: string) => {
    if (!activeCampaign || !user) {
      console.warn('No active campaign or user to submit request');
      return;
    }

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      const newRequest: AudienceRequest = {
        id: `request-${Date.now()}`,
        campaignId: activeCampaign.id,
        clientId: user.id,
        audiences: activeCampaign.audiences,
        platforms: activeCampaign.platforms,
        budget: activeCampaign.budget,
        startDate: activeCampaign.startDate,
        endDate: activeCampaign.endDate,
        notes,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      setRequests(prev => [...prev, newRequest]);

      // Update campaign status
      const updatedCampaign = {
        ...activeCampaign,
        status: 'submitted' as const,
        updatedAt: new Date().toISOString()
      };

      setCampaigns(prev => 
        prev.map(c => c.id === updatedCampaign.id ? updatedCampaign : c)
      );
      setActiveCampaign(updatedCampaign);

      console.log('Successfully submitted campaign request');
    } catch (error) {
      console.error('Error submitting campaign request:', error);
      throw error;
    }
  };

  const getCampaignById = (id: string): Campaign | undefined => {
    return campaigns.find(campaign => campaign.id === id);
  };

  const getRequestById = (id: string): AudienceRequest | undefined => {
    return requests.find(request => request.id === id);
  };

  return (
    <CampaignContext.Provider value={{
      campaigns,
      activeCampaign,
      requests,
      initializeCampaign,
      addAudienceToCampaign,
      removeAudienceFromCampaign,
      updateCampaignDetails,
      submitCampaignRequest,
      getCampaignById,
      getRequestById
    }}>
      {children}
    </CampaignContext.Provider>
  );
};

export const useCampaign = (): CampaignContextType => {
  const context = useContext(CampaignContext);
  if (context === undefined) {
    throw new Error('useCampaign must be used within a CampaignProvider');
  }
  return context;
};