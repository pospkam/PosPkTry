/**
 * Channel Manager — общие типы для интеграций с внешними маркетплейсами
 */

export type ChannelName = 'tripster' | 'avito' | 'sputnik8';

export interface ChannelTour {
  id: number;
  title: string;
  description: string | null;
  short_description: string | null;
  activity_type: string;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  base_price: number;
  max_participants: number;
  duration_hours: number | null;
  difficulty: string | null;
  photos: string[];
  included: string[];
  season_start: string | null;
  season_end: string | null;
  // ID на внешних платформах
  tripster_experience_id: string | null;
  avito_listing_id: string | null;
  sputnik8_product_id: string | null;
}

export interface ChannelBooking {
  external_id: string;
  channel: ChannelName;
  tour_id: number;
  status: 'new' | 'confirmed' | 'cancelled';
  tourist_name: string;
  tourist_email: string;
  tourist_phone: string;
  participants: number;
  booking_date: string;   // YYYY-MM-DD
  amount: number;
  raw_payload: Record<string, unknown>;
}

export interface PushBookingInput {
  tour: ChannelTour;
  tourist_name: string;
  tourist_email: string;
  tourist_phone: string;
  participants: number;
  booking_date: string;
  booking_time?: string;  // HH:MM:SS
  message?: string;
}

export interface PushBookingResult {
  success: boolean;
  external_id?: string;
  error?: string;
}

export interface ChannelAdapter {
  name: ChannelName;
  pushBooking(input: PushBookingInput): Promise<PushBookingResult>;
  pollOrders(since: Date): Promise<ChannelBooking[]>;
}
