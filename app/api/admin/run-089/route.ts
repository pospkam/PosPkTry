/**
 * TEMP: run-089 — fix photo assignments (wrong season/activity photos)
 * DELETE after applying.
 */
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (secret !== 'fix-photos-089') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const results: string[] = [];

  try {
    // Tours 4,5,6,7,10: replace bear photo with correct fishing/accommodation photos
    const fishingFixes: Record<number, string[]> = {
      4: [
        '/images/fishingkam/2025-01-09_113928_1_.jpg',
        '/images/fishingkam/2025-01-09_114821_1.jpg',
        '/images/fishingkam/__.jpeg',
        '/images/fishingkam/_.jpeg',
        '/images/fishingkam/2025-02-10_151441.jpg',
      ],
      5: [
        '/images/fishingkam/2025-01-09_114821_1.jpg',
        '/images/fishingkam/__.jpeg',
        '/images/fishingkam/2025-01-09_113928_1_.jpg',
        '/images/fishingkam/_.jpeg',
        '/images/fishingkam/2025-02-10_151450.jpg',
      ],
      6: [
        '/images/fishingkam/__.jpeg',
        '/images/fishingkam/2025-01-09_114821_1.jpg',
        '/images/fishingkam/2025-01-09_113928_1_.jpg',
        '/images/fishingkam/_.jpeg',
        '/images/fishingkam/2025-02-10_151416.jpg',
      ],
      7: [
        '/images/fishingkam/2025-01-09_114821_1.jpg',
        '/images/fishingkam/2025-01-09_113928_1_.jpg',
        '/images/fishingkam/__.jpeg',
        '/images/fishingkam/_.jpeg',
        '/images/fishingkam/2025-02-10_151433.jpg',
      ],
      10: [
        '/images/fishingkam/2025-01-09_114821_1.jpg',
        '/images/fishingkam/__.jpeg',
        '/images/fishingkam/_.jpeg',
        '/images/fishingkam/2025-02-10_151433.jpg',
        '/images/fishingkam/2025-02-10_151450.jpg',
      ],
    };

    for (const [tourId, photos] of Object.entries(fishingFixes)) {
      await pool.query(
        'UPDATE operator_tours SET photos = $1 WHERE id = $2',
        [JSON.stringify(photos), Number(tourId)]
      );
      results.push(`Tour ${tourId}: fishing photos fixed`);
    }

    // Tour 25 (Медведи): replace geothermal volcanoes.jpg with autumn trekking landscape
    await pool.query(
      'UPDATE operator_tours SET photos = $1 WHERE id = 25',
      [JSON.stringify([
        '/images/hero/bears-kurilskoye.jpg',
        '/images/hero/IMG_20260316_133103.jpg',
        '/images/hero/IMG_20260316_133221.jpg',
        '/images/hero/IMG_20260316_133152.jpg',
      ])]
    );
    results.push('Tour 25: bears photos fixed (removed geothermal crater)');

    // Tour 26 (Долина гейзеров): replace bears photo with volcanic landscape
    await pool.query(
      'UPDATE operator_tours SET photos = $1 WHERE id = 26',
      [JSON.stringify([
        '/images/activities/volcanoes.jpg',
        '/images/hero/IMG_20260316_133026.jpg',
        '/images/hero/IMG_20260316_133152.jpg',
        '/images/hero/IMG_20260316_133221.jpg',
      ])]
    );
    results.push('Tour 26: helicopter/geyser photos fixed (removed bears photo)');

    return NextResponse.json({ ok: true, results });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg, results }, { status: 500 });
  }
}
