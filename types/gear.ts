/**
 * Типы данных для Gear Rental
 * Прокат туристического снаряжения
 */

export type GearCategory =
  | 'hiking'      // походное снаряжение
  | 'camping'     // кемпинг
  | 'climbing'    // альпинизм
  | 'skiing'      // лыжи/сноуборд
  | 'water'       // водное снаряжение
  | 'photography' // фототехника
  | 'safety';     // безопасность

export interface GearItem {
  id: string;
  name: string;
  description: string;
  category: GearCategory;
  subcategory?: string;
  brand?: string;
  model?: string;
  pricePerDay: number;
  pricePerWeek?: number;
  currency: string;
  images: string[];
  specifications: {
    size?: string;
    weight?: number;
    capacity?: string;
    material?: string;
    [key: string]: any;
  };
  condition: 'new' | 'excellent' | 'good' | 'fair';
  quantity: number;
  availableQuantity: number;
  requiresDeposit: boolean;
  depositAmount?: number;
  requiresInsurance: boolean;
  insuranceCost?: number;
  tags: string[];
  isActive: boolean;
  rating: number;
  reviewCount: number;
  rentalCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GearRental {
  id: string;
  userId?: string;
  customerInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    passportNumber?: string;
  };
  items: GearRentalItem[];
  startDate: Date;
  endDate: Date;
  totalDays: number;
  pricing: {
    rentalCost: number;
    depositAmount: number;
    insuranceCost: number;
    total: number;
    currency: string;
  };
  depositPaid: boolean;
  depositRefunded: boolean;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  pickupLocation: string;
  returnLocation: string;
  pickupDateTime?: Date;
  returnDateTime?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GearRentalItem {
  gearId: string;
  gearName: string;
  quantity: number;
  pricePerDay: number;
  totalDays: number;
  totalPrice: number;
  depositAmount: number;
  insuranceCost: number;
  condition: string;
}

export interface GearAvailability {
  gearId: string;
  date: Date;
  totalQuantity: number;
  rentedQuantity: number;
  availableQuantity: number;
  isAvailable: boolean;
}

export interface GearFormData {
  name: string;
  description: string;
  category: GearCategory;
  brand?: string;
  pricePerDay: number;
  pricePerWeek?: number;
  quantity: number;
  requiresDeposit: boolean;
  depositAmount?: number;
  requiresInsurance: boolean;
  insuranceCost?: number;
  specifications: any;
  images: File[] | string[];
}

export interface RentalFormData {
  customerInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  items: {
    gearId: string;
    quantity: number;
  }[];
  startDate: Date;
  endDate: Date;
  pickupLocation: string;
  returnLocation: string;
  notes?: string;
}

