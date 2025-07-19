import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Campaign, AudienceRequest, CampaignComment, CampaignWorkflowHistory, CampaignActivity, CampaignFilters, AudienceSegment } from '../types';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

interface CampaignContextType {
  // Campaign Management
  campaigns: Campaign[];
  activeCampaign: Campaign | null;
  filteredCampaigns: Campaign[];
  activeCampaigns: Campaign[];
  completedCampaigns: Campaign[];
  
  // Request Management
  requests: AudienceRequest[];
  pendingRequests: AudienceRequest[];
  rejectedRequests: AudienceRequest[];
  archivedRequests: AudienceRequest[];
  
  // Campaign Details
  comments: CampaignComment[];
  workflowHistory: CampaignWorkflowHistory[];
  activityLog: CampaignActivity[];
  
  // State
  loading: boolean;
  error: string | null;
  filters: CampaignFilters;
  hasActiveCampaignLoaded: boolean;
  isCampaignOperationLoading: boolean;
  
  // Campaign Operations
  initializeCampaign: (name: string) => Promise<void>;
  updateCampaignDetails: (updates: Partial<Campaign>) => void;
  addAudienceToCampaign: (audience: AudienceSegment) => Promise<void>;
  removeAudienceFromCampaign: (audienceId: string) => Promise<void>;
  submitCampaignRequest: (notes?: string) => Promise<void>;
  deleteCampaign: (campaignId: string) => Promise<void>;
  archiveCampaign: (campaignId: string) => Promise<void>;
  unarchiveCampaign: (campaignId: string) => Promise<void>;
  
  // Request Operations
  approveRequest: (requestId: string, notes?: string) => Promise<void>;
  rejectRequest: (requestId: string, reason: string) => Promise<void>;
  archiveRequest: (requestId: string) => Promise<void>;
  deleteRequest: (requestId: string) => Promise<void>;
  unarchiveRequest: (requestId: string) => Promise<void>;
  
  // Campaign Details Operations
  addComment: (campaignId: string, content: string, parentCommentId?: string) => Promise<void>;
  updateCampaignStatus: (campaignId: string, status: string, notes?: string) => Promise<void>;
  
  // Data Fetching
  fetchCampaigns: () => Promise<void>;
  fetchRequests: () => Promise<void>;
  fetchPendingRequests: () => Promise<void>;
  fetchRejectedRequests: () => Promise<void>;
  fetchArchivedRequests: () => Promise<void>;
  fetchCampaignComments: (campaignId: string) => Promise<void>;
  fetchWorkflowHistory: (campaignId: string) => Promise<void>;
  fetchActivityLog: (campaignId: string) => Promise<void>;
  refreshRequests: () => Promise<void>;
  
  // Utilities
  getCampaignById: (id: string) => Campaign | undefined;
  getCampaignStatusCategory: (status: string) => 'pending' | 'active' | 'completed';
  setFilters: (filters: Partial<CampaignFilters>) => void;
  waitForCampaignReady: () => Promise<void>;
}

const CampaignContext = createContext<CampaignContextType | undefined>(undefined);

export const CampaignProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isSuperAdmin } = useAuth();
  
  // State
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [requests, setRequests] = useState<AudienceRequest[]>([]);
  const [pendingRequests, setPendingRequests] = useState<AudienceRequest[]>([]);
  const [rejectedRequests, setRejectedRequests] = useState<AudienceRequest[]>([]);
  const [archivedRequests, setArchivedRequests] = useState<AudienceRequest[]>([]);
  const [comments, setComments] = useState<CampaignComment[]>([]);
  const [workflowHistory, setWorkflowHistory] = useState<CampaignWorkflowHistory[]>([]);
  const [activityLog, setActivityLog] = useState<CampaignActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasActiveCampaignLoaded, setHasActiveCampaignLoaded] = useState(false);
  const [isCampaignOperationLoading, setIsCampaignOperationLoading] = useState(false);
  
  const [filters, setFiltersState] = useState<CampaignFilters>({
    search: '',
    status: '',
    dateRange: { start: '', end: '' },
    agency: '',
    statusCategory: ''
  });

  // Fetch all campaigns - FIXED for Super Admins
  const fetchCampaigns = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      console.log('[CampaignContext] Fetching campaigns for user:', user.email, 'isSuperAdmin:', isSuperAdmin);

      let query = supabase
        .from('campaigns')
        .select(`
          *,
          users!campaigns_client_id_fkey (
            id,
            name,
            email,
            company_id,
            companies!users_company_id_fkey (
              id,
              name,
              account_id
            )
          )
        `)
        .order('created_at', { ascending: false });

      // DEBUG: Log the user's role and email to verify super admin status
      console.log('[CampaignContext] DEBUG - User details:', {
        email: user.email,
        role: user.role,
        isSuperAdmin: isSuperAdmin,
        emailEndsWithBoostdata: user.email?.endsWith('@boostdata.io')
      });

      // CRITICAL FIX: Only filter by client_id for non-super admins
      if (!isSuperAdmin) {
        query = query.eq('client_id', user.id);
        console.log('[CampaignContext] Regular user - filtering by client_id:', user.id);
      } else {
        console.log('[CampaignContext] Super Admin - fetching ALL campaigns (no filters applied)');
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('[CampaignContext] Error fetching campaigns:', fetchError);
        throw fetchError;
      }

      console.log('[CampaignContext] Raw data from Supabase:', {
        campaignCount: data?.length || 0,
        campaigns: data?.map(c => ({ id: c.id, name: c.name, client_id: c.client_id })) || []
      });

      const transformedCampaigns: Campaign[] = (data || []).map(campaign => ({
        id: campaign.id,
        name: campaign.name,
        clientId: campaign.client_id,
        audiences: campaign.audiences || [],
        platforms: campaign.platforms || { social: [], programmatic: [] },
        budget: campaign.budget || 0,
        startDate: campaign.start_date,
        endDate: campaign.end_date,
        status: campaign.status,
        createdAt: campaign.created_at,
        updatedAt: campaign.updated_at,
        approvedAt: campaign.approved_at,
        archived: campaign.archived || false,
        requestId: campaign.request_id,
        selectedAdvertiserAccountId: campaign.selected_advertiser_account_id,
        advertiserName: campaign.advertiser_name,
        users: campaign.users
      }));

      setCampaigns(transformedCampaigns);
      console.log('[CampaignContext] Set campaigns in state:', transformedCampaigns.length);
      setError(null);

    } catch (err) {
      console.error('[CampaignContext] Error in fetchCampaigns:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch campaigns');
    } finally {
      setLoading(false);
    }
  }, [user, isSuperAdmin]);

  // Fetch all requests - FIXED for Super Admins
  const fetchRequests = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      console.log('[CampaignContext] Fetching requests for user:', user.email, 'isSuperAdmin:', isSuperAdmin);

      let query = supabase
        .from('audience_requests')
        .select('*')
        .order('created_at', { ascending: false });

      // CRITICAL FIX: Only filter by client_id for non-super admins
      if (!isSuperAdmin) {
        query = query.eq('client_id', user.id);
        console.log('[CampaignContext] Regular user - filtering requests by client_id:', user.id);
      } else {
        console.log('[CampaignContext] Super Admin - fetching ALL requests');
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('[CampaignContext] Error fetching requests:', fetchError);
        throw fetchError;
      }

      console.log('[CampaignContext] Fetched requests:', data?.length || 0);

      const transformedRequests: AudienceRequest[] = (data || []).map(request => ({
        id: request.id,
        campaignId: request.campaign_id,
        clientId: request.client_id,
        audiences: request.audiences || [],
        platforms: request.platforms || { social: [], programmatic: [] },
        budget: request.budget || 0,
        startDate: request.start_date,
        endDate: request.end_date,
        notes: request.notes,
        status: request.status,
        createdAt: request.created_at,
        updatedAt: request.updated_at,
        archived: request.archived || false
      }));

      setRequests(transformedRequests);
      setError(null);

    } catch (err) {
      console.error('[CampaignContext] Error in fetchRequests:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  }, [user, isSuperAdmin]);

  // Fetch pending requests - FIXED for Super Admins
  const fetchPendingRequests = useCallback(async () => {
    if (!user) return;

    try {
      console.log('[CampaignContext] Fetching pending requests for user:', user.email, 'isSuperAdmin:', isSuperAdmin);

      let query = supabase
        .from('audience_requests')
        .select('*')
        .eq('status', 'pending')
        .eq('archived', false)
        .order('created_at', { ascending: false });

      // CRITICAL FIX: Only filter by client_id for non-super admins
      if (!isSuperAdmin) {
        query = query.eq('client_id', user.id);
        console.log('[CampaignContext] Regular user - filtering pending requests by client_id:', user.id);
      } else {
        console.log('[CampaignContext] Super Admin - fetching ALL pending requests');
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('[CampaignContext] Error fetching pending requests:', fetchError);
        throw fetchError;
      }

      console.log('[CampaignContext] Fetched pending requests:', data?.length || 0);

      const transformedRequests: AudienceRequest[] = (data || []).map(request => ({
        id: request.id,
        campaignId: request.campaign_id,
        clientId: request.client_id,
        audiences: request.audiences || [],
        platforms: request.platforms || { social: [], programmatic: [] },
        budget: request.budget || 0,
        startDate: request.start_date,
        endDate: request.end_date,
        notes: request.notes,
        status: request.status,
        createdAt: request.created_at,
        updatedAt: request.updated_at,
        archived: request.archived || false
      }));

      setPendingRequests(transformedRequests);

    } catch (err) {
      console.error('[CampaignContext] Error in fetchPendingRequests:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch pending requests');
    }
  }, [user, isSuperAdmin]);

  // Fetch rejected requests - FIXED for Super Admins
  const fetchRejectedRequests = useCallback(async () => {
    if (!user) return;

    try {
      console.log('[CampaignContext] Fetching rejected requests for user:', user.email, 'isSuperAdmin:', isSuperAdmin);

      let query = supabase
        .from('audience_requests')
        .select('*')
        .eq('status', 'rejected')
        .eq('archived', false)
        .order('created_at', { ascending: false });

      // CRITICAL FIX: Only filter by client_id for non-super admins
      if (!isSuperAdmin) {
        query = query.eq('client_id', user.id);
        console.log('[CampaignContext] Regular user - filtering rejected requests by client_id:', user.id);
      } else {
        console.log('[CampaignContext] Super Admin - fetching ALL rejected requests');
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('[CampaignContext] Error fetching rejected requests:', fetchError);
        throw fetchError;
      }

      console.log('[CampaignContext] Fetched rejected requests:', data?.length || 0);

      const transformedRequests: AudienceRequest[] = (data || []).map(request => ({
        id: request.id,
        campaignId: request.campaign_id,
        clientId: request.client_id,
        audiences: request.audiences || [],
        platforms: request.platforms || { social: [], programmatic: [] },
        budget: request.budget || 0,
        startDate: request.start_date,
        endDate: request.end_date,
        notes: request.notes,
        status: request.status,
        createdAt: request.created_at,
        updatedAt: request.updated_at,
        archived: request.archived || false
      }));

      setRejectedRequests(transformedRequests);

    } catch (err) {
      console.error('[CampaignContext] Error in fetchRejectedRequests:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch rejected requests');
    }
  }, [user, isSuperAdmin]);

  // Fetch archived requests - FIXED for Super Admins
  const fetchArchivedRequests = useCallback(async () => {
    if (!user) return;

    try {
      console.log('[CampaignContext] Fetching archived requests for user:', user.email, 'isSuperAdmin:', isSuperAdmin);

      let query = supabase
        .from('audience_requests')
        .select('*')
        .eq('archived', true)
        .order('created_at', { ascending: false });

      // CRITICAL FIX: Only filter by client_id for non-super admins
      if (!isSuperAdmin) {
        query = query.eq('client_id', user.id);
        console.log('[CampaignContext] Regular user - filtering archived requests by client_id:', user.id);
      } else {
        console.log('[CampaignContext] Super Admin - fetching ALL archived requests');
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('[CampaignContext] Error fetching archived requests:', fetchError);
        throw fetchError;
      }

      console.log('[CampaignContext] Fetched archived requests:', data?.length || 0);

      const transformedRequests: AudienceRequest[] = (data || []).map(request => ({
        id: request.id,
        campaignId: request.campaign_id,
        clientId: request.client_id,
        audiences: request.audiences || [],
        platforms: request.platforms || { social: [], programmatic: [] },
        budget: request.budget || 0,
        startDate: request.start_date,
        endDate: request.end_date,
        notes: request.notes,
        status: request.status,
        createdAt: request.created_at,
        updatedAt: request.updated_at,
        archived: request.archived || false
      }));

      setArchivedRequests(transformedRequests);

    } catch (err) {
      console.error('[CampaignContext] Error in fetchArchivedRequests:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch archived requests');
    }
  }, [user, isSuperAdmin]);

  // Initialize campaign
  const initializeCampaign = async (name: string) => {
    if (!user) return;

    try {
      setIsCampaignOperationLoading(true);
      console.log('[CampaignContext] Initializing campaign:', name);

      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          name,
          client_id: user.id,
          audiences: [],
          platforms: { social: [], programmatic: [] },
          budget: 0,
          status: 'draft'
        })
        .select()
        .single();

      if (error) throw error;

      const newCampaign: Campaign = {
        id: data.id,
        name: data.name,
        clientId: data.client_id,
        audiences: [],
        platforms: { social: [], programmatic: [] },
        budget: 0,
        startDate: '',
        endDate: '',
        status: 'draft',
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        archived: false
      };

      setActiveCampaign(newCampaign);
      setCampaigns(prev => [newCampaign, ...prev]);
      setHasActiveCampaignLoaded(true);

    } catch (err) {
      console.error('[CampaignContext] Error initializing campaign:', err);
      throw err;
    } finally {
      setIsCampaignOperationLoading(false);
    }
  };

  // Update campaign details
  const updateCampaignDetails = (updates: Partial<Campaign>) => {
    if (!activeCampaign) return;

    const updatedCampaign = { ...activeCampaign, ...updates };
    setActiveCampaign(updatedCampaign);

    // Update in campaigns list
    setCampaigns(prev =>
      prev.map(campaign =>
        campaign.id === activeCampaign.id ? updatedCampaign : campaign
      )
    );
  };

  // Add audience to campaign
  const addAudienceToCampaign = async (audience: AudienceSegment) => {
    if (!activeCampaign) return;

    try {
      setIsCampaignOperationLoading(true);

      const updatedAudiences = [...activeCampaign.audiences, audience];

      const { error } = await supabase
        .from('campaigns')
        .update({ audiences: updatedAudiences })
        .eq('id', activeCampaign.id);

      if (error) throw error;

      updateCampaignDetails({ audiences: updatedAudiences });

    } catch (err) {
      console.error('[CampaignContext] Error adding audience:', err);
      throw err;
    } finally {
      setIsCampaignOperationLoading(false);
    }
  };

  // Remove audience from campaign
  const removeAudienceFromCampaign = async (audienceId: string) => {
    if (!activeCampaign) return;

    try {
      setIsCampaignOperationLoading(true);

      const updatedAudiences = activeCampaign.audiences.filter(a => a.id !== audienceId);

      const { error } = await supabase
        .from('campaigns')
        .update({ audiences: updatedAudiences })
        .eq('id', activeCampaign.id);

      if (error) throw error;

      updateCampaignDetails({ audiences: updatedAudiences });

    } catch (err) {
      console.error('[CampaignContext] Error removing audience:', err);
      throw err;
    } finally {
      setIsCampaignOperationLoading(false);
    }
  };

  // Submit campaign request
  const submitCampaignRequest = async (notes?: string) => {
    if (!activeCampaign) return;

    try {
      setIsCampaignOperationLoading(true);

      // Create audience request
      const { data, error } = await supabase
        .from('audience_requests')
        .insert({
          campaign_id: activeCampaign.id,
          client_id: activeCampaign.clientId,
          audiences: activeCampaign.audiences,
          platforms: activeCampaign.platforms,
          budget: activeCampaign.budget,
          start_date: activeCampaign.startDate,
          end_date: activeCampaign.endDate,
          notes: notes || null,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      // Update campaign status
      const { error: updateError } = await supabase
        .from('campaigns')
        .update({ 
          status: 'submitted',
          request_id: data.id
        })
        .eq('id', activeCampaign.id);

      if (updateError) throw updateError;

      updateCampaignDetails({ status: 'submitted', requestId: data.id });
      await fetchRequests();

    } catch (err) {
      console.error('[CampaignContext] Error submitting request:', err);
      throw err;
    } finally {
      setIsCampaignOperationLoading(false);
    }
  };

  // Delete campaign
  const deleteCampaign = async (campaignId: string) => {
    try {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;

      setCampaigns(prev => prev.filter(c => c.id !== campaignId));
      if (activeCampaign?.id === campaignId) {
        setActiveCampaign(null);
      }

    } catch (err) {
      console.error('[CampaignContext] Error deleting campaign:', err);
      throw err;
    }
  };

  // Archive campaign
  const archiveCampaign = async (campaignId: string) => {
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ archived: true })
        .eq('id', campaignId);

      if (error) throw error;

      setCampaigns(prev =>
        prev.map(c => c.id === campaignId ? { ...c, archived: true } : c)
      );

    } catch (err) {
      console.error('[CampaignContext] Error archiving campaign:', err);
      throw err;
    }
  };

  // Unarchive campaign
  const unarchiveCampaign = async (campaignId: string) => {
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ archived: false })
        .eq('id', campaignId);

      if (error) throw error;

      setCampaigns(prev =>
        prev.map(c => c.id === campaignId ? { ...c, archived: false } : c)
      );

    } catch (err) {
      console.error('[CampaignContext] Error unarchiving campaign:', err);
      throw err;
    }
  };

  // Request operations
  const approveRequest = async (requestId: string, notes?: string) => {
    try {
      const { error } = await supabase
        .from('audience_requests')
        .update({ 
          status: 'approved',
          notes: notes || null
        })
        .eq('id', requestId);

      if (error) throw error;

      await refreshRequests();

    } catch (err) {
      console.error('[CampaignContext] Error approving request:', err);
      throw err;
    }
  };

  const rejectRequest = async (requestId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('audience_requests')
        .update({ 
          status: 'rejected',
          notes: reason
        })
        .eq('id', requestId);

      if (error) throw error;

      await refreshRequests();

    } catch (err) {
      console.error('[CampaignContext] Error rejecting request:', err);
      throw err;
    }
  };

  const archiveRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('audience_requests')
        .update({ archived: true })
        .eq('id', requestId);

      if (error) throw error;

      await refreshRequests();

    } catch (err) {
      console.error('[CampaignContext] Error archiving request:', err);
      throw err;
    }
  };

  const deleteRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('audience_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      await refreshRequests();

    } catch (err) {
      console.error('[CampaignContext] Error deleting request:', err);
      throw err;
    }
  };

  const unarchiveRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('audience_requests')
        .update({ archived: false })
        .eq('id', requestId);

      if (error) throw error;

      await refreshRequests();

    } catch (err) {
      console.error('[CampaignContext] Error unarchiving request:', err);
      throw err;
    }
  };

  // Fetch campaign comments
  const fetchCampaignComments = async (campaignId: string) => {
    try {
      const { data, error } = await supabase
        .from('campaign_comments')
        .select(`
          *,
          users!campaign_comments_user_id_fkey (
            name,
            role
          )
        `)
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const transformedComments: CampaignComment[] = (data || []).map(comment => ({
        id: comment.id,
        campaignId: comment.campaign_id,
        userId: comment.user_id,
        parentCommentId: comment.parent_comment_id,
        content: comment.content,
        createdAt: comment.created_at,
        updatedAt: comment.updated_at,
        user: comment.users
      }));

      setComments(transformedComments);

    } catch (err) {
      console.error('[CampaignContext] Error fetching comments:', err);
      throw err;
    }
  };

  // Add comment
  const addComment = async (campaignId: string, content: string, parentCommentId?: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('campaign_comments')
        .insert({
          campaign_id: campaignId,
          user_id: user.id,
          parent_comment_id: parentCommentId || null,
          content
        });

      if (error) throw error;

      await fetchCampaignComments(campaignId);

    } catch (err) {
      console.error('[CampaignContext] Error adding comment:', err);
      throw err;
    }
  };

  // Fetch workflow history
  const fetchWorkflowHistory = async (campaignId: string) => {
    try {
      const { data, error } = await supabase
        .from('campaign_workflow_history')
        .select(`
          *,
          users!campaign_workflow_history_user_id_fkey (
            name,
            role
          )
        `)
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedHistory: CampaignWorkflowHistory[] = (data || []).map(item => ({
        id: item.id,
        campaignId: item.campaign_id,
        userId: item.user_id,
        fromStatus: item.from_status,
        toStatus: item.to_status,
        notes: item.notes,
        createdAt: item.created_at,
        user: item.users
      }));

      setWorkflowHistory(transformedHistory);

    } catch (err) {
      console.error('[CampaignContext] Error fetching workflow history:', err);
      throw err;
    }
  };

  // Fetch activity log
  const fetchActivityLog = async (campaignId: string) => {
    try {
      const { data, error } = await supabase
        .from('campaign_activity_log')
        .select(`
          *,
          users!campaign_activity_log_user_id_fkey (
            name,
            role
          )
        `)
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedActivity: CampaignActivity[] = (data || []).map(item => ({
        id: item.id,
        campaignId: item.campaign_id,
        userId: item.user_id,
        actionType: item.action_type,
        actionDetails: item.action_details || {},
        oldValues: item.old_values || {},
        newValues: item.new_values || {},
        createdAt: item.created_at,
        user: item.users
      }));

      setActivityLog(transformedActivity);

    } catch (err) {
      console.error('[CampaignContext] Error fetching activity log:', err);
      throw err;
    }
  };

  // Update campaign status
  const updateCampaignStatus = async (campaignId: string, status: string, notes?: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ status })
        .eq('id', campaignId);

      if (error) throw error;

      // Add to workflow history
      const { error: historyError } = await supabase
        .from('campaign_workflow_history')
        .insert({
          campaign_id: campaignId,
          user_id: user.id,
          to_status: status,
          notes: notes || null
        });

      if (historyError) throw historyError;

      // Update local state
      setCampaigns(prev =>
        prev.map(c => c.id === campaignId ? { ...c, status } : c)
      );

      if (activeCampaign?.id === campaignId) {
        setActiveCampaign(prev => prev ? { ...prev, status } : null);
      }

      // Refresh related data
      await fetchWorkflowHistory(campaignId);

    } catch (err) {
      console.error('[CampaignContext] Error updating campaign status:', err);
      throw err;
    }
  };

  // Refresh all requests
  const refreshRequests = async () => {
    await Promise.all([
      fetchRequests(),
      fetchPendingRequests(),
      fetchRejectedRequests(),
      fetchArchivedRequests()
    ]);
  };

  // Utility functions
  const getCampaignById = (id: string) => campaigns.find(c => c.id === id);

  const getCampaignStatusCategory = (status: string): 'pending' | 'active' | 'completed' => {
    switch (status) {
      case 'draft':
      case 'submitted':
      case 'pending_review':
        return 'pending';
      case 'approved':
      case 'in_progress':
      case 'waiting_on_client':
      case 'delivered':
      case 'live':
      case 'paused':
        return 'active';
      case 'completed':
      case 'failed':
        return 'completed';
      default:
        return 'pending';
    }
  };

  const setFilters = (newFilters: Partial<CampaignFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  };

  const waitForCampaignReady = async () => {
    return new Promise<void>((resolve) => {
      if (!isCampaignOperationLoading) {
        resolve();
      } else {
        const checkReady = () => {
          if (!isCampaignOperationLoading) {
            resolve();
          } else {
            setTimeout(checkReady, 100);
          }
        };
        checkReady();
      }
    });
  };

  // Filter campaigns based on current filters
  const filteredCampaigns = campaigns.filter(campaign => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const searchableText = `${campaign.name} ${campaign.users?.name || ''} ${campaign.users?.companies?.name || ''}`.toLowerCase();
      if (!searchableText.includes(searchLower)) {
        return false;
      }
    }

    // Status filter
    if (filters.status && campaign.status !== filters.status) {
      return false;
    }

    // Date range filter
    if (filters.dateRange.start && campaign.createdAt < filters.dateRange.start) {
      return false;
    }
    if (filters.dateRange.end && campaign.createdAt > filters.dateRange.end) {
      return false;
    }

    // Agency filter (for super admins)
    if (filters.agency && isSuperAdmin) {
      const companyName = campaign.users?.companies?.name || '';
      if (!companyName.toLowerCase().includes(filters.agency.toLowerCase())) {
        return false;
      }
    }

    return true;
  });

  // Derived state
  const activeCampaigns = campaigns.filter(c => getCampaignStatusCategory(c.status) === 'active' && !c.archived);
  const completedCampaigns = campaigns.filter(c => getCampaignStatusCategory(c.status) === 'completed' && !c.archived);

  // Initialize data on mount
  useEffect(() => {
    if (user) {
      console.log('[CampaignContext] User detected, initializing data for:', user.email, 'isSuperAdmin:', isSuperAdmin);
      Promise.all([
        fetchCampaigns(),
        fetchRequests(),
        fetchPendingRequests(),
        fetchRejectedRequests(),
        fetchArchivedRequests()
      ]).then(() => {
        setHasActiveCampaignLoaded(true);
      });
    }
  }, [user, isSuperAdmin, fetchCampaigns, fetchRequests, fetchPendingRequests, fetchRejectedRequests, fetchArchivedRequests]);

  return (
    <CampaignContext.Provider value={{
      campaigns,
      activeCampaign,
      filteredCampaigns,
      activeCampaigns,
      completedCampaigns,
      requests,
      pendingRequests,
      rejectedRequests,
      archivedRequests,
      comments,
      workflowHistory,
      activityLog,
      loading,
      error,
      filters,
      hasActiveCampaignLoaded,
      isCampaignOperationLoading,
      initializeCampaign,
      updateCampaignDetails,
      addAudienceToCampaign,
      removeAudienceFromCampaign,
      submitCampaignRequest,
      deleteCampaign,
      archiveCampaign,
      unarchiveCampaign,
      approveRequest,
      rejectRequest,
      archiveRequest,
      deleteRequest,
      unarchiveRequest,
      addComment,
      updateCampaignStatus,
      fetchCampaigns,
      fetchRequests,
      fetchPendingRequests,
      fetchRejectedRequests,
      fetchArchivedRequests,
      fetchCampaignComments,
      fetchWorkflowHistory,
      fetchActivityLog,
      refreshRequests,
      getCampaignById,
      getCampaignStatusCategory,
      setFilters,
      waitForCampaignReady
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