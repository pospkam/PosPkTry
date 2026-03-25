/**
 * GET /api/widget/partner/[partnerId]
 * Public endpoint — returns partner config for widget embedding.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { safeMsg } from '@/lib/errors/sanitize';

export const dynamic = 'force-dynamic';

interface PartnerWidgetRow {
  name: string;
  category: string;
  short_description: string | null;
  logo_image: string | null;
  widget_config: Record<string, unknown>;
  widget_domains: string[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ partnerId: string }> }
) {
  try {
    const { partnerId } = await params;

    if (!partnerId || partnerId.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Invalid partnerId' },
        { status: 400 }
      );
    }

    const result = await query<PartnerWidgetRow>(
      `SELECT name, category, short_description, logo_image, widget_config, widget_domains
       FROM partners
       WHERE slug = $1 AND widget_enabled = true
       LIMIT 1`,
      [partnerId]
    );

    const partner = result.rows[0];
    if (!partner) {
      return NextResponse.json(
        { success: false, error: 'Partner not found' },
        { status: 404 }
      );
    }

    const config = partner.widget_config as Record<string, string>;

    // CORS headers for widget domains
    const origin = request.headers.get('origin');
    const headers: Record<string, string> = {};
    if (origin) {
      try {
        const originHost = new URL(origin).hostname;
        const isAllowed = partner.widget_domains.some(d => {
          const clean = d.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
          return originHost === clean || originHost.endsWith(`.${clean}`);
        });
        if (isAllowed) {
          headers['Access-Control-Allow-Origin'] = origin;
        }
      } catch {
        // Invalid origin
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        name: partner.name,
        category: partner.category,
        description: partner.short_description,
        logo: partner.logo_image,
        greeting: config?.greeting || `Привет! Я AI-помощник ${partner.name}. Чем могу помочь?`,
        theme: config?.theme || 'auto',
        accentColor: config?.accentColor || '#D44A0C',
      },
    }, { headers });
  } catch (error: unknown) {
    const msg = safeMsg(error);
    return NextResponse.json(
      { success: false, error: 'Ошибка загрузки конфигурации', details: msg },
      { status: 500 }
    );
  }
}
