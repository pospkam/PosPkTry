#!/usr/bin/env node
/**
 * Прямой запуск seismic ingest + danger analysis для демо
 * Использует node + fetch для обхода tsx env-проблемы
 */
const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ── Парсер сообщений Telegram ────────────────────────────────────────────

const VOLCANO_ZONES = {
  'шивелуч':    ['northern'],
  'ключевской': ['northern'],
  'безымянный': ['northern'],
  'камень':     ['northern'],
  'толбачик':   ['northern'],
  'авачинский': ['avachinsky'],
  'корякский':  ['avachinsky'],
  'мутновский': ['avachinsky'],
  'горелый':    ['avachinsky'],
  'вилючинский':['avachinsky'],
  'карымский':  ['eastern'],
  'кроноцкий':  ['eastern'],
  'узон':       ['eastern'],
  'ичинский':   ['western'],
};

async function fetchChannel(channel) {
  const res = await fetch(`https://t.me/s/${channel}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KamchatourBot/1.0)' },
    signal: AbortSignal.timeout(15000),
  });
  return res.text();
}

function extractMessages(html) {
  const messages = [];
  const allDates = [...html.matchAll(/href="https:\/\/t\.me\/([^/]+)\/(\d+)"[^>]*><time[^>]+datetime="([^"]+)"/g)];
  const allTexts = [...html.matchAll(/class="tgme_widget_message_text js-message_text[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<\/div>|<a class)/g)];

  for (let i = 0; i < Math.min(allDates.length, 30); i++) {
    const d = allDates[i], t = allTexts[i];
    if (!d || !t) continue;
    const text = t[1]
      .replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
    if (text.length < 20) continue;
    messages.push({ id: `t.me/${d[1]}/${d[2]}`, text, datetime: d[3] });
  }
  return messages;
}

function classifyMessage(id, text, datetime) {
  const eruptionPattern = /(?:вулкан[е]?\s+)([\wА-Яа-яЁё-]+).*(?:пепловый выброс|извержение)|(?:извержение).*вулкан[а]?\s+([\wА-Яа-яЁё-]+)/i;
  const match = text.match(eruptionPattern);
  if (match) {
    const volcRaw = (match[1] || match[2] || 'шивелуч').toLowerCase().trim();
    const volcName = volcRaw.charAt(0).toUpperCase() + volcRaw.slice(1);
    const hmatch = text.match(/(\d[\d\s]+)\s*м\s*над\s+уровнем\s+моря/i);
    const ashH = hmatch ? parseInt(hmatch[1].replace(/\s/g, '')) : undefined;
    const zones = VOLCANO_ZONES[volcRaw] || ['avachinsky'];
    const sev = ashH ? (ashH >= 10000 ? 3 : ashH >= 7000 ? 2 : ashH >= 4000 ? 1 : 0) : 1;
    return {
      source_id: id, source_url: `https://${id}`, published_at: new Date(datetime),
      alert_type: 'volcanic_eruption', severity: sev,
      title: `Извержение ${volcName}${ashH ? ` — ${(ashH/1000).toFixed(1)} км` : ''}`,
      description: text.slice(0, 600), affected_zones: zones, expires_hours: sev >= 2 ? 48 : 24,
    };
  }
  const eqMatch = text.match(/ML\s*=?\s*(\d+\.?\d*)|MW\s*=?\s*(\d+\.?\d*)/i);
  if (eqMatch) {
    const mag = parseFloat(eqMatch[1] || eqMatch[2]);
    if (isNaN(mag) || mag < 1) return null;
    const isBulletin = /за неделю|сейсмическая обстановка/i.test(text);
    const sev = mag >= 7 ? 3 : mag >= 6 ? 2 : mag >= 5 ? 1 : 0;
    return {
      source_id: id, source_url: `https://${id}`, published_at: new Date(datetime),
      alert_type: isBulletin ? 'seismic_bulletin' : 'earthquake', severity: sev,
      title: isBulletin ? `Сейсмобюллетень КБГС — до ML ${mag}` : `Землетрясение ML ${mag} — Камчатка`,
      description: text.slice(0, 600), affected_zones: ['avachinsky'],
      expires_hours: isBulletin ? 168 : sev >= 2 ? 48 : 24, magnitude: mag,
    };
  }
  return null;
}

async function saveEvent(ev) {
  const expires = new Date(ev.published_at);
  expires.setHours(expires.getHours() + ev.expires_hours);
  const r = await pool.query(
    `INSERT INTO external_alerts (alert_type,severity,title,description,affected_zones,created_at,expires_at,source_url,external_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (external_id) DO NOTHING RETURNING id`,
    [ev.alert_type, ev.severity, ev.title, ev.description, ev.affected_zones,
     ev.published_at, expires, ev.source_url, ev.source_id]
  );
  return r.rowCount > 0 ? 'inserted' : 'skipped';
}

async function main() {
  const channels = ['kbgsras', 'eqkam'];
  let total = 0, inserted = 0;

  for (const ch of channels) {
    console.log(`\nПарсим t.me/s/${ch}...`);
    try {
      const html = await fetchChannel(ch);
      const msgs = extractMessages(html);
      for (const m of msgs) {
        const ev = classifyMessage(m.id, m.text, m.datetime);
        if (!ev) continue;
        total++;
        const status = await saveEvent(ev);
        if (status === 'inserted') inserted++;
        console.log(` ${status === 'inserted' ? '+' : '~'} [${ev.alert_type}] sev=${ev.severity} ${ev.title.slice(0,60)}`);
      }
    } catch(e) { console.error(`  ОШИБКА ${ch}:`, e.message); }
  }

  console.log(`\nИтого: найдено ${total}, записано ${inserted}`);

  // Проверяем что попало в БД
  const { rows } = await pool.query(`SELECT alert_type, severity, title, created_at FROM external_alerts ORDER BY created_at DESC LIMIT 10`);
  console.log('\nПоследние алерты в БД:');
  rows.forEach(r => console.log(` - [${r.alert_type}] sev=${r.severity} ${r.title}`));

  await pool.end();
}

main().catch(e => { console.error(e); pool.end(); });
