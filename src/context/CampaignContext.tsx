import React, { createContext, useContext, useState, useEffect } from 'react';
import { Campaign, AudienceSegment, AudienceRequest } from '../types';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

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

export const CampaignProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [requests, setRequests] = useState<AudienceRequest[]>([]);

  // Fetch campaigns and requests on mount
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        // Fetch campaigns
        const { data: campaignData, error: campaignError } = await supabase
          .from('campaigns')
          .select('*')
          .eq('client_id', user.id);

        if (campaignError) throw campaignError;
        setCampaigns(campaignData || []);

        // Fetch requests
        const { data: requestData, error: requestError } = await supabase
          .from('audience_requests')
          .select('*')
          .eq(user.role === 'admin' ? 'status' : 'client_id', user.role === 'admin' ? 'pending' : user.id);

        if (requestError) throw requestError;
        setRequests(requestData || []);
      } catch (error) {
        console.error('Error fetching campaign data:', error);
      }
    };

    fetchData();
  }, [user]);

  const initializeCampaign = async (name: string) => {
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

    try {
      const { data, error } = await supabase
        .from('campaigns')
        .insert([{
          id: newCampaign.id,
          name: newCampaign.name,
          client_id: newCampaign.clientId,
          audiences: newCampaign.audiences,
          platforms: newCampaign.platforms,
          budget: newCampaign.budget,
          start_date: newCampaign.startDate,
          end_date: newCampaign.endDate,
          status: newCampaign.status
        }])
        .select()
        .single();

      if (error) throw error;

      setCampaigns(prev => [...prev, newCampaign]);
      setActiveCampaign(newCampaign);
    } catch (error) {
      console.error('Error creating campaign:', error);
    }
  };

  const addAudienceToCampaign = async (audience: AudienceSegment) => {
    if (!activeCampaign) {
      console.warn('No active campaign to add audience to');
      return;
    }

    try {
      if (activeCampaign.audiences.some(a => a.id === audience.id)) {
        console.log('Audience already in campaign:', audience.id);
        return;
      }

      const updatedCampaign = {
        ...activeCampaign,
        audiences: [...activeCampaign.audiences, audience],
        updatedAt: new Date().toISOString()
      };

      const { error } = await supabase
        .from('campaigns')
        .update({
          audiences: updatedCampaign.audiences,
          updated_at: updatedCampaign.updatedAt
        })
        .eq('id', activeCampaign.id);

      if (error) throw error;

      setActiveCampaign(updatedCampaign);
      setCampaigns(prev => 
        prev.map(c => c.id === updatedCampaign.id ? updatedCampaign : c)
      );

      console.log('Successfully added audience:', audience.id);
    } catch (error) {
      console.error('Error adding audience to campaign:', error);
    }
  };

  const removeAudienceFromCampaign = async (audienceId: string) => {
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

      const { error } = await supabase
        .from('campaigns')
        .update({
          audiences: updatedCampaign.audiences,
          updated_at: updatedCampaign.updatedAt
        })
        .eq('id', activeCampaign.id);

      if (error) throw error;

      setActiveCampaign(updatedCampaign);
      setCampaigns(prev => 
        prev.map(c => c.id === updatedCampaign.id ? updatedCampaign : c)
      );

      console.log('Successfully removed audience:', audienceId);
    } catch (error) {
      console.error('Error removing audience from campaign:', error);
    }
  };

  const updateCampaignDetails = async (details: Partial<Campaign>) => {
    if (!activeCampaign) return;

    try {
      const updatedCampaign = {
        ...activeCampaign,
        ...details,
        updatedAt: new Date().toISOString()
      };

      const { error } = await supabase
        .from('campaigns')
        .update({
          ...details,
          updated_at: updatedCampaign.updatedAt
        })
        .eq('id', activeCampaign.id);

      if (error) throw error;

      setActiveCampaign(updatedCampaign);
      setCampaigns(prev => 
        prev.map(c => c.id === updatedCampaign.id ? updatedCampaign : c)
      );
    } catch (error) {
      console.error('Error updating campaign:', error);
    }
  };

  const submitCampaignRequest = async (notes?: string) => {
    if (!activeCampaign || !user) return;

    try {
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

      const { error } = await supabase
        .from('audience_requests')
        .insert([{
          id: newRequest.id,
          campaign_id: newRequest.campaignId,
          client_id: newRequest.clientId,
          audiences: newRequest.audiences,
          platforms: newRequest.platforms,
          budget: newRequest.budget,
          start_date: newRequest.startDate,
          end_date: newRequest.endDate,
          notes: newRequest.notes,
          status: newRequest.status
        }]);

      if (error) throw error;

      // Update campaign status
      await updateCampaignDetails({ status: 'submitted' });
      
      setRequests(prev => [...prev, newRequest]);
    } catch (error) {
      console.error('Error submitting request:', error);
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