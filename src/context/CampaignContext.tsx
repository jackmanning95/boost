import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Campaign, AudienceSegment, AudienceRequest, CampaignComment, CampaignWorkflowHistory, CampaignFilters } from '../types';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

interface CampaignContextType {
  campaigns: Campaign[];
  activeCampaign: Campaign | null;
  requests: AudienceRequest[];
  comments: CampaignComment[];
  workflowHistory: CampaignWorkflowHistory[];
  filters: CampaignFilters;
  loading: boolean;
  initializeCampaign: (name: string) => void;
  addAudienceToCampaign: (audience: AudienceSegment) => void;
  removeAudienceFromCampaign: (audienceId: string) => void;
  updateCampaignDetails: (details: Partial<Campaign>) => void;
  updateCampaignStatus: (campaignId: string, status: string, notes?: string) => Promise<void>;
  submitCampaignRequest: (notes?: string) => Promise<void>;
  getCampaignById: (id: string) => Campaign | undefined;
  getRequestById: (id: string) => AudienceRequest | undefined;
  fetchCampaignComments: (campaignId: string) => Promise<void>;
  addComment: (campaignId: string, content: string, parentCommentId?: string) => Promise<void>;
  fetchWorkflowHistory: (campaignId: string) => Promise<void>;
  setFilters: (filters: Partial<CampaignFilters>) => void;
  filteredCampaigns: Campaign[];
}

const CampaignContext = createContext<CampaignContextType | undefined>(undefined);

export const CampaignProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [requests, setRequests] = useState<AudienceRequest[]>([]);
  const [comments, setComments] = useState<CampaignComment[]>([]);
  const [workflowHistory, setWorkflowHistory] = useState<CampaignWorkflowHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFiltersState] = useState<CampaignFilters>({
    search: '',
    status: '',
    dateRange: { start: '', end: '' }
  });

  // Fetch campaigns and requests on mount
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch campaigns with user data using explicit foreign key
        const { data: campaignData, error: campaignError } = await supabase
          .from('campaigns')
          .select(`
            *,
            users!campaigns_client_id_fkey (
              name,
              company_id,
              companies!users_company_id_fkey (name)
            )
          `)
          .order('created_at', { ascending: false });

        if (campaignError) throw campaignError;
        setCampaigns(campaignData || []);

        // Fetch requests for admin users
        if (isAdmin) {
          const { data: requestData, error: requestError } = await supabase
            .from('audience_requests')
            .select('*')
            .order('created_at', { ascending: false });

          if (requestError) throw requestError;
          setRequests(requestData || []);
        }
      } catch (error) {
        console.error('Error fetching campaign data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Set up real-time subscriptions
    const campaignSubscription = supabase
      .channel('campaigns')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'campaigns'
      }, (payload) => {
        console.log('Campaign change:', payload);
        fetchData(); // Refetch data on changes
      })
      .subscribe();

    const commentsSubscription = supabase
      .channel('campaign_comments')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'campaign_comments'
      }, (payload) => {
        console.log('Comment change:', payload);
        if (payload.eventType === 'INSERT') {
          fetchCampaignComments(payload.new.campaign_id);
        }
      })
      .subscribe();

    const workflowSubscription = supabase
      .channel('campaign_workflow_history')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'campaign_workflow_history'
      }, (payload) => {
        console.log('Workflow change:', payload);
        if (payload.eventType === 'INSERT') {
          fetchWorkflowHistory(payload.new.campaign_id);
        }
      })
      .subscribe();

    return () => {
      campaignSubscription.unsubscribe();
      commentsSubscription.unsubscribe();
      workflowSubscription.unsubscribe();
    };
  }, [user, isAdmin]);

  const initializeCampaign = async (name: string) => {
    if (!user) return;

    const currentDate = new Date().toISOString().split('T')[0];

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
      startDate: currentDate,
      endDate: currentDate,
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

      setCampaigns(prev => [newCampaign, ...prev]);
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

      const supabaseUpdate: Record<string, any> = {
        updated_at: updatedCampaign.updatedAt
      };

      if ('name' in details) supabaseUpdate.name = details.name;
      if ('audiences' in details) supabaseUpdate.audiences = details.audiences;
      if ('platforms' in details) supabaseUpdate.platforms = details.platforms;
      if ('budget' in details) supabaseUpdate.budget = details.budget;
      if ('startDate' in details) supabaseUpdate.start_date = details.startDate;
      if ('endDate' in details) supabaseUpdate.end_date = details.endDate;
      if ('status' in details) supabaseUpdate.status = details.status;

      const { error } = await supabase
        .from('campaigns')
        .update(supabaseUpdate)
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

  const updateCampaignStatus = async (campaignId: string, status: string, notes?: string) => {
    if (!user || !isAdmin) return;

    try {
      const campaign = campaigns.find(c => c.id === campaignId);
      if (!campaign) return;

      // Update campaign status
      const { error: campaignError } = await supabase
        .from('campaigns')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignId);

      if (campaignError) throw campaignError;

      // Add workflow history entry
      const { error: historyError } = await supabase
        .from('campaign_workflow_history')
        .insert({
          campaign_id: campaignId,
          user_id: user.id,
          from_status: campaign.status,
          to_status: status,
          notes
        });

      if (historyError) throw historyError;

      // Create notification for client
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: campaign.clientId,
          title: 'Campaign Status Updated',
          message: `Your campaign "${campaign.name}" status has been updated to ${status.replace('_', ' ')}.`,
          read: false
        });

      if (notificationError) console.error('Error creating notification:', notificationError);

      // Update local state
      setCampaigns(prev => 
        prev.map(c => c.id === campaignId ? { ...c, status: status as any } : c)
      );

    } catch (error) {
      console.error('Error updating campaign status:', error);
      throw error;
    }
  };

  const submitCampaignRequest = async (notes?: string) => {
    if (!activeCampaign || !user) return;

    // Ensure authenticated user is available
    if (!user?.id) {
      console.error("submitCampaignRequest: No authenticated user found.");
      return;
    }

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
      
      // Create notification for admin - using authenticated user's ID instead of hardcoded 'admin'
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id, // ✅ Using valid UUID instead of 'admin'
          title: 'New Campaign Submitted',
          message: `${user.name} has submitted a new campaign: "${activeCampaign.name}".`,
          read: false
        });

      if (notificationError) console.error('Error creating notification:', notificationError);
      
      setRequests(prev => [newRequest, ...prev]);
    } catch (error) {
      console.error('Error submitting request:', error);
      throw error;
    }
  };

  const fetchCampaignComments = async (campaignId: string) => {
    try {
      const { data, error } = await supabase
        .from('campaign_comments')
        .select(`
          *,
          users!campaign_comments_user_id_fkey (name, role)
        `)
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Organize comments into threaded structure
      const commentsMap = new Map();
      const rootComments: CampaignComment[] = [];

      data?.forEach(comment => {
        const formattedComment: CampaignComment = {
          id: comment.id,
          campaignId: comment.campaign_id,
          userId: comment.user_id,
          parentCommentId: comment.parent_comment_id,
          content: comment.content,
          createdAt: comment.created_at,
          updatedAt: comment.updated_at,
          user: comment.users,
          replies: []
        };

        commentsMap.set(comment.id, formattedComment);

        if (comment.parent_comment_id) {
          const parent = commentsMap.get(comment.parent_comment_id);
          if (parent) {
            parent.replies = parent.replies || [];
            parent.replies.push(formattedComment);
          }
        } else {
          rootComments.push(formattedComment);
        }
      });

      setComments(rootComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const addComment = async (campaignId: string, content: string, parentCommentId?: string) => {
    if (!user) {
      console.error("addComment: No authenticated user found.");
      return;
    }

    try {
      const { error } = await supabase
        .from('campaign_comments')
        .insert({
          campaign_id: campaignId,
          user_id: user.id,
          parent_comment_id: parentCommentId,
          content
        });

      if (error) throw error;

      // Create notification for the other party
      const campaign = campaigns.find(c => c.id === campaignId);
      if (campaign) {
        // ✅ Fixed: Use proper UUID instead of hardcoded 'admin'
        const notifyUserId = isAdmin ? campaign.clientId : user?.id;
        
        // ✅ Add validation to ensure we have a valid user ID
        if (!notifyUserId) {
          console.error("addComment: No valid user ID for notification");
          return;
        }

        // ✅ Optional: Validate UUID format
        const isValidUUID = (id: string) =>
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

        if (!isValidUUID(notifyUserId)) {
          console.error("addComment: Invalid UUID passed to notifications:", notifyUserId);
          return;
        }
        
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: notifyUserId, // ✅ Using valid UUID
            title: 'New Comment',
            message: `${user.name} left a comment on campaign "${campaign.name}".`,
            read: false
          });

        if (notificationError) console.error('Error creating notification:', notificationError);
      }

      // Refresh comments
      await fetchCampaignComments(campaignId);
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  };

  const fetchWorkflowHistory = async (campaignId: string) => {
    try {
      const { data, error } = await supabase
        .from('campaign_workflow_history')
        .select(`
          *,
          users!campaign_workflow_history_user_id_fkey (name, role)
        `)
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedHistory: CampaignWorkflowHistory[] = data?.map(item => ({
        id: item.id,
        campaignId: item.campaign_id,
        userId: item.user_id,
        fromStatus: item.from_status,
        toStatus: item.to_status,
        notes: item.notes,
        createdAt: item.created_at,
        user: item.users
      })) || [];

      setWorkflowHistory(formattedHistory);
    } catch (error) {
      console.error('Error fetching workflow history:', error);
    }
  };

  const setFilters = useCallback((newFilters: Partial<CampaignFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  const filteredCampaigns = campaigns.filter(campaign => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (!campaign.name.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    // Status filter
    if (filters.status && campaign.status !== filters.status) {
      return false;
    }

    // Date range filter
    if (filters.dateRange.start || filters.dateRange.end) {
      const campaignDate = new Date(campaign.createdAt);
      if (filters.dateRange.start && campaignDate < new Date(filters.dateRange.start)) {
        return false;
      }
      if (filters.dateRange.end && campaignDate > new Date(filters.dateRange.end)) {
        return false;
      }
    }

    return true;
  });

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
      comments,
      workflowHistory,
      filters,
      loading,
      initializeCampaign,
      addAudienceToCampaign,
      removeAudienceFromCampaign,
      updateCampaignDetails,
      updateCampaignStatus,
      submitCampaignRequest,
      getCampaignById,
      getRequestById,
      fetchCampaignComments,
      addComment,
      fetchWorkflowHistory,
      setFilters,
      filteredCampaigns
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