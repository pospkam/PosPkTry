/**
 * IndexedDB хранилище офлайн-данных KamchatourHub.
 * Использует idb (Jake Archibald) как обёртку над IndexedDB API.
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { RegionId } from '@/lib/geo/regions';

// ─── Schema ──────────────────────────────────────────────────────────────────

export interface RegionMeta {
  id: RegionId;
  downloadedAt: number;
  version: number;
  tilesCount: number;
  routesCount: number;
  sizeBytes: number;
}

export interface OfflineRoute {
  id: string;
  regionId: RegionId;
  title: string;
  description: string;
  lat: number;
  lng: number;
  kind: string;
  category: string | null;
  locationType: string | null;
  activityType: string | null;
  sourceUrl: string | null;
  sourceName: string | null;
  priceFrom: number | null;
  difficulty: string | null;
  durationDays: number | null;
  bestMonths: number[] | null;
  geometry: { type: string; coordinates: [number, number][]; color?: string; weight?: number } | null;
  cachedAt: number;
}

export interface SosContact {
  id: string;
  name: string;
  phone: string;
  type: 'mchs' | 'rescue' | 'medical' | 'park' | 'other';
  region?: RegionId;
}

interface KamchatourDB extends DBSchema {
  regions: {
    key: RegionId;
    value: RegionMeta;
  };
  routes: {
    key: string;
    value: OfflineRoute;
    indexes: { 'by-region': RegionId };
  };
  sosContacts: {
    key: string;
    value: SosContact;
  };
}

// ─── DB singleton ─────────────────────────────────────────────────────────────

const DB_NAME = 'kamchatour-offline';
const DB_VERSION = 1;

let _db: IDBPDatabase<KamchatourDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<KamchatourDB>> {
  if (_db) return _db;

  _db = await openDB<KamchatourDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('regions')) {
        db.createObjectStore('regions', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('routes')) {
        const store = db.createObjectStore('routes', { keyPath: 'id' });
        store.createIndex('by-region', 'regionId');
      }
      if (!db.objectStoreNames.contains('sosContacts')) {
        db.createObjectStore('sosContacts', { keyPath: 'id' });
      }
    },
  });

  return _db;
}

// ─── Regions ─────────────────────────────────────────────────────────────────

export async function saveRegion(meta: RegionMeta): Promise<void> {
  const db = await getDB();
  await db.put('regions', meta);
}

export async function getRegion(id: RegionId): Promise<RegionMeta | undefined> {
  const db = await getDB();
  return db.get('regions', id);
}

export async function listRegions(): Promise<RegionMeta[]> {
  const db = await getDB();
  return db.getAll('regions');
}

export async function deleteRegion(id: RegionId): Promise<void> {
  const db = await getDB();
  // Удаляем метаданные региона
  await db.delete('regions', id);

  // Удаляем все маршруты региона
  const tx = db.transaction('routes', 'readwrite');
  const index = tx.store.index('by-region');
  const keys = await index.getAllKeys(id);
  await Promise.all(keys.map((k) => tx.store.delete(k)));
  await tx.done;
}

// ─── Routes ──────────────────────────────────────────────────────────────────

export async function saveRoutes(routes: OfflineRoute[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('routes', 'readwrite');
  await Promise.all(routes.map((r) => tx.store.put(r)));
  await tx.done;
}

export async function getRoutesByRegion(regionId: RegionId): Promise<OfflineRoute[]> {
  const db = await getDB();
  return db.getAllFromIndex('routes', 'by-region', regionId);
}

export async function getAllOfflineRoutes(): Promise<OfflineRoute[]> {
  const db = await getDB();
  return db.getAll('routes');
}

export async function deleteRoutesByRegion(regionId: RegionId): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('routes', 'readwrite');
  const index = tx.store.index('by-region');
  const keys = await index.getAllKeys(regionId);
  await Promise.all(keys.map((k) => tx.store.delete(k)));
  await tx.done;
}

// ─── SOS Contacts ─────────────────────────────────────────────────────────────

export async function saveSosContacts(contacts: SosContact[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('sosContacts', 'readwrite');
  await Promise.all(contacts.map((c) => tx.store.put(c)));
  await tx.done;
}

export async function getAllSosContacts(): Promise<SosContact[]> {
  const db = await getDB();
  return db.getAll('sosContacts');
}

export async function getSosContactsByRegion(regionId: RegionId): Promise<SosContact[]> {
  const db = await getDB();
  const all = await db.getAll('sosContacts');
  return all.filter((c) => !c.region || c.region === regionId);
}

// ─── Storage estimate ────────────────────────────────────────────────────────

export interface StorageEstimate {
  quota?: number;
  usage?: number;
  usagePercent?: number;
}

export async function getStorageEstimate(): Promise<StorageEstimate | null> {
  if (typeof navigator === 'undefined') return null;
  if (!('storage' in navigator) || !('estimate' in navigator.storage)) return null;

  const est = await navigator.storage.estimate();
  const quota = est.quota;
  const usage = est.usage;
  const usagePercent =
    quota && usage ? Math.round((usage / quota) * 100) : undefined;

  return { quota, usage, usagePercent };
}

// ─── Seed global SOS contacts ────────────────────────────────────────────────

/** Глобальные SOS-контакты (МЧС, скорая). Засеиваются при первом скачивании. */
export const GLOBAL_SOS_CONTACTS: SosContact[] = [
  {
    id: 'mchs-112',
    name: 'МЧС / Единый номер экстренных служб',
    phone: '112',
    type: 'mchs',
  },
  {
    id: 'mchs-kamchatka',
    name: 'МЧС Камчатский край',
    phone: '+7 (4152) 23-53-62',
    type: 'mchs',
  },
  {
    id: 'rescue-pkgo',
    name: 'ПСО «Камчатка» (ПКГО)',
    phone: '+7 (4152) 41-27-30',
    type: 'rescue',
  },
  {
    id: 'medical-emergency',
    name: 'Скорая медицинская помощь',
    phone: '103',
    type: 'medical',
  },
  {
    id: 'police',
    name: 'Полиция',
    phone: '102',
    type: 'rescue',
  },
];
