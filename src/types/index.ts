export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'client';
  platformIds: {
    [key: string]: string;
  };
  companyId?: string;
  companyName?: string;
}

export interface Company {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
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
  status: 'draft' | 'submitted' | 'pending_review' | 'in_progress' | 'waiting_on_client' | 'delivered' | 'failed' | 'completed';
  createdAt: string;
  updatedAt: string;
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
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface CampaignFilters {
  search: string;
  status: string;
  dateRange: {
    start: string;
    end: string;
  };
}