/**
 * API клиент для интеграции с Камчатская Рыбалка (fishingkam.ru)
 * Партнер: Камчатская Рыбалка
 */

export interface KamchatkaFishingConfig {
  apiKey: string;
  apiSecret: string;
  baseUrl?: string;
}

export interface FishingTour {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number; // дней
  location: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  fishTypes: string[];
  season: {
    start: string; // MM-DD
    end: string;
  };
  maxParticipants: number;
  includes: string[];
  requirements: string[];
  images: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  rating?: number;
  reviewsCount?: number;
}

export interface FishingBooking {
  id: string;
  tourId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  date: string;
  participants: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  createdAt: string;
}

export interface FishingAvailability {
  tourId: string;
  date: string;
  availableSlots: number;
  price: number;
}

export class KamchatkaFishingClient {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;

  constructor(config: KamchatkaFishingConfig) {
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.baseUrl = config.baseUrl || 'https://api.fishingkam.ru/v1';
  }

  private getAuthHeaders(): HeadersInit {
    return {
      'X-API-Key': this.apiKey,
      'X-API-Secret': this.apiSecret,
      'Content-Type': 'application/json',
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Получить список всех туров
   */
  async getTours(): Promise<FishingTour[]> {
    return this.request<FishingTour[]>('/tours');
  }

  /**
   * Получить тур по ID
   */
  async getTour(tourId: string): Promise<FishingTour> {
    return this.request<FishingTour>(`/tours/${tourId}`);
  }

  /**
   * Получить доступность тура на даты
   */
  async getAvailability(
    tourId: string,
    startDate: string,
    endDate: string
  ): Promise<FishingAvailability[]> {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
    });
    return this.request<FishingAvailability[]>(
      `/tours/${tourId}/availability?${params}`
    );
  }

  /**
   * Создать бронирование
   */
  async createBooking(booking: Omit<FishingBooking, 'id' | 'status' | 'createdAt'>): Promise<FishingBooking> {
    return this.request<FishingBooking>('/bookings', {
      method: 'POST',
      body: JSON.stringify(booking),
    });
  }

  /**
   * Получить бронирование по ID
   */
  async getBooking(bookingId: string): Promise<FishingBooking> {
    return this.request<FishingBooking>(`/bookings/${bookingId}`);
  }

  /**
   * Отменить бронирование
   */
  async cancelBooking(bookingId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/bookings/${bookingId}/cancel`, {
      method: 'POST',
    });
  }

  /**
   * Получить список бронирований
   */
  async getBookings(params?: {
    status?: string;
    from?: string;
    to?: string;
  }): Promise<FishingBooking[]> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.from) searchParams.set('from', params.from);
    if (params?.to) searchParams.set('to', params.to);
    
    const query = searchParams.toString();
    return this.request<FishingBooking[]>(`/bookings${query ? `?${query}` : ''}`);
  }

  /**
   * Проверить подключение к API
   */
  async healthCheck(): Promise<{ status: string; version: string }> {
    return this.request<{ status: string; version: string }>('/health');
  }
}

// Singleton instance
let clientInstance: KamchatkaFishingClient | null = null;

export function getKamchatkaFishingClient(): KamchatkaFishingClient {
  if (!clientInstance) {
    const apiKey = process.env.KAMCHATKA_FISHING_API_KEY;
    const apiSecret = process.env.KAMCHATKA_FISHING_API_SECRET;

    if (!apiKey || !apiSecret) {
      throw new Error('Kamchatka Fishing API credentials not configured');
    }

    clientInstance = new KamchatkaFishingClient({
      apiKey,
      apiSecret,
    });
  }

  return clientInstance;
}
