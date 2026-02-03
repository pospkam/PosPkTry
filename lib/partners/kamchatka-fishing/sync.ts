/**
 * Синхронизация данных с Камчатская Рыбалка
 */

import { 
  KamchatkaFishingClient, 
  FishingTour, 
  getKamchatkaFishingClient 
} from './client';

export interface SyncResult {
  success: boolean;
  toursImported: number;
  toursUpdated: number;
  errors: string[];
  syncedAt: string;
}

export interface TourMapping {
  externalId: string;
  internalId: string;
  lastSynced: string;
}

/**
 * Преобразование тура из формата Камчатской Рыбалки в формат Kamhub
 */
export function transformFishingTour(tour: FishingTour) {
  return {
    external_id: tour.id,
    partner_id: 'kamchatka-fishing',
    name: tour.name,
    description: tour.description,
    price: tour.price,
    duration_hours: tour.duration * 24, // дни в часы
    location: tour.location,
    coordinates: tour.coordinates ? {
      lat: tour.coordinates.lat,
      lng: tour.coordinates.lng,
    } : null,
    category: 'fishing',
    tags: tour.fishTypes,
    season_start: tour.season.start,
    season_end: tour.season.end,
    max_participants: tour.maxParticipants,
    includes: tour.includes,
    requirements: tour.requirements,
    images: tour.images,
    difficulty: tour.difficulty,
    rating: tour.rating || 0,
    reviews_count: tour.reviewsCount || 0,
    is_active: true,
    source: 'kamchatka-fishing',
  };
}

/**
 * Синхронизация туров
 */
export async function syncTours(client?: KamchatkaFishingClient): Promise<SyncResult> {
  const fishingClient = client || getKamchatkaFishingClient();
  const result: SyncResult = {
    success: false,
    toursImported: 0,
    toursUpdated: 0,
    errors: [],
    syncedAt: new Date().toISOString(),
  };

  try {
    const tours = await fishingClient.getTours();
    
    for (const tour of tours) {
      try {
        const transformedTour = transformFishingTour(tour);
        
        // Здесь должна быть логика сохранения в БД
        // Пока просто считаем
        result.toursImported++;
        
      } catch (error) {
        result.errors.push(`Tour ${tour.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    result.success = result.errors.length === 0;
    
  } catch (error) {
    result.errors.push(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}

/**
 * Получить статус последней синхронизации
 */
export async function getSyncStatus(): Promise<{
  lastSync: string | null;
  toursCount: number;
  status: 'ok' | 'error' | 'never';
}> {
  // TODO: Получить из БД
  return {
    lastSync: null,
    toursCount: 0,
    status: 'never',
  };
}
