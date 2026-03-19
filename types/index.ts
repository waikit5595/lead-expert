export type LeadStatus = 'New' | 'Contacted' | 'Interested' | 'Closed';

export interface Lead {
  id: string;
  userId: string;
  name: string;
  phone: string;
  projectInterest: string;
  budget: string;
  status: LeadStatus;
  notes: string;
  lastContact?: unknown;
  createdAt?: unknown;
}

export interface AIRecord {
  id?: string;
  userId: string;
  type: 'sales_message' | 'follow_up' | 'outreach';
  input: Record<string, string>;
  output: string;
  createdAt?: unknown;
}

export interface SourcedLead {
  sourceId: string;
  name: string;
  address: string;
  phone: string;
  website: string;
  rating: number | null;
  reviewCount: number | null;
  mapsUrl: string;
  businessStatus: string;
}

export interface Conversation {
  id: string;
  userId?: string;
  phone: string;
  contactName?: string;
  channel: 'whatsapp';
  lastMessageText?: string;
  lastMessageDirection?: 'inbound' | 'outbound';
  lastMessageAt?: string;
  updatedAt?: string;
}

export interface ConversationMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  text: string;
  type?: string;
  createdAt?: string;
}
