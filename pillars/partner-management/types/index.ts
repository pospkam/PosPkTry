/**
 * Partner Management Types
 */

export interface Partner {
  id: string;
  name: string;
  type: PartnerType;
  email: string;
  phone: string;
  verified: boolean;
  status: PartnerStatus;
  createdAt: Date;
  updatedAt: Date;
}

export enum PartnerType {
  OPERATOR = 'operator',
  AGENT = 'agent',
  GUIDE = 'guide',
  ACCOMMODATION = 'accommodation',
}

export enum PartnerStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  INACTIVE = 'inactive',
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  module: string;
  action: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PartnerUser {
  id: string;
  partnerId: string;
  userId: string;
  roles: Role[];
  status: UserStatus;
  joinedAt: Date;
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export interface AdminAction {
  id: string;
  adminId: string;
  action: string;
  targetType: string;
  targetId: string;
  changes: Record<string, any>;
  createdAt: Date;
}
