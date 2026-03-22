#!/usr/bin/env node
/**
 * scripts/analyze-photos.js
 *
 * Анализирует фото через Claude Vision и предлагает куда их положить.
 * Использование:
 *   node scripts/analyze-photos.js              # анализ всех фото из raw-photos/
 *   node scripts/analyze-photos.js --process    # анализ + сразу обработать
 *   node scripts/analyze-photos.js --file photo.jpg
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const RAW_DIR = path.join(__dirname, 'raw-photos');
const OUT_DIR = path.join(__dirname, '..', 'public', 'images');
const SUPPORTED = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.tiff', '.tif']);

const PROFILES = {
  hero:     { width: 1920, height: null, quality: 85 },
  activity: { width: 800,  height: 600,  quality: 82 },
  bento:    { width: 1200, height: 800,  quality: 85 },
  gallery:  { width: 1200, height: 900,  quality: 85 },
};

const PROFILE_DIRS = {
  hero:     'hero',
  activity: 'activities',
  bento:    'bento',
  gallery:  'gallery',
};

const VISION_PROMPT = `Это фото для туристической платформы Камчатки (вулканы, медведи, рыбалка, море, зима, термалки).

Ответь СТРОГО в формате JSON (без markdown, без пояснений):
{
  "subject": "краткое описание что на фото (1 строка, русский)",
  "category": "одно из: volcano / fishing / sea / hotsprings / helicopter / snowmobile / jeep / trekking / bears / rafting / dogsled / winter / landscape / people",
  "profile": "одно из: hero / activity / bento / gallery",
  "filename": "snake_case имя файла без расширения (английский, без спецсимволов)",
  "quality": "одно из: excellent / good / skip"
}

Выбор profile:
- hero: горизонтальный широкий пейзаж, мощная атмосфера — для главного экрана
- activity: чёткий объект деятельности (рыбалка, снегоход, вертолёт)
- bento: красивый пейзаж, не подходящий для hero
- gallery: атмосферное фото, не подходящее для остальных профилей

quality: excellent/good — обрабатываем, skip — размыто/тёмно/нерелевантно.`;

// ── Vision: Anthropic (primary) → OpenRouter → xAI ───────────────────────────
async function callAnthropic(base64) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
          { type: 'text', text: VISION_PROMPT },
        ],
      }],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data?.content?.[0]?.text ?? '';
  const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  return JSON.parse(clean);
}

async function callVisionAPI(base64, apiKey, baseUrl, model) {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
          { type: 'text', text: VISION_PROMPT },
        ],
      }],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${model} ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? '';
  const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  return JSON.parse(clean);
}

async function analyzeWithClaude(imgPath) {
  const thumbBuf = await sharp(imgPath)
    .resize(768, null, { withoutEnlargement: true })
    .jpeg({ quality: 75 })
    .toBuffer();
  const base64 = thumbBuf.toString('base64');

  if (process.env.ANTHROPIC_API_KEY)   return callAnthropic(base64);
  if (process.env.OPENROUTER_API_KEY)  return callVisionAPI(base64, process.env.OPENROUTER_API_KEY, 'https://openrouter.ai/api/v1', 'anthropic/claude-haiku-4-5');
  throw new Error('Нужен ANTHROPIC_API_KEY или OPENROUTER_API_KEY');
}

// ── Обработка одного файла ────────────────────────────────────────────────────
async function processFile(srcPath, result) {
  const { profile, filename } = result;
  const cfg = PROFILES[profile];
  const dir = path.join(OUT_DIR, PROFILE_DIRS[profile]);
  fs.mkdirSync(dir, { recursive: true });

  let pipeline = sharp(srcPath);

  if (cfg.height) {
    pipeline = pipeline.resize(cfg.width, cfg.height, { fit: 'cover', position: 'centre' });
  } else {
    pipeline = pipeline.resize(cfg.width, null, { withoutEnlargement: true });
  }

  const outPath = path.join(dir, `${filename}.webp`);
  await pipeline.webp({ quality: cfg.quality }).toFile(outPath);
  const { size } = fs.statSync(outPath);
  return { outPath: outPath.replace(path.join(__dirname, '..', 'public'), ''), size };
}

// ── Главная ───────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const doProcess = args.includes('--process');
  const fileArg = args[args.indexOf('--file') + 1];

  if (!fs.existsSync(RAW_DIR)) {
    fs.mkdirSync(RAW_DIR, { recursive: true });
    console.log('Папка создана: scripts/raw-photos/');
    console.log('Добавь фото и запусти снова.');
    return;
  }

  const files = fileArg
    ? [path.join(RAW_DIR, fileArg)]
    : fs.readdirSync(RAW_DIR)
        .filter(f => SUPPORTED.has(path.extname(f).toLowerCase()))
        .map(f => path.join(RAW_DIR, f));

  if (!files.length) {
    console.log('Нет фото в scripts/raw-photos/');
    return;
  }

  console.log(`\nАнализ ${files.length} фото через Claude Vision...\n`);

  const results = [];
  for (const f of files) {
    process.stdout.write(`  ${path.basename(f).padEnd(40)}`);
    try {
      const analysis = await analyzeWithClaude(f);
      results.push({ file: f, ...analysis });

      const qual = analysis.quality === 'skip' ? '  SKIP' : '  OK  ';
      console.log(`${qual}  [${analysis.profile.padEnd(8)}]  ${analysis.subject}`);
    } catch (e) {
      console.log(`  ERR   ${e.message}`);
    }
  }

  console.log('\n─────────────────────────────────────────────────────────');
  console.log('Результаты:\n');
  console.log('  Файл'.padEnd(42) + 'Профиль    Имя файла                  Качество');
  console.log('  ' + '─'.repeat(80));

  for (const r of results) {
    if (!r.category) continue;
    const name = path.basename(r.file);
    const skip = r.quality === 'skip' ? '  (SKIP)' : '';
    console.log(
      `  ${name.padEnd(40)} ${r.profile.padEnd(10)} ${r.filename.padEnd(30)}${skip}`
    );
  }

  if (doProcess) {
    console.log('\n─────────────────────────────────────────────────────────');
    console.log('Обработка...\n');

    for (const r of results) {
      if (!r.profile || r.quality === 'skip') continue;
      try {
        const { outPath, size } = await processFile(r.file, r);
        console.log(`  ${outPath.padEnd(55)} ${(size / 1024).toFixed(0).padStart(5)} KB`);
      } catch (e) {
        console.log(`  ОШИБКА ${path.basename(r.file)}: ${e.message}`);
      }
    }

    console.log('\nГотово. Проверь public/images/ и при необходимости переименуй.');
  } else {
    console.log('\nДля обработки запусти с флагом --process:');
    console.log('  node scripts/analyze-photos.js --process');
  }
}

main().catch(err => {
  console.error('Ошибка:', err.message);
  process.exit(1);
});
