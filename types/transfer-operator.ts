/**
 * Типы данных для Transfer Operator Panel
 * Управление транспортом и водителями
 */

// Метрики транспортного оператора
export interface TransferOperatorMetrics {
  totalVehicles: number;
  activeVehicles: number;
  totalDrivers: number;
  activeDrivers: number;
  totalTransfers: number;
  completedTransfers: number;
  pendingTransfers: number;
  cancelledTransfers: number;
  totalRevenue: number;
  monthlyRevenue: number;
  averageTransferPrice: number;
  occupancyRate: number; // процент занятости
  customerSatisfaction: number; // рейтинг 1-5
}

// Транспортное средство
export interface Vehicle {
  id: string;
  name: string;
  type: 'car' | 'minivan' | 'bus' | 'helicopter' | 'boat';
  licensePlate: string;
  capacity: number; // количество пассажиров
  category: 'economy' | 'comfort' | 'business' | 'premium';
  status: 'active' | 'maintenance' | 'inactive';
  location: string; // текущая локация
  features: string[]; // WiFi, AC, leather seats, etc.
  images: string[];
  documents: VehicleDocument[];
  createdAt: Date;
  updatedAt: Date;
}

// Документы транспортного средства
export interface VehicleDocument {
  id: string;
  type: 'insurance' | 'registration' | 'inspection' | 'license';
  name: string;
  fileUrl: string;
  expiryDate?: Date;
  status: 'valid' | 'expiring' | 'expired';
  uploadedAt: Date;
}

// Водитель
export interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  licenseNumber: string;
  licenseExpiry: Date;
  experience: number; // лет опыта
  languages: string[];
  rating: number; // 1-5
  totalTrips: number;
  status: 'active' | 'inactive' | 'suspended';
  vehicleId?: string; // закрепленный транспорт
  documents: DriverDocument[];
  emergencyContact: {
    name: string;
    phone: string;
    relation: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Документы водителя
export interface DriverDocument {
  id: string;
  type: 'license' | 'passport' | 'medical' | 'background_check';
  name: string;
  fileUrl: string;
  expiryDate?: Date;
  status: 'valid' | 'expiring' | 'expired';
  uploadedAt: Date;
}

// Трансфер (поездка)
export interface Transfer {
  id: string;
  bookingId: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  vehicleId: string;
  vehicleName: string;
  driverId: string;
  driverName: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupDateTime: Date;
  dropoffDateTime?: Date;
  passengers: number;
  luggage: number;
  specialRequests?: string;
  price: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'delayed';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  notes?: string;
  actualPickupTime?: Date;
  actualDropoffTime?: Date;
  distance?: number; // км
  duration?: number; // минуты
  rating?: number; // клиентский рейтинг
  feedback?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Расписание водителя
export interface DriverSchedule {
  id: string;
  driverId: string;
  vehicleId: string;
  date: Date;
  startTime: string;
  endTime: string;
  location: string;
  transferId?: string;
  type: 'available' | 'booked' | 'maintenance' | 'off';
  notes?: string;
}

// Маршрут
export interface Route {
  id: string;
  name: string;
  fromLocation: string;
  toLocation: string;
  distance: number; // км
  estimatedDuration: number; // минуты
  basePrice: number;
  pricePerKm?: number;
  popular: boolean;
  transfersCount: number;
  averageRating: number;
}

// Заявка на трансфер
export interface TransferRequest {
  id: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupDateTime: Date;
  passengers: number;
  luggage: number;
  vehicleType: 'car' | 'minivan' | 'bus' | 'helicopter' | 'boat';
  specialRequests?: string;
  status: 'pending' | 'assigned' | 'confirmed' | 'completed' | 'cancelled';
  assignedVehicleId?: string;
  assignedDriverId?: string;
  estimatedPrice: number;
  finalPrice?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Финансовые данные
export interface TransferFinanceData {
  totalRevenue: number;
  pendingRevenue: number;
  monthlyRevenue: number;
  averageTripRevenue: number;
  fuelCosts: number;
  maintenanceCosts: number;
  driverPayments: number;
  netIncome: number;
  transactions: TransferTransaction[];
}

export interface TransferTransaction {
  id: string;
  type: 'booking' | 'refund' | 'fuel' | 'maintenance' | 'driver_payment';
  amount: number;
  description: string;
  date: Date;
  transferId?: string;
  driverId?: string;
  vehicleId?: string;
}

// Dashboard данные
export interface TransferOperatorDashboardData {
  metrics: TransferOperatorMetrics;
  recentTransfers: Transfer[];
  upcomingTransfers: Transfer[];
  availableVehicles: Vehicle[];
  activeDrivers: Driver[];
  pendingRequests: TransferRequest[];
  revenueChart: {
    date: string;
    revenue: number;
    trips: number;
  }[];
  vehicleUtilization: {
    vehicleId: string;
    vehicleName: string;
    utilizationRate: number;
    totalTrips: number;
    revenue: number;
  }[];
}

// Формы
export interface VehicleFormData {
  name: string;
  type: 'car' | 'minivan' | 'bus' | 'helicopter' | 'boat';
  licensePlate: string;
  capacity: number;
  category: 'economy' | 'comfort' | 'business' | 'premium';
  location: string;
  features: string[];
  images: File[] | string[];
}

export interface DriverFormData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  licenseNumber: string;
  licenseExpiry: Date;
  experience: number;
  languages: string[];
  vehicleId?: string;
  emergencyContact: {
    name: string;
    phone: string;
    relation: string;
  };
}

export interface TransferFormData {
  bookingId?: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  vehicleId: string;
  driverId: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupDateTime: Date;
  passengers: number;
  luggage: number;
  specialRequests?: string;
  price: number;
  notes?: string;
}

export interface ScheduleFormData {
  driverId: string;
  vehicleId: string;
  date: Date;
  startTime: string;
  endTime: string;
  location: string;
  type: 'available' | 'maintenance' | 'off';
  notes?: string;
}

// Отчёт
export interface TransferOperatorReport {
  period: {
    start: Date;
    end: Date;
  };
  metrics: TransferOperatorMetrics;
  topVehicles: {
    vehicleId: string;
    vehicleName: string;
    tripsCount: number;
    revenue: number;
    utilizationRate: number;
  }[];
  topDrivers: {
    driverId: string;
    driverName: string;
    tripsCount: number;
    revenue: number;
    rating: number;
  }[];
  revenueByVehicle: {
    vehicleName: string;
    revenue: number;
    tripsCount: number;
  }[];
  transfersByStatus: {
    status: string;
    count: number;
    percentage: number;
  }[];
  popularRoutes: {
    fromLocation: string;
    toLocation: string;
    tripsCount: number;
    averagePrice: number;
  }[];
}

