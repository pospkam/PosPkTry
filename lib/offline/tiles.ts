/**
 * Утилиты генерации URL тайлов OpenTopoMap для офлайн-скачивания.
 * Zoom levels 7-12: достаточно для общего обзора и навигации на маршруте.
 * Zoom 5-6 перекрываются между регионами и избыточны.
 * Zoom 13+ растёт квадратично: 1 регион = несколько ГБ.
 */

import type { RegionBbox } from '@/lib/geo/regions';

export const TILE_HOST = 'tile.opentopomap.org';
export const TILE_ZOOM_MIN = 7;
export const TILE_ZOOM_MAX = 12;
export const TILE_ZOOM_LEVELS: number[] = [7, 8, 9, 10, 11, 12];

/** Конвертация долготы в номер тайла X */
export function lonToTile(lon: number, zoom: number): number {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
}

/** Конвертация широты в номер тайла Y (Web Mercator) */
export function latToTile(lat: number, zoom: number): number {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) *
      Math.pow(2, zoom)
  );
}

/** Подсчёт количества тайлов для bbox на конкретном zoom */
export function countTilesForZoom(bbox: RegionBbox, zoom: number): number {
  const minX = lonToTile(bbox.west, zoom);
  const maxX = lonToTile(bbox.east, zoom);
  const minY = latToTile(bbox.north, zoom);
  const maxY = latToTile(bbox.south, zoom);
  return (maxX - minX + 1) * (maxY - minY + 1);
}

/** Подсчёт общего числа тайлов для всех zoom levels */
export function countTotalTiles(
  bbox: RegionBbox,
  zoomLevels: number[] = TILE_ZOOM_LEVELS
): number {
  return zoomLevels.reduce((sum, z) => sum + countTilesForZoom(bbox, z), 0);
}

/**
 * Генерирует массив URL тайлов OpenTopoMap для bbox на заданных zoom уровнях.
 * Порядок: от меньшего zoom к большему (сначала общий вид, потом детали).
 */
export function generateTileUrls(
  bbox: RegionBbox,
  zoomLevels: number[] = TILE_ZOOM_LEVELS
): string[] {
  const urls: string[] = [];

  for (const z of zoomLevels) {
    const minX = lonToTile(bbox.west, z);
    const maxX = lonToTile(bbox.east, z);
    // В Web Mercator: north имеет МЕНЬШИЙ Y
    const minY = latToTile(bbox.north, z);
    const maxY = latToTile(bbox.south, z);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        urls.push(`https://${TILE_HOST}/${z}/${x}/${y}.png`);
      }
    }
  }

  return urls;
}

/**
 * Оценка размера тайлов в МБ.
 * Средний тайл OpenTopoMap ~10 КБ на низких zoom, ~25 КБ на высоких.
 */
export function estimateTilesMb(bbox: RegionBbox): number {
  const avgKbPerZoom: Record<number, number> = {
    7:  6,
    8:  8,
    9:  10,
    10: 15,
    11: 20,
    12: 25,
  };

  let totalKb = 0;
  for (const z of TILE_ZOOM_LEVELS) {
    const count = countTilesForZoom(bbox, z);
    totalKb += count * (avgKbPerZoom[z] ?? 15);
  }

  return Math.round(totalKb / 1024);
}

/** Прозрачный 1×1 PNG в base64 — fallback при офлайн если тайла нет в кэше */
export const TRANSPARENT_1X1_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

export const TRANSPARENT_PNG_DATA_URL = `data:image/png;base64,${TRANSPARENT_1X1_PNG}`;
