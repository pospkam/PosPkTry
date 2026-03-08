/**
 * Agent types for Kamchatour Hub
 */

export interface AgentClient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  status: 'prospect' | 'active' | 'inactive';
  notes?: string;
  tags: string[];
  source: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ClientFormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  status: 'prospect' | 'active' | 'inactive';
  notes: string;
  tags: string[];
  source: string;
}
