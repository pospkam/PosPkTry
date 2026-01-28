/**
 * Booking Types
 */

export interface CartItem {
  id: string;
  productId: string;
  productType: 'tour' | 'accommodation' | 'transport' | 'gear';
  quantity: number;
  price: number;
  addedAt: Date;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  totalPrice: number;
  updatedAt: Date;
}

export interface Booking {
  id: string;
  userId: string;
  items: BookingItem[];
  status: BookingStatus;
  totalPrice: number;
  paymentStatus: PaymentStatus;
  createdAt: Date;
  updatedAt: Date;
  confirmationCode: string;
}

export interface BookingItem {
  id: string;
  productId: string;
  productType: 'tour' | 'accommodation' | 'transport' | 'gear';
  quantity: number;
  price: number;
  startDate?: Date;
  endDate?: Date;
}

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export interface Payment {
  id: string;
  bookingId: string;
  userId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export enum PaymentMethod {
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  E_WALLET = 'e_wallet',
  CASH = 'cash',
}
