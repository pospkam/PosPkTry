/**
 * Discovery Types
 */

export interface Tour {
  id: string;
  name: string;
  description: string;
  category: TourCategory;
  difficulty: DifficultyLevel;
  duration: number; // в часах
  price: number;
  availableSlots: number;
  totalSlots: number;
  image: string;
  location: Location;
  dates: AvailableDate[];
  guides: Guide[];
  reviews?: Review[];
}

export enum TourCategory {
  HIKING = 'hiking',
  FISHING = 'fishing',
  BEAR_WATCHING = 'bear_watching',
  EXTREME = 'extreme',
  CULTURAL = 'cultural',
  RELAXATION = 'relaxation',
}

export enum DifficultyLevel {
  EASY = 'easy',
  MODERATE = 'moderate',
  HARD = 'hard',
  EXTREME = 'extreme',
}

export interface Location {
  name: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  description: string;
}

export interface AvailableDate {
  id: string;
  date: Date;
  availableSlots: number;
  totalSlots: number;
  price: number;
}

export interface Guide {
  id: string;
  name: string;
  experience: number; // лет
  languages: string[];
  rating: number;
  reviews: number;
}

export interface Review {
  id: string;
  rating: number;
  comment: string;
  author: string;
  date: Date;
}

export interface Accommodation {
  id: string;
  name: string;
  type: AccommodationType;
  location: Location;
  rating: number;
  reviews: number;
  price: number;
  amenities: string[];
}

export enum AccommodationType {
  HOTEL = 'hotel',
  HOSTEL = 'hostel',
  GUEST_HOUSE = 'guest_house',
  CABIN = 'cabin',
  CAMP = 'camp',
}

export interface Transport {
  id: string;
  name: string;
  type: TransportType;
  from: Location;
  to: Location;
  schedule: Schedule[];
  price: number;
}

export enum TransportType {
  CAR = 'car',
  BUS = 'bus',
  HELICOPTER = 'helicopter',
  BOAT = 'boat',
}

export interface Schedule {
  id: string;
  departureTime: Date;
  arrivalTime: Date;
  duration: number;
  availableSeats: number;
  totalSeats: number;
}
