/**
 * GET /api/widget/lead.js?partner=SLUG
 * Returns embeddable JavaScript for partner lead-form widget.
 *
 * Usage on partner site:
 *   <script src="https://tourhab.ru/api/widget/lead.js?partner=gorybkoleno" defer></script>
 *
 * The script injects a floating "Заявка на тур" button and a modal with
 * an iframe pointing to /widget/lead-form/SLUG (same-origin form, no CORS needed).
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

interface PartnerRow {
  name: string;
  slug: string;
  widget_config: Record<string, string> | null;
  widget_domains: string[];
}

function jsStr(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
}

function corsHeaders(origin: string | null, domains: string[]): Record<string, string> {
  const h: Record<string, string> = {
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'public, max-age=300',
  };
  if (!origin) return h;
  try {
    const host = new URL(origin).hostname;
    const ok = domains.some(d => {
      const clean = d.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      return host === clean || host.endsWith(`.${clean}`);
    });
    if (ok) h['Access-Control-Allow-Origin'] = origin;
  } catch { /* skip */ }
  return h;
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('partner') ?? '';

  if (!slug || slug.length > 100 || !/^[\w-]+$/.test(slug)) {
    return new NextResponse('/* invalid partner slug */', {
      status: 400,
      headers: { 'Content-Type': 'application/javascript; charset=utf-8' },
    });
  }

  const { rows } = await pool.query<PartnerRow>(
    `SELECT name, slug, widget_config, widget_domains
     FROM partners
     WHERE slug = $1 AND widget_enabled = true
     LIMIT 1`,
    [slug]
  );

  const p = rows[0];
  if (!p) {
    return new NextResponse('/* partner not found or widget disabled */', {
      status: 404,
      headers: { 'Content-Type': 'application/javascript; charset=utf-8' },
    });
  }

  const cfg = p.widget_config ?? {};
  const accent       = cfg.accentColor  ?? '#D44A0C';
  const buttonText   = cfg.buttonText   ?? 'Заявка на тур';
  const position     = cfg.position     ?? 'right'; // 'right' | 'left'

  const BASE = 'https://tourhab.ru';

  const js = `
(function () {
  if (window.__th_widget_${jsStr(slug)}) return;
  window.__th_widget_${jsStr(slug)} = true;

  var SLUG = '${jsStr(slug)}';
  var BASE = '${jsStr(BASE)}';
  var ACCENT = '${jsStr(accent)}';
  var BTN_TEXT = '${jsStr(buttonText)}';
  var POS = '${jsStr(position)}';

  /* ── Floating button ── */
  var btn = document.createElement('button');
  btn.id = '__th_btn_' + SLUG;
  btn.textContent = BTN_TEXT;
  Object.assign(btn.style, {
    position: 'fixed',
    bottom: '24px',
    [POS === 'left' ? 'left' : 'right']: '24px',
    zIndex: '2147483646',
    background: ACCENT,
    color: '#fff',
    border: 'none',
    borderRadius: '28px',
    padding: '12px 20px',
    fontSize: '14px',
    fontFamily: "'Outfit', system-ui, sans-serif",
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
    transition: 'transform 0.15s, box-shadow 0.15s',
    lineHeight: '1.3',
  });
  btn.addEventListener('mouseenter', function () {
    btn.style.transform = 'translateY(-2px)';
    btn.style.boxShadow = '0 6px 20px rgba(0,0,0,0.24)';
  });
  btn.addEventListener('mouseleave', function () {
    btn.style.transform = '';
    btn.style.boxShadow = '0 4px 16px rgba(0,0,0,0.18)';
  });

  /* ── Modal overlay ── */
  var overlay = document.createElement('div');
  overlay.id = '__th_overlay_' + SLUG;
  Object.assign(overlay.style, {
    display: 'none',
    position: 'fixed',
    inset: '0',
    zIndex: '2147483647',
    background: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
  });

  /* ── Iframe wrapper ── */
  var wrap = document.createElement('div');
  Object.assign(wrap.style, {
    position: 'relative',
    width: '100%',
    maxWidth: '420px',
    background: '#fff',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 24px 64px rgba(0,0,0,0.32)',
  });

  /* ── Close button ── */
  var closeBtn = document.createElement('button');
  closeBtn.innerHTML = '&times;';
  Object.assign(closeBtn.style, {
    position: 'absolute',
    top: '10px',
    right: '14px',
    zIndex: '1',
    background: 'transparent',
    border: 'none',
    fontSize: '22px',
    lineHeight: '1',
    cursor: 'pointer',
    color: '#6B6560',
  });

  /* ── Iframe ── */
  var iframe = document.createElement('iframe');
  iframe.src = BASE + '/widget/lead-form/' + encodeURIComponent(SLUG);
  iframe.scrolling = 'no';
  Object.assign(iframe.style, {
    display: 'block',
    width: '100%',
    height: '440px',
    border: 'none',
  });
  iframe.setAttribute('loading', 'lazy');
  iframe.setAttribute('title', 'Форма заявки на тур');

  wrap.appendChild(closeBtn);
  wrap.appendChild(iframe);
  overlay.appendChild(wrap);

  /* ── Open / close logic ── */
  function open() { overlay.style.display = 'flex'; }
  function close() { overlay.style.display = 'none'; }

  btn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) close();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') close();
  });

  /* ── PostMessage from iframe ── */
  window.addEventListener('message', function (e) {
    if (e.origin !== BASE) return;
    if (e.data === 'th:close' || e.data === 'th:success') close();
  });

  /* ── Mount ── */
  document.body.appendChild(btn);
  document.body.appendChild(overlay);
})();
`.trim();

  const origin = request.headers.get('origin');
  return new NextResponse(js, { headers: corsHeaders(origin, p.widget_domains) });
}
