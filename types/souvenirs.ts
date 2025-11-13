/**
 * Типы данных для Souvenir Shop
 * Магазин сувениров и подарков Камчатки
 */

// Сувенир/товар
export interface Souvenir {
  id: string;
  name: string;
  description: string;
  shortDescription?: string;
  category: SouvenirCategory;
  subcategory?: string;
  price: number;
  currency: string;
  discountPrice?: number; // цена со скидкой
  images: string[];
  videoUrl?: string;
  tags: string[];
  isActive: boolean;
  isFeatured: boolean;
  stockQuantity: number;
  lowStockThreshold: number;
  weight?: number; // кг
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  materials?: string[];
  origin: string; // страна/регион происхождения
  artisan?: string; // имя мастера/производителя
  rating: number;
  reviewCount: number;
  salesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Категория сувениров
export type SouvenirCategory =
  | 'traditional_art'
  | 'jewelry'
  | 'textiles'
  | 'ceramics'
  | 'woodwork'
  | 'leather'
  | 'food_drinks'
  | 'books'
  | 'clothing'
  | 'decorations'
  | 'toys'
  | 'cosmetics';

// Заказ в корзине
export interface CartItem {
  souvenirId: string;
  souvenir: Souvenir;
  quantity: number;
  selectedOptions?: ProductOption[];
  giftMessage?: string;
  giftWrap?: boolean;
  unitPrice: number; // цена за единицу
  totalPrice: number; // quantity × unitPrice
  addedAt: Date;
}

// Опции товара (цвет, размер и т.д.)
export interface ProductOption {
  id: string;
  name: string; // "Цвет", "Размер", "Стиль"
  type: 'color' | 'size' | 'style' | 'material';
  value: string;
  priceModifier?: number; // изменение цены
}

// Корзина покупок
export interface ShoppingCart {
  id: string;
  userId?: string; // для авторизованных пользователей
  sessionId: string; // для гостей
  items: CartItem[];
  subtotal: number; // сумма без скидок
  discountAmount: number; // сумма скидок
  taxAmount: number; // налоги
  shippingCost: number; // доставка
  total: number; // итого к оплате
  currency: string;
  couponCode?: string;
  couponDiscount?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Заказ
export interface SouvenirOrder {
  id: string;
  orderNumber: string;
  userId?: string;
  customerInfo: CustomerInfo;
  items: OrderItem[];
  pricing: OrderPricing;
  shipping: ShippingInfo;
  payment: PaymentInfo;
  status: OrderStatus;
  trackingNumber?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Информация о покупателе
export interface CustomerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company?: string;
  address: ShippingAddress;
}

// Адрес доставки
export interface ShippingAddress {
  country: string;
  region: string;
  city: string;
  postalCode: string;
  street: string;
  building: string;
  apartment?: string;
  instructions?: string; // особые указания для курьера
}

// Элемент заказа
export interface OrderItem {
  souvenirId: string;
  souvenirName: string;
  souvenirImage: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  selectedOptions?: ProductOption[];
  giftMessage?: string;
  giftWrap?: boolean;
}

// Ценообразование заказа
export interface OrderPricing {
  subtotal: number; // сумма товаров
  discountAmount: number; // скидки
  taxAmount: number; // налоги
  shippingCost: number; // доставка
  total: number; // итого
  currency: string;
  couponCode?: string;
  couponDiscount?: number;
}

// Информация о доставке
export interface ShippingInfo {
  method: ShippingMethod;
  cost: number;
  estimatedDays: number;
  trackingNumber?: string;
  shippedAt?: Date;
  deliveredAt?: Date;
  address: ShippingAddress;
}

// Способы доставки
export type ShippingMethod =
  | 'standard' // стандартная доставка
  | 'express'  // экспресс
  | 'pickup';  // самовывоз

// Информация об оплате
export interface PaymentInfo {
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  paidAt?: Date;
  amount: number;
  currency: string;
}

// Способы оплаты
export type PaymentMethod =
  | 'card'         // банковская карта
  | 'bank_transfer' // банковский перевод
  | 'cash_on_delivery'; // наложенный платеж

// Статус оплаты
export type PaymentStatus =
  | 'pending'   // ожидает оплаты
  | 'paid'      // оплачен
  | 'failed'    // ошибка оплаты
  | 'refunded'; // возвращен

// Статус заказа
export type OrderStatus =
  | 'pending'      // создан, ожидает обработки
  | 'confirmed'    // подтвержден
  | 'processing'   // обрабатывается
  | 'shipped'      // отправлен
  | 'delivered'    // доставлен
  | 'cancelled'    // отменен
  | 'refunded';    // возвращен

// Отзыв о товаре
export interface ProductReview {
  id: string;
  souvenirId: string;
  orderId: string;
  userId?: string;
  customerName: string;
  customerEmail: string;
  rating: number; // 1-5
  title: string;
  comment: string;
  images?: string[]; // фото отзыва
  isVerified: boolean; // куплен ли товар
  helpful: number; // количество "полезно"
  createdAt: Date;
  updatedAt: Date;
}

// Купон на скидку
export interface Coupon {
  id: string;
  code: string;
  name: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minPurchase?: number;
  maxDiscount?: number;
  validFrom: Date;
  validTo: Date;
  usageLimit?: number;
  usedCount: number;
  applicableCategories?: SouvenirCategory[];
  applicableProducts?: string[]; // souvenir IDs
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Настройки магазина
export interface SouvenirShopSettings {
  id: string;
  isEnabled: boolean;
  currency: string;
  taxRate: number;
  freeShippingThreshold?: number;
  defaultShippingCost: number;
  expressShippingCost: number;
  pickupAddress: ShippingAddress;
  businessHours: {
    monday: { open: string; close: string };
    tuesday: { open: string; close: string };
    wednesday: { open: string; close: string };
    thursday: { open: string; close: string };
    friday: { open: string; close: string };
    saturday: { open: string; close: string };
    sunday: { open: string; close: string };
  };
  contactInfo: {
    phone: string;
    email: string;
    address: ShippingAddress;
  };
  socialLinks: {
    instagram?: string;
    facebook?: string;
    vk?: string;
  };
  updatedAt: Date;
}

// Статистика магазина
export interface SouvenirShopStats {
  totalProducts: number;
  activeProducts: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenue: number;
  monthlyRevenue: number;
  averageOrderValue: number;
  topSellingProducts: {
    souvenirId: string;
    name: string;
    salesCount: number;
    revenue: number;
  }[];
  lowStockProducts: {
    souvenirId: string;
    name: string;
    stockQuantity: number;
  }[];
}

// Формы
export interface SouvenirFormData {
  name: string;
  description: string;
  shortDescription?: string;
  category: SouvenirCategory;
  subcategory?: string;
  price: number;
  discountPrice?: number;
  images: File[] | string[];
  videoUrl?: string;
  tags: string[];
  stockQuantity: number;
  lowStockThreshold: number;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  materials?: string[];
  origin: string;
  artisan?: string;
}

export interface OrderFormData {
  customerInfo: CustomerInfo;
  items: CartItem[];
  shippingMethod: ShippingMethod;
  paymentMethod: PaymentMethod;
  couponCode?: string;
  notes?: string;
}

export interface CouponFormData {
  code: string;
  name: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minPurchase?: number;
  maxDiscount?: number;
  validFrom: Date;
  validTo: Date;
  usageLimit?: number;
  applicableCategories?: SouvenirCategory[];
  applicableProducts?: string[];
}

// Фильтры и поиск
export interface SouvenirFilters {
  category?: SouvenirCategory;
  subcategory?: string;
  priceRange?: {
    min: number;
    max: number;
  };
  tags?: string[];
  inStock?: boolean;
  isFeatured?: boolean;
  rating?: number;
  sortBy?: 'name' | 'price' | 'rating' | 'newest' | 'popular';
  sortOrder?: 'asc' | 'desc';
}

export interface SouvenirSearchResult {
  souvenirs: Souvenir[];
  total: number;
  filters: SouvenirFilters;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
  };
}