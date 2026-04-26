/**
 * Kamchatka geography constants and utilities.
 * No reverse geocoding — rough region names by bounding box.
 */

export const KAMCHATKA_BBOX = {
  south: 50.0,
  north: 62.0,
  west: 155.0,
  east: 175.0,
} as const;

export const KAMCHATKA_CENTER = { lat: 56.0, lng: 159.0 } as const;

export type GeoMode = 'planning' | 'on-site' | 'unknown';

export type UserLocation = {
  lat: number;
  lng: number;
  accuracy: number; // meters
  timestamp: number; // ms
};

export function isInKamchatka(lat: number, lng: number): boolean {
  return (
    lat >= KAMCHATKA_BBOX.south &&
    lat <= KAMCHATKA_BBOX.north &&
    lng >= KAMCHATKA_BBOX.west &&
    lng <= KAMCHATKA_BBOX.east
  );
}

export function regionName(lat: number, lng: number): string {
  if (!isInKamchatka(lat, lng)) return 'вне Камчатки';
  // Грубое деление, без reverse geocoding
  if (lat > 58.5) return 'север Камчатки';
  if (lat < 53.5) return 'юг Камчатки';
  if (lng > 161.5) return 'восточное побережье';
  if (lng < 157.5) return 'западное побережье';
  return 'центральная Камчатка';
}

/**
 * Haversine distance in km between two lat/lng points.
 */
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
