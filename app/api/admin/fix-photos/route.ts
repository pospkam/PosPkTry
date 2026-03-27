/**
 * TEMPORARY: Soft-delete winter tours + fix photos on remaining tours.
 * DELETE THIS FILE AFTER USE.
 */
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';

// Photos per tour — only summer/autumn + base for multi-day
const PHOTO_UPDATES: { id: number; photos: string[] }[] = [
  // Tour 4: Осенняя рыбалка (окт-ноя) — межсезонье, однодневный
  {
    id: 4,
    photos: [
      '/images/fishingkam/2025-01-09_113928_1_.jpg',
      '/images/fishingkam/2025-01-09_114821_1.jpg',
      '/images/fishingkam/__.jpeg',
      '/images/fishingkam/2025-01-09_114531_1.jpg',
      '/images/fishingkam/_.jpeg',
    ],
  },
  // Tour 5: Летняя на чавычу и нерку — лето, однодневный
  {
    id: 5,
    photos: [
      '/images/fishingkam/2025-01-09_114821_1.jpg',
      '/images/fishingkam/__.jpeg',
      '/images/fishingkam/2025-01-09_113928_1_.jpg',
      '/images/fishingkam/_.jpeg',
      '/images/fishingkam/2025-01-09_114531_1.jpg',
    ],
  },
  // Tour 6: Летняя на кижуча — лето, однодневный
  {
    id: 6,
    photos: [
      '/images/fishingkam/__.jpeg',
      '/images/fishingkam/2025-01-09_114821_1.jpg',
      '/images/fishingkam/2025-01-09_113928_1_.jpg',
      '/images/fishingkam/2025-01-09_114531_1.jpg',
      '/images/fishingkam/_.jpeg',
    ],
  },
  // Tour 7: Семейный тур выходного дня — лето, однодневный
  {
    id: 7,
    photos: [
      '/images/fishingkam/2025-01-09_114821_1.jpg',
      '/images/fishingkam/2025-01-09_113928_1_.jpg',
      '/images/fishingkam/2025-01-09_114531_1.jpg',
      '/images/fishingkam/__.jpeg',
      '/images/fishingkam/_.jpeg',
    ],
  },
  // Tour 9: Многодневный летний (5 дн) — лето, многодневный + база
  {
    id: 9,
    photos: [
      '/images/fishingkam/__.jpeg',
      '/images/fishingkam/2025-01-09_114821_1.jpg',
      '/images/fishingkam/_.jpeg',
      '/images/fishingkam/2025-02-10_151441.jpg',
      '/images/fishingkam/2025-02-10_151450.jpg',
    ],
  },
  // Tour 10: Семейный недельный — лето, многодневный + база
  {
    id: 10,
    photos: [
      '/images/fishingkam/2025-01-09_114821_1.jpg',
      '/images/fishingkam/__.jpeg',
      '/images/fishingkam/2025-01-09_114531_1.jpg',
      '/images/fishingkam/2025-02-10_151433.jpg',
      '/images/fishingkam/2025-02-10_151450.jpg',
    ],
  },
  // Tour 11: Недельный рыболовный (7 дн) — лето, многодневный + база
  {
    id: 11,
    photos: [
      '/images/fishingkam/2025-01-09_113928_1_.jpg',
      '/images/fishingkam/__.jpeg',
      '/images/fishingkam/2025-01-09_114821_1.jpg',
      '/images/fishingkam/2025-02-10_151441.jpg',
      '/images/fishingkam/2025-02-10_151433.jpg',
    ],
  },
];

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-migrate-key');
  if (secret !== 'fix-photos-086') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const results: string[] = [];

  // Step 1: Soft-delete winter tours (1, 2, 3, 8)
  try {
    const del = await pool.query(
      "UPDATE operator_tours SET deleted_at = NOW() WHERE id IN (1, 2, 3, 8) AND deleted_at IS NULL"
    );
    results.push(`Soft-deleted winter tours: ${del.rowCount} rows`);
  } catch (e) {
    results.push(`Delete error: ${e instanceof Error ? e.message : String(e)}`);
  }

  // Step 2: Fix photos on remaining tours
  for (const u of PHOTO_UPDATES) {
    try {
      const r = await pool.query(
        'UPDATE operator_tours SET photos = $1 WHERE id = $2 AND deleted_at IS NULL',
        [u.photos, u.id]
      );
      results.push(`Tour ${u.id}: photos OK (${r.rowCount} row)`);
    } catch (e) {
      results.push(`Tour ${u.id}: ERROR: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return NextResponse.json({ success: true, results });
}
