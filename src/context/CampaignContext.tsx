import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Campaign, AudienceSegment, AudienceRequest, CampaignComment, CampaignWorkflowHistory, CampaignFilters, CampaignActivity, CampaignStatusCategory } from '../types';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

interface CampaignContextType {
  // Data
  campaigns: Campaign[];
  requests: AudienceRequest[];
  activeCampaign: Campaign | null;
  comments: CampaignComment[];
  workflowHistory: CampaignWorkflowHistory[];
  activityLog: CampaignActivity[];
  filters: CampaignFilters;
  loading: boolean;

  // NEW: Campaign operation state management
  hasActiveCampaignLoaded: boolean;
  isCampaignOperationLoading: boolean;
  waitForCampaignReady: () => Promise<void>;

  // Campaign Management
  initializeCampaign: (name: string) => Promise<void>;
  addAudienceToCampaign: (audience: AudienceSegment) => Promise<void>;
  removeAudienceFromCampaign: (audienceId: string) => Promise<void>;
  updateCampaignDetails: (details: Partial<Campaign>) => Promise<void>;
  updateCampaignStatus: (campaignId: string, status: string, notes?: string) => Promise<void>;
  submitCampaignRequest: (notes?: string) => Promise<void>;

  // Data Access
  getCampaignById: (id: string) => Campaign | undefined;
  getRequestById: (id: string) => AudienceRequest | undefined;
  
  // Comments & Activity
  fetchCampaignComments: (campaignId: string) => Promise<void>;
  addComment: (campaignId: string, content: string, parentCommentId?: string) => Promise<void>;
  fetchWorkflowHistory: (campaignId: string) => Promise<void>;
  fetchActivityLog: (campaignId: string) => Promise<void>;

  // Filtering & Search
  setFilters: (filters: Partial<CampaignFilters>) => void;
  filteredCampaigns: Campaign[];
  
  // Requests Management
  refreshRequests: () => Promise<void>;
  approveRequest: (requestId: string, notes?: string) => Promise<void>;
  rejectRequest: (requestId: string, reason?: string) => Promise<void>;
  
  // New: Separated data access
  pendingRequests: AudienceRequest[];
  rejectedRequests: AudienceRequest[];
  archivedRequests: AudienceRequest[];
  approvedCampaigns: Campaign[];
  activeCampaigns: Campaign[];
  completedCampaigns: Campaign[];
  
  // New: Status categorization
  getCampaignStatusCategory: (status: string) => CampaignStatusCategory;
  getCampaignsByCategory: (category: CampaignStatusCategory) => Campaign[];
  
  // Archive/Delete functionality
  archiveRequest: (requestId: string) => Promise<void>;
  deleteRequest: (requestId: string) => Promise<void>;
  unarchiveRequest: (requestId: string) => Promise<void>;
  
  // Campaign Archive/Delete functionality
  deleteCampaign: (campaignId: string) => Promise<void>;
  archiveCampaign: (campaignId: string) => Promise<void>;
  unarchiveCampaign: (campaignId: string) => Promise<void>;
}

const CampaignContext = createContext<CampaignContextType | undefined>(undefined);

export const CampaignProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [requests, setRequests] = useState<AudienceRequest[]>([]);
  const [comments, setComments] = useState<CampaignComment[]>([]);
  const [workflowHistory, setWorkflowHistory] = useState<CampaignWorkflowHistory[]>([]);
  const [activityLog, setActivityLog] = useState<CampaignActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFiltersState] = useState<CampaignFilters>({
    search: '',
    status: '',
    dateRange: { start: '', end: '' },
    agency: '',
    statusCategory: ''
  });

  // NEW: Campaign operation state management
  const [hasActiveCampaignLoaded, setHasActiveCampaignLoaded] = useState(false);
  const [isCampaignOperationLoading, setIsCampaignOperationLoading] = useState(false);

  // Helper function to get user's timezone
  const getUserTimezone = () => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
      console.warn('Could not detect timezone, using UTC');
      return 'UTC';
    }
  };

  // Helper function to create timezone-aware timestamp
  const createTimestamp = () => {
    const now = new Date();
    const timezone = getUserTimezone();
    return {
      timestamp: now.toISOString(),
      timezone,
      userLocalTime: now.toLocaleString('en-US', { timeZone: timezone })
    };
  };

  // NEW: Wait for campaign to be ready
  const waitForCampaignReady = useCallback((): Promise<void> => {
    console.log('[CampaignContext] waitForCampaignReady - Starting wait');
    console.log('[CampaignContext] waitForCampaignReady - hasActiveCampaignLoaded:', hasActiveCampaignLoaded);
    console.log('[CampaignContext] waitForCampaignReady - activeCampaign:', activeCampaign);
    
    return new Promise((resolve) => {
      if (hasActiveCampaignLoaded && activeCampaign) {
        console.log('[CampaignContext] waitForCampaignReady - Campaign already ready, resolving immediately');
        resolve();
        return;
      }

      console.log('[CampaignContext] waitForCampaignReady - Campaign not ready, setting up polling');
      const checkInterval = setInterval(() => {
        console.log('[CampaignContext] waitForCampaignReady - Polling check:', {
          hasActiveCampaignLoaded,
          activeCampaign: activeCampaign?.name || 'null'
        });
        
        if (hasActiveCampaignLoaded && activeCampaign) {
          console.log('[CampaignContext] waitForCampaignReady - Campaign ready, clearing interval and resolving');
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      // Timeout after 10 seconds to prevent infinite waiting
      setTimeout(() => {
        console.warn('[CampaignContext] waitForCampaignReady - Timeout reached, resolving anyway');
        clearInterval(checkInterval);
        resolve();
      }, 10000);
    });
  }, [hasActiveCampaignLoaded, activeCampaign]);

  // Helper function to create notifications for relevant users
  const createNotification = async (
    title: string, 
    message: string, 
    targetUserIds: string[], 
    campaignId?: string
  ) => {
    try {
      const { timestamp } = createTimestamp();
      
      // FIXED: Filter out null, undefined, and empty string user IDs
      const validUserIds = targetUserIds.filter(userId => userId && typeof userId === 'string' && userId.trim() !== '');
      
      if (validUserIds.length === 0) {
        console.warn('No valid user IDs provided for notification');
        return;
      }
      
      const notifications = validUserIds.map(userId => ({
        user_id: userId,
        title,
        message,
        read: false,
        campaign_id: campaignId || null,
        created_at: timestamp
      }));

      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) {
        console.error('Error creating notifications:', error);
      }
    } catch (error) {
      console.error('Error in createNotification:', error);
    }
  };

  // Helper function to get admin user IDs
  const getAdminUserIds = async (): Promise<string[]> => {
    try {
      const { data: admins, error } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin');

      if (error) {
        console.error('Error fetching admin users:', error);
        return [];
      }

      return admins?.map(admin => admin.id) || [];
    } catch (error) {
      console.error('Error in getAdminUserIds:', error);
      return [];
    }
  };

  // Helper function to get company team member IDs
  const getCompanyTeamIds = async (companyId: string): Promise<string[]> => {
    try {
      const { data: teamMembers, error } = await supabase
        .from('users')
        .select('id')
        .eq('company_id', companyId)
        .neq('id', user?.id); // Exclude current user

      if (error) {
        console.error('Error fetching team members:', error);
        return [];
      }

      return teamMembers?.map(member => member.id) || [];
    } catch (error) {
      console.error('Error in getCompanyTeamIds:', error);
      return [];
    }
  };

  // Status categorization helper
  const getCampaignStatusCategory = useCallback((status: string): CampaignStatusCategory => {
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
  }, []);

  // Get campaigns by category
  const getCampaignsByCategory = useCallback((category: CampaignStatusCategory): Campaign[] => {
    return campaigns.filter(campaign => getCampaignStatusCategory(campaign.status) === category);
  }, [campaigns, getCampaignStatusCategory]);

  // Computed values for separated data access
  const pendingRequests = requests.filter(request => request.status === 'pending' && !request.archived);
  const rejectedRequests = requests.filter(request => request.status === 'rejected' && !request.archived);
  const archivedRequests = requests.filter(request => request.archived === true);
  
  // FIXED: Only show campaigns that have been approved by admin
  const approvedCampaigns = campaigns.filter(campaign => 
    ['approved', 'in_progress', 'waiting_on_client', 'delivered', 'live', 'paused', 'completed'].includes(campaign.status)
  );
  
  const activeCampaigns = getCampaignsByCategory('active');
  const completedCampaigns = getCampaignsByCategory('completed');

  // NEW: Enhanced campaign fetching with company account data
  const fetchCampaignsWithAccounts = async () => {
    try {
      setLoading(true);
      
      // For non-admin users, only fetch their own campaigns that are approved or in progress
      // For admin users, fetch all campaigns
      let campaignQuery = supabase
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

      // If not admin, only show user's own campaigns
      if (!isAdmin) {
        campaignQuery = campaignQuery.eq('client_id', user?.id);
      }

      const { data: campaignData, error: campaignError } = await campaignQuery;

      if (campaignError) throw campaignError;

      // Fetch company account data for campaigns that have selectedCompanyAccountId
      const campaignIds = (campaignData || [])
        .filter(c => c.selected_company_account_id)
        .map(c => c.selected_company_account_id);

      let accountsMap: Record<string, any> = {};
      if (campaignIds.length > 0) {
        const { data: accountsData, error: accountsError } = await supabase
          .from('company_account_ids')
          .select('*')
          .in('id', campaignIds);

        if (!accountsError && accountsData) {
          accountsMap = accountsData.reduce((acc, account) => {
            acc[account.id] = {
              id: account.id,
              companyId: account.company_id,
              platform: account.platform,
              accountId: account.account_id,
              accountName: account.account_name,
              isActive: account.is_active,
              createdAt: account.created_at,
              updatedAt: account.updated_at
            };
            return acc;
          }, {} as Record<string, any>);
        }
      }

      // Transform and enrich campaign data
      const enrichedCampaigns = (campaignData || []).map(campaign => ({
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
        selectedCompanyAccountId: campaign.selected_company_account_id,
        selectedCompanyAccount: campaign.selected_company_account_id ? accountsMap[campaign.selected_company_account_id] : undefined,
        advertiserName: campaign.selected_company_account_id ? accountsMap[campaign.selected_company_account_id]?.accountName : undefined,
        users: campaign.users
      }));

      setCampaigns(enrichedCampaigns);
    } catch (error) {
      console.error('Error fetching campaign data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch campaigns and requests on mount
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      await fetchCampaignsWithAccounts();

      // Fetch requests for admin users
      if (isAdmin) {
        await refreshRequests();
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

  // NEW: Enhanced hydration logic
  useEffect(() => {
    console.log('[CampaignContext] Hydration effect - user:', user?.id);
    
    if (!user) {
      console.log('[CampaignContext] Hydration effect - No user, skipping hydration');
      setHasActiveCampaignLoaded(true);
      return;
    }

    const hydrateActiveCampaign = () => {
      console.log('[CampaignContext] Hydration effect - Starting hydration');
      
      try {
        const storedCampaignId = localStorage.getItem('activeCampaignId');
        console.log('[CampaignContext] Hydration effect - Stored campaign ID:', storedCampaignId);
        
        if (storedCampaignId && campaigns.length > 0) {
          const campaign = campaigns.find(c => c.id === storedCampaignId);
          console.log('[CampaignContext] Hydration effect - Found campaign:', campaign?.name);
          
          if (campaign) {
            setActiveCampaign(campaign);
            console.log('[CampaignContext] Hydration effect - Set active campaign, marking as loaded');
            setHasActiveCampaignLoaded(true);
            return;
          }
        }
        
        console.log('[CampaignContext] Hydration effect - No stored campaign or campaign not found, marking as loaded');
        setHasActiveCampaignLoaded(true);
      } catch (error) {
        console.error('[CampaignContext] Hydration effect - Error during hydration:', error);
        setHasActiveCampaignLoaded(true);
      }
    };

    // Only hydrate if campaigns have been loaded
    if (campaigns.length > 0 || !loading) {
      hydrateActiveCampaign();
    }
  }, [user, campaigns, loading]);

  const refreshRequests = async () => {
    try {
      const { data: requestData, error: requestError } = await supabase
        .from('audience_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (requestError) throw requestError;
      
      // Transform the data to match TypeScript interface (snake_case to camelCase)
      const transformedRequests: AudienceRequest[] = (requestData || []).map(request => ({
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
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  };

  const approveRequest = async (requestId: string, notes?: string) => {
    if (!user || !isAdmin) {
      throw new Error('Only admins can approve requests');
    }

    try {
      const { timestamp } = createTimestamp();
      
      // FIXED: Ensure the request exists in local state before proceeding
      const request = requests.find(r => r.id === requestId);
      if (!request) {
        throw new Error('Request not found in local state - data inconsistency detected');
      }

      // FIXED: Add explicit validation for required fields
      if (!request.clientId) {
        throw new Error('Request is missing client_id - cannot create campaign');
      }

      console.log('Approving request:', requestId, 'for client:', request.clientId);

      // FIXED: Create campaign without referencing request_id initially to avoid foreign key constraint
      const newCampaignData = {
        name: `Campaign ${new Date().toLocaleDateString()}`,
        client_id: request.clientId,
        audiences: request.audiences || [],
        platforms: request.platforms || { social: [], programmatic: [] },
        budget: request.budget || 0,
        start_date: request.startDate,
        end_date: request.endDate,
        status: 'approved',
        approved_at: timestamp,
        created_at: timestamp,
        updated_at: timestamp,
        archived: false
        // REMOVED: request_id reference to avoid foreign key constraint
      };

      const { data: newCampaign, error: createError } = await supabase
        .from('campaigns')
        .insert([newCampaignData])
        .select()
        .single();

      if (createError) {
        console.error('Error creating campaign:', createError);
        throw new Error(`Failed to create campaign: ${createError.message}`);
      }

      const campaignId = newCampaign.id;
      console.log('Created new campaign with ID:', campaignId);

      // FIXED: Now update the campaign to include the request_id reference after both records exist
      const { error: campaignUpdateError } = await supabase
        .from('campaigns')
        .update({ request_id: requestId })
        .eq('id', campaignId);

      if (campaignUpdateError) {
        console.error('Error updating campaign with request_id:', campaignUpdateError);
        // Don't throw here as the campaign was created successfully
      }

      // Update request status to approved
      const { error: requestError } = await supabase
        .from('audience_requests')
        .update({ 
          status: 'approved',
          notes: notes || null,
          updated_at: timestamp
        })
        .eq('id', requestId);

      if (requestError) {
        console.error('Error updating request:', requestError);
        throw requestError;
      }

      // Add workflow history entry with valid campaign_id
      try {
        const { error: workflowError } = await supabase
          .from('campaign_workflow_history')
          .insert({
            campaign_id: campaignId,
            user_id: user.id,
            from_status: 'pending_review',
            to_status: 'approved',
            notes: notes || 'Request approved by admin',
            created_at: timestamp
          });

        if (workflowError) {
          console.error('Workflow history error:', workflowError);
          // Don't throw here, as the main operation succeeded
        }
      } catch (workflowErr) {
        console.error('Non-critical workflow history error:', workflowErr);
      }

      // Create notification for client and team
      try {
        const notificationTargets = [request.clientId];
        
        // FIXED: Use maybeSingle() instead of single() to handle cases where user doesn't exist
        const { data: clientUser } = await supabase
          .from('users')
          .select('company_id')
          .eq('id', request.clientId)
          .maybeSingle();

        if (clientUser?.company_id) {
          const teamIds = await getCompanyTeamIds(clientUser.company_id);
          notificationTargets.push(...teamIds);
        }

        await createNotification(
          'Campaign Request Approved! 🎉',
          `Great news! Your campaign request has been approved and is now active.${notes ? ` Note: ${notes}` : ''}`,
          [...new Set(notificationTargets)], // Remove duplicates
          campaignId
        );
      } catch (notificationErr) {
        console.error('Non-critical notification error:', notificationErr);
      }

      // Refresh data
      await refreshRequests();
      
      // Refresh campaigns to show the updated status
      await fetchCampaignsWithAccounts();

      console.log('Request approved successfully:', requestId);

    } catch (error) {
      console.error('Error approving request:', error);
      throw error;
    }
  };

  const rejectRequest = async (requestId: string, reason?: string) => {
    if (!user || !isAdmin) {
      throw new Error('Only admins can reject requests');
    }

    try {
      const { timestamp } = createTimestamp();
      
      // FIXED: Ensure the request exists in local state before proceeding
      const request = requests.find(r => r.id === requestId);
      if (!request) {
        throw new Error('Request not found in local state - data inconsistency detected');
      }

      // FIXED: Add validation for required fields
      if (!request.clientId) {
        throw new Error('Request is missing client_id');
      }

      // Check if campaign exists (only if campaignId is present)
      let campaign = null;
      if (request.campaignId) {
        const { data: campaignData, error: campaignFetchError } = await supabase
          .from('campaigns')
          .select('id, name, client_id')
          .eq('id', request.campaignId)
          .maybeSingle(); // Use maybeSingle instead of single to avoid errors when no rows found

        if (!campaignFetchError && campaignData) {
          campaign = campaignData;
        }
      }

      // Update request status to rejected
      const { error: requestError } = await supabase
        .from('audience_requests')
        .update({ 
          status: 'rejected',
          notes: reason || null,
          updated_at: timestamp
        })
        .eq('id', requestId);

      if (requestError) throw requestError;

      // If campaign exists, update it to failed status
      if (campaign && request.campaignId) {
        const { error: campaignError } = await supabase
          .from('campaigns')
          .update({ 
            status: 'failed',
            updated_at: timestamp
          })
          .eq('id', request.campaignId);

        if (campaignError) {
          console.error('Error updating campaign status:', campaignError);
          // Don't throw here, as the main operation succeeded
        }

        // Add workflow history entry with proper campaign_id
        try {
          const { error: workflowError } = await supabase
            .from('campaign_workflow_history')
            .insert({
              campaign_id: request.campaignId,
              user_id: user.id,
              from_status: 'pending_review',
              to_status: 'failed',
              notes: reason || 'Request rejected by admin',
              created_at: timestamp
            });

          if (workflowError) {
            console.error('Workflow history error:', workflowError);
            // Don't throw here, as the main operation succeeded
          }
        } catch (workflowErr) {
          console.error('Non-critical workflow history error:', workflowErr);
        }
      }

      // Create notification for client and team
      try {
        const notificationTargets = [request.clientId];
        
        if (campaign?.client_id) {
          // FIXED: Use maybeSingle() instead of single() to handle cases where user doesn't exist
          const { data: clientUser } = await supabase
            .from('users')
            .select('company_id')
            .eq('id', campaign.client_id)
            .maybeSingle();

          if (clientUser?.company_id) {
            const teamIds = await getCompanyTeamIds(clientUser.company_id);
            notificationTargets.push(...teamIds);
          }
        }

        const campaignName = campaign?.name || `Request ${requestId}`;
        await createNotification(
          'Campaign Request Needs Attention',
          `Your campaign request requires some adjustments before we can proceed.${reason ? ` Reason: ${reason}` : ''} Please review and resubmit when ready.`,
          [...new Set(notificationTargets)], // Remove duplicates
          request.campaignId || undefined
        );
      } catch (notificationErr) {
        console.error('Non-critical notification error:', notificationErr);
      }

      // Refresh data
      await refreshRequests();
      
      // Refresh campaigns to show the updated status
      await fetchCampaignsWithAccounts();

    } catch (error) {
      console.error('Error rejecting request:', error);
      throw error;
    }
  };

  const archiveRequest = async (requestId: string) => {
    try {
      const { timestamp } = createTimestamp();
      
      const { error } = await supabase
        .from('audience_requests')
        .update({ 
          archived: true,
          updated_at: timestamp
        })
        .eq('id', requestId);

      if (error) throw error;
      await refreshRequests();
    } catch (error) {
      console.error('Error archiving request:', error);
      throw error;
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
    } catch (error) {
      console.error('Error deleting request:', error);
      throw error;
    }
  };

  const unarchiveRequest = async (requestId: string) => {
    try {
      const { timestamp } = createTimestamp();
      
      const { error } = await supabase
        .from('audience_requests')
        .update({ 
          archived: false,
          updated_at: timestamp
        })
        .eq('id', requestId);

      if (error) throw error;
      await refreshRequests();
    } catch (error) {
      console.error('Error unarchiving request:', error);
      throw error;
    }
  };

  // Campaign Archive/Delete functionality
  const deleteCampaign = async (campaignId: string) => {
    try {
      // Delete associated requests first
      await supabase
        .from('audience_requests')
        .delete()
        .eq('campaign_id', campaignId);

      // Delete the campaign
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;

      // Update local state
      setCampaigns(prev => prev.filter(c => c.id !== campaignId));
      
      // Clear active campaign if it was deleted
      if (activeCampaign?.id === campaignId) {
        setActiveCampaign(null);
        localStorage.removeItem('activeCampaignId');
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
      throw error;
    }
  };

  const archiveCampaign = async (campaignId: string) => {
    try {
      const { timestamp } = createTimestamp();
      
      const { error } = await supabase
        .from('campaigns')
        .update({ 
          archived: true,
          updated_at: timestamp
        })
        .eq('id', campaignId);

      if (error) throw error;

      // Update local state
      setCampaigns(prev => 
        prev.map(c => c.id === campaignId ? { ...c, archived: true, updatedAt: timestamp } : c)
      );
    } catch (error) {
      console.error('Error archiving campaign:', error);
      throw error;
    }
  };

  const unarchiveCampaign = async (campaignId: string) => {
    try {
      const { timestamp } = createTimestamp();
      
      const { error } = await supabase
        .from('campaigns')
        .update({ 
          archived: false,
          updated_at: timestamp
        })
        .eq('id', campaignId);

      if (error) throw error;

      // Update local state
      setCampaigns(prev => 
        prev.map(c => c.id === campaignId ? { ...c, archived: false, updatedAt: timestamp } : c)
      );
    } catch (error) {
      console.error('Error unarchiving campaign:', error);
      throw error;
    }
  };

  const initializeCampaign = async (name: string) => {
    if (!user) return;

    console.log('[CampaignContext] initializeCampaign - Starting for:', name);
    setIsCampaignOperationLoading(true);

    try {
      const { timestamp } = createTimestamp();
      const currentDate = new Date().toISOString().split('T')[0];

      // FIXED: Don't manually set the ID - let Supabase generate it
      const newCampaignData = {
        name,
        client_id: user.id,
        audiences: [],
        platforms: { social: [], programmatic: [] },
        budget: 0,
        start_date: currentDate,
        end_date: currentDate,
        status: 'draft',
        created_at: timestamp,
        updated_at: timestamp,
        archived: false
      };

      const { data, error } = await supabase
        .from('campaigns')
        .insert([newCampaignData])
        .select()
        .single();

      if (error) throw error;

      // Create the campaign object with the generated ID
      const createdCampaign: Campaign = {
        id: data.id,
        name: data.name,
        clientId: data.client_id,
        audiences: data.audiences || [],
        platforms: data.platforms || { social: [], programmatic: [] },
        budget: data.budget || 0,
        startDate: data.start_date,
        endDate: data.end_date,
        status: data.status,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        archived: data.archived || false
      };

      console.log('[CampaignContext] initializeCampaign - Created campaign:', createdCampaign.id);

      // Update state
      setCampaigns(prev => [createdCampaign, ...prev]);
      setActiveCampaign(createdCampaign);
      
      // Store in localStorage for persistence
      localStorage.setItem('activeCampaignId', createdCampaign.id);
      
      console.log('[CampaignContext] initializeCampaign - Updated state and localStorage');

      // Notify team members about new campaign
      if (user.companyId) {
        const teamIds = await getCompanyTeamIds(user.companyId);
        if (teamIds.length > 0) {
          await createNotification(
            'New Campaign Created',
            `${user.name} created a new campaign: "${createdCampaign.name}"`,
            teamIds,
            createdCampaign.id
          );
        }
      }
    } catch (error) {
      console.error('[CampaignContext] initializeCampaign - Error:', error);
      throw error;
    } finally {
      setIsCampaignOperationLoading(false);
      console.log('[CampaignContext] initializeCampaign - Completed');
    }
  };

  const addAudienceToCampaign = async (audience: AudienceSegment) => {
    if (!activeCampaign) {
      console.warn('No active campaign to add audience to');
      return;
    }

    console.log('[CampaignContext] addAudienceToCampaign - Starting for audience:', audience.id);
    setIsCampaignOperationLoading(true);

    try {
      if (activeCampaign.audiences.some(a => a.id === audience.id)) {
        console.log('Audience already in campaign:', audience.id);
        return;
      }

      const { timestamp } = createTimestamp();
      const updatedCampaign = {
        ...activeCampaign,
        audiences: [...activeCampaign.audiences, audience],
        updatedAt: timestamp
      };

      const { error } = await supabase
        .from('campaigns')
        .update({
          audiences: updatedCampaign.audiences,
          updated_at: timestamp
        })
        .eq('id', activeCampaign.id);

      if (error) throw error;

      setActiveCampaign(updatedCampaign);
      setCampaigns(prev => 
        prev.map(c => c.id === updatedCampaign.id ? updatedCampaign : c)
      );

      // Log activity
      await supabase
        .from('campaign_activity_log')
        .insert({
          campaign_id: activeCampaign.id,
          user_id: user?.id,
          action_type: 'audience_added',
          action_details: {
            audience_name: audience.name,
            audience_id: audience.id
          },
          created_at: timestamp
        });

      console.log('[CampaignContext] addAudienceToCampaign - Successfully added audience:', audience.id);
    } catch (error) {
      console.error('[CampaignContext] addAudienceToCampaign - Error:', error);
      throw error;
    } finally {
      setIsCampaignOperationLoading(false);
    }
  };

  const removeAudienceFromCampaign = async (audienceId: string) => {
    if (!activeCampaign) {
      console.warn('No active campaign to remove audience from');
      return;
    }

    try {
      const { timestamp } = createTimestamp();
      const removedAudience = activeCampaign.audiences.find(a => a.id === audienceId);
      const updatedCampaign = {
        ...activeCampaign,
        audiences: activeCampaign.audiences.filter(a => a.id !== audienceId),
        updatedAt: timestamp
      };

      const { error } = await supabase
        .from('campaigns')
        .update({
          audiences: updatedCampaign.audiences,
          updated_at: timestamp
        })
        .eq('id', activeCampaign.id);

      if (error) throw error;

      setActiveCampaign(updatedCampaign);
      setCampaigns(prev => 
        prev.map(c => c.id === updatedCampaign.id ? updatedCampaign : c)
      );

      // Log activity
      if (removedAudience) {
        await supabase
          .from('campaign_activity_log')
          .insert({
            campaign_id: activeCampaign.id,
            user_id: user?.id,
            action_type: 'audience_removed',
            action_details: {
              audience_name: removedAudience.name,
              audience_id: removedAudience.id
            },
            created_at: timestamp
          });
      }

      console.log('Successfully removed audience:', audienceId);
    } catch (error) {
      console.error('Error removing audience from campaign:', error);
    }
  };

  const updateCampaignDetails = async (details: Partial<Campaign>) => {
    if (!activeCampaign) return;

    try {
      const { timestamp } = createTimestamp();
      const updatedCampaign = {
        ...activeCampaign,
        ...details,
        updatedAt: timestamp
      };

      const supabaseUpdate: Record<string, any> = {
        updated_at: timestamp
      };

      if ('name' in details) supabaseUpdate.name = details.name;
      if ('audiences' in details) supabaseUpdate.audiences = details.audiences;
      if ('platforms' in details) supabaseUpdate.platforms = details.platforms;
      if ('budget' in details) supabaseUpdate.budget = details.budget;
      if ('startDate' in details) supabaseUpdate.start_date = details.startDate;
      if ('endDate' in details) supabaseUpdate.end_date = details.endDate;
      if ('status' in details) supabaseUpdate.status = details.status;
      if ('selectedCompanyAccountId' in details) supabaseUpdate.selected_company_account_id = details.selectedCompanyAccountId;

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
      const { timestamp } = createTimestamp();
      const campaign = campaigns.find(c => c.id === campaignId);
      if (!campaign) return;

      const updateData: any = { 
        status,
        updated_at: timestamp
      };

      // Add approved_at timestamp when approving
      if (status === 'approved' && campaign.status !== 'approved') {
        updateData.approved_at = timestamp;
      }

      // Update campaign status
      const { error: campaignError } = await supabase
        .from('campaigns')
        .update(updateData)
        .eq('id', campaignId);

      if (campaignError) throw campaignError;

      // Add workflow history entry with proper campaign_id
      try {
        const { error: historyError } = await supabase
          .from('campaign_workflow_history')
          .insert({
            campaign_id: campaignId, // Ensure this is not null
            user_id: user.id,
            from_status: campaign.status,
            to_status: status,
            notes,
            created_at: timestamp
          });

        if (historyError) {
          console.error('Workflow history error:', historyError);
          // Don't throw here, as the main operation succeeded
        }
      } catch (historyErr) {
        console.error('Non-critical workflow history error:', historyErr);
      }

      // Create notification for client and team
      const notificationTargets = [campaign.clientId];
      if (campaign.users?.company_id) {
        const teamIds = await getCompanyTeamIds(campaign.users.company_id);
        notificationTargets.push(...teamIds);
      }

      const statusLabel = status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
      await createNotification(
        'Campaign Status Updated',
        `Your campaign "${campaign.name}" status has been updated to ${statusLabel}.${notes ? ` Note: ${notes}` : ''}`,
        [...new Set(notificationTargets)], // Remove duplicates
        campaignId
      );

      // Update local state
      setCampaigns(prev => 
        prev.map(c => c.id === campaignId ? { ...c, status: status as any, updatedAt: updateData.updated_at } : c)
      );

    } catch (error) {
      console.error('Error updating campaign status:', error);
      throw error;
    }
  };

  const submitCampaignRequest = async (notes?: string) => {
    if (!activeCampaign || !user) return;

    // FIXED: Ensure authenticated user and valid campaign ID are available
    if (!user?.id) {
      console.error("submitCampaignRequest: No authenticated user found.");
      return;
    }

    if (!activeCampaign.id) {
      console.error("submitCampaignRequest: No valid campaign ID found.");
      return;
    }

    try {
      const { timestamp } = createTimestamp();
      
      // FIXED: Generate a unique ID for the audience request
      const requestId = crypto.randomUUID();
      
      const newRequest: AudienceRequest = {
        id: requestId, // Use the generated ID
        campaignId: activeCampaign.id,
        clientId: user.id,
        audiences: activeCampaign.audiences,
        platforms: activeCampaign.platforms,
        budget: activeCampaign.budget,
        startDate: activeCampaign.startDate,
        endDate: activeCampaign.endDate,
        notes,
        status: 'pending',
        createdAt: timestamp
      };

      const { data, error } = await supabase
        .from('audience_requests')
        .insert([{
          id: requestId, // FIXED: Include the generated ID
          campaign_id: newRequest.campaignId,
          client_id: newRequest.clientId,
          audiences: newRequest.audiences,
          platforms: newRequest.platforms,
          budget: newRequest.budget,
          start_date: newRequest.startDate,
          end_date: newRequest.endDate,
          notes: newRequest.notes,
          status: newRequest.status,
          created_at: timestamp,
          archived: false
        }])
        .select()
        .single();

      if (error) throw error;

      // Update campaign status to submitted
      await updateCampaignDetails({ status: 'submitted' });
      
      // Create notification for admins
      const adminIds = await getAdminUserIds();
      if (adminIds.length > 0) {
        await createNotification(
          'New Campaign Submitted for Review',
          `${user.name} has submitted a new campaign: "${activeCampaign.name}" for approval.`,
          adminIds,
          activeCampaign.id
        );
      }
      
      // Transform the returned data to camelCase
      const createdRequest: AudienceRequest = {
        id: data.id,
        campaignId: data.campaign_id,
        clientId: data.client_id,
        audiences: data.audiences || [],
        platforms: data.platforms || { social: [], programmatic: [] },
        budget: data.budget || 0,
        startDate: data.start_date,
        endDate: data.end_date,
        notes: data.notes,
        status: data.status,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        archived: data.archived || false
      };
      
      setRequests(prev => [createdRequest, ...prev]);
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
      const { timestamp } = createTimestamp();
      
      const { error } = await supabase
        .from('campaign_comments')
        .insert({
          campaign_id: campaignId,
          user_id: user.id,
          parent_comment_id: parentCommentId,
          content,
          created_at: timestamp
        });

      if (error) throw error;

      // Log activity
      await supabase
        .from('campaign_activity_log')
        .insert({
          campaign_id: campaignId,
          user_id: user.id,
          action_type: 'comment_added',
          action_details: {
            comment_content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
            is_reply: !!parentCommentId
          },
          created_at: timestamp
        });

      // Create notification for relevant users
      const campaign = campaigns.find(c => c.id === campaignId);
      if (campaign) {
        const notificationTargets: string[] = [];
        
        // Notify campaign owner if commenter is not the owner
        if (campaign.clientId !== user.id) {
          notificationTargets.push(campaign.clientId);
        }
        
        // Notify team members
        if (user.companyId) {
          const teamIds = await getCompanyTeamIds(user.companyId);
          notificationTargets.push(...teamIds);
        }
        
        // Notify admins if user is not admin
        if (!isAdmin) {
          const adminIds = await getAdminUserIds();
          notificationTargets.push(...adminIds);
        }

        // Remove duplicates and current user
        const uniqueTargets = [...new Set(notificationTargets)].filter(id => id !== user.id);
        
        if (uniqueTargets.length > 0) {
          await createNotification(
            'New Comment',
            `${user.name} left a comment on campaign "${campaign.name}".`,
            uniqueTargets,
            campaignId
          );
        }
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

  const fetchActivityLog = async (campaignId: string) => {
    try {
      // First, fetch the activity logs without user data
      const { data: activityData, error: activityError } = await supabase
        .from('campaign_activity_log')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      if (activityError) throw activityError;

      if (!activityData || activityData.length === 0) {
        setActivityLog([]);
        return;
      }

      // Extract unique user IDs from the activity logs
      const userIds = [...new Set(activityData.map(item => item.user_id).filter(Boolean))];

      // Fetch user data separately if there are user IDs
      let usersMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, name, role')
          .in('id', userIds);

        if (!usersError && usersData) {
          usersMap = usersData.reduce((acc, user) => {
            acc[user.id] = { name: user.name, role: user.role };
            return acc;
          }, {} as Record<string, any>);
        }
      }

      // Combine activity logs with user data
      const formattedActivity: CampaignActivity[] = activityData.map(item => ({
        id: item.id,
        campaignId: item.campaign_id,
        userId: item.user_id,
        actionType: item.action_type,
        actionDetails: item.action_details,
        oldValues: item.old_values,
        newValues: item.new_values,
        createdAt: item.created_at,
        user: item.user_id ? usersMap[item.user_id] : null
      }));

      setActivityLog(formattedActivity);
    } catch (error) {
      console.error('Error fetching activity log:', error);
    }
  };

  const setFilters = useCallback((newFilters: Partial<CampaignFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  // FIXED: Filter campaigns based on user role and approval status
  const filteredCampaigns = campaigns.filter(campaign => {
    // For non-admin users, only show approved campaigns (campaigns that have been through the approval process)
    if (!isAdmin) {
      // Only show campaigns that are approved or beyond (not draft, submitted, or pending_review)
      const approvedStatuses = ['approved', 'in_progress', 'waiting_on_client', 'delivered', 'live', 'paused', 'completed'];
      if (!approvedStatuses.includes(campaign.status)) {
        return false;
      }
    }

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

    // Agency filter (admin only)
    if (filters.agency && campaign.users?.companies?.name !== filters.agency) {
      return false;
    }

    // Status category filter
    if (filters.statusCategory) {
      const category = getCampaignStatusCategory(campaign.status);
      if (category !== filters.statusCategory) {
        return false;
      }
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
      requests,
      activeCampaign,
      comments,
      workflowHistory,
      activityLog,
      filters,
      loading,
      hasActiveCampaignLoaded,
      isCampaignOperationLoading,
      waitForCampaignReady,
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
      fetchActivityLog,
      setFilters,
      filteredCampaigns,
      refreshRequests,
      approveRequest,
      rejectRequest,
      pendingRequests,
      rejectedRequests,
      archivedRequests,
      approvedCampaigns,
      activeCampaigns,
      completedCampaigns,
      getCampaignStatusCategory,
      getCampaignsByCategory,
      archiveRequest,
      deleteRequest,
      unarchiveRequest,
      deleteCampaign,
      archiveCampaign,
      unarchiveCampaign
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