/**
 * Planner types — shared between PlannerClient and extracted components.
 */

export type TransportType = 'walking' | 'jeep' | 'helicopter' | 'boat';
export type DayType = 'arrival' | 'activity' | 'travel' | 'rest' | 'buffer' | 'departure';
export type FitnessLevel = 'beginner' | 'moderate' | 'active';
export type BudgetTier = 'economy' | 'comfort' | 'premium';
export type MobileTab = 'plan' | 'map';

export interface SelectItem {
  id: string;
  label: string;
  Icon: React.ElementType;
}

export interface DayPlan {
  day: number;
  type: DayType;
  zone: 'avachinsky' | 'western' | 'eastern' | 'northern';
  title: string;
  description: string;
  activityType: string;
  priceFrom: number;
  priceTo: number;
  coords: [number, number];
  defaultTransport: TransportType;
  allowedTransports: TransportType[];
  difficulty: 'easy' | 'moderate' | 'hard';
  childFriendly: boolean;
  minChildAge: number;
  dayWarnings: string[];
}

export interface TripWarning {
  type: string;
  severity: 'critical' | 'important' | 'info';
  message: string;
}

export interface PriceBreakdown {
  activities: [number, number];
  accommodation: [number, number];
  transport: [number, number];
  perPersonTotal: [number, number];
}

export interface Recommendation {
  zones: Array<{ zone: string; score: number; reason: string; crowdScore?: number }>;
  days: DayPlan[];
  warnings: TripWarning[];
  priceBreakdown: PriceBreakdown;
  itinerary: string;
}

export interface RoutePoint {
  id: string;
  title: string;
  description: string | null;
  lat: number;
  lng: number;
  activity_type: string | null;
  location_type: string | null;
  zone: string | null;
}

export interface Partner {
  id: string;
  name: string;
  slug: string;
  rating: number;
  review_count: number;
  short_description: string;
  contacts: Array<{ name: string; phone: string; role: string }> | null;
  has_matching_tours: boolean;
}

export interface TourPreview {
  id: string;
  title: string;
  base_price: string;
  price_unit: string | null;
  operator_slug: string;
}

export interface ValidationResult {
  valid: boolean;
  message: string;
}
