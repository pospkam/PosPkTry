/**
 * Типы данных для Car Rental
 * Прокат автомобилей
 */

export type CarCategory = 'economy' | 'comfort' | 'suv' | 'premium' | 'minivan';
export type TransmissionType = 'manual' | 'automatic';
export type FuelType = 'petrol' | 'diesel' | 'hybrid' | 'electric';

export interface Car {
  id: string;
  name: string;
  brand: string;
  model: string;
  year: number;
  category: CarCategory;
  transmission: TransmissionType;
  fuelType: FuelType;
  seats: number;
  doors: number;
  pricePerDay: number;
  pricePerWeek?: number;
  pricePerMonth?: number;
  currency: string;
  images: string[];
  features: string[];
  mileage: number;
  licensePlate: string;
  condition: 'new' | 'excellent' | 'good';
  depositAmount: number;
  insuranceIncluded: boolean;
  availableQuantity: number;
  isActive: boolean;
  rating: number;
  reviewCount: number;
  rentalCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CarRental {
  id: string;
  userId?: string;
  customerInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    driverLicense: string;
    licenseExpiry: Date;
  };
  carId: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  pickupLocation: string;
  returnLocation: string;
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
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

