export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'client';
  platformIds: {
    [key: string]: string;
  };
  companyName?: string;
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
  status: 'draft' | 'submitted' | 'approved' | 'active' | 'completed';
  createdAt: string;
  updatedAt: string;
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