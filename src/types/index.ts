export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'super_admin';
  platformIds: {
    [key: string]: string;
  };
  companyId?: string;
  companyName?: string;
}

export interface Company {
  id: string;
  name: string;
  accountId?: string;
  createdAt: string;
  updatedAt: string;
  userCount?: number;
  adminCount?: number;
  accountIds?: CompanyAccountId[]; // Multiple account IDs
}

export interface CompanyAccountId {
  id: string;
  companyId: string;
  platform: string;
  accountId: string;
  accountName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  companyId: string;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

export interface UserInvitation {
  id: string;
  email: string;
  companyId: string;
  role: 'admin' | 'user';
  invitedBy: string;
  status: 'pending' | 'accepted' | 'expired';
  createdAt: string;
  expiresAt: string;
}

export interface AudienceSegment {
  id: string;
  name: string;
  description: string;
  category: string;
  dataSupplier?: string;
  reach?: number;
  cpm?: number;
}

export interface Campaign {
  id: string;
  name: string;
  clientId: string;
  audiences: AudienceSegment[];
  platforms: {
    social: string[];
    programmatic: string[];
  };
  budget: number;
  startDate: string;
  endDate: string;
  status: 'draft' | 'submitted' | 'pending_review' | 'approved' | 'in_progress' | 'waiting_on_client' | 'delivered' | 'failed' | 'completed' | 'live' | 'paused';
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  archived?: boolean;
  selectedCompanyAccountId?: string; // NEW: Links to CompanyAccountId
  selectedCompanyAccount?: CompanyAccountId; // NEW: Populated when fetched
  users?: {
    name: string;
    company_id: string;
    companies?: {
      name: string;
      account_id?: string;
    };
  };
}

export interface CampaignComment {
  id: string;
  campaignId: string;
  userId: string;
  parentCommentId?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    name: string;
    role: string;
  };
  replies?: CampaignComment[];
}

export interface CampaignWorkflowHistory {
  id: string;
  campaignId: string;
  userId: string;
  fromStatus?: string;
  toStatus: string;
  notes?: string;
  createdAt: string;
  user?: {
    name: string;
    role: string;
  };
}

export interface CampaignActivity {
  id: string;
  campaignId: string;
  userId: string;
  actionType: 'created' | 'updated' | 'status_changed' | 'comment_added' | 'audience_added' | 'audience_removed' | 'approved' | 'rejected';
  actionDetails: Record<string, any>;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  createdAt: string;
  user?: {
    name: string;
    role: string;
  };
}

export interface AudienceRequest {
  id: string;
  campaignId: string;
  clientId: string;
  audiences: AudienceSegment[];
  platforms: {
    social: string[];
    programmatic: string[];
  };
  budget: number;
  startDate: string;
  endDate: string;
  notes?: string;
  status: 'pending' | 'reviewed' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt?: string;
  archived?: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  campaignId?: string;
  campaign_id?: string; // For database compatibility
}

export interface CampaignFilters {
  search: string;
  status: string;
  dateRange: {
    start: string;
    end: string;
  };
  agency?: string; // For admin filtering by company
  statusCategory?: string; // For filtering by status category (upcoming/active/past)
}

// New types for better organization
export type CampaignStatusCategory = 'pending' | 'active' | 'completed';

export interface CampaignSummary {
  id: string;
  name: string;
  status: Campaign['status'];
  statusCategory: CampaignStatusCategory;
  lastUpdate: string;
  audienceCount: number;
  budget: number;
  clientName?: string;
  companyName?: string;
  createdAt: string;
  updatedAt: string;
}