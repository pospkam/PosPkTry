/**
 * Engagement Types
 */

export interface Review {
  id: string;
  userId: string;
  productId: string;
  productType: 'tour' | 'accommodation' | 'transport';
  rating: number; // 1-5
  title: string;
  comment: string;
  photos?: string[];
  status: ReviewStatus;
  createdAt: Date;
  updatedAt: Date;
}

export enum ReviewStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface LoyaltyAccount {
  id: string;
  userId: string;
  points: number;
  tier: LoyaltyTier;
  totalSpent: number;
  createdAt: Date;
  updatedAt: Date;
}

export enum LoyaltyTier {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
}

export interface LoyaltyTransaction {
  id: string;
  accountId: string;
  points: number;
  type: TransactionType;
  reference: string; // booking id, etc
  createdAt: Date;
}

export enum TransactionType {
  PURCHASE = 'purchase',
  BONUS = 'bonus',
  REFERRAL = 'referral',
  REDEMPTION = 'redemption',
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: string;
  message: string;
  attachments?: string[];
  createdAt: Date;
  readAt?: Date;
}

export interface Conversation {
  id: string;
  userId: string;
  supportAgentId?: string;
  subject: string;
  status: ConversationStatus;
  createdAt: Date;
  updatedAt: Date;
  lastMessage?: ChatMessage;
}

export enum ConversationStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  CLOSED = 'closed',
  ARCHIVED = 'archived',
}
