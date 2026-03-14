#!/usr/bin/env node
/**
 * scripts/process-photos.js
 *
 * Обрабатывает сырые фото для homepage:
 *   1. Скидывай фото в scripts/raw-photos/
 *   2. node scripts/process-photos.js
 *   3. Готовые файлы появятся в public/images/processed/
 *
 * Профили вывода:
 *   hero      → 1920w, 1024w, 640w (webp + jpg)
 *   activity  → 800x600 crop (webp)
 *   bento     → 1200x800 crop (webp)
 *   gallery   → 1200x900 crop (webp + jpg)
 *
 * Использование:
 *   node scripts/process-photos.js                   # обработать все из raw-photos/
 *   node scripts/process-photos.js --profile hero    # только hero-размеры
 *   node scripts/process-photos.js --file photo.jpg --profile activity
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const RAW_DIR = path.join(__dirname, 'raw-photos');
const OUT_DIR = path.join(ROOT, 'public', 'images', 'processed');

const PROFILES = {
  hero: [
    { suffix: '-1920', width: 1920, format: 'webp', quality: 82 },
    { suffix: '-1920', width: 1920, format: 'jpg',  quality: 85 },
    { suffix: '-1024', width: 1024, format: 'webp', quality: 82 },
    { suffix: '-640',  width: 640,  format: 'webp', quality: 80 },
  ],
  activity: [
    { suffix: '', width: 800, height: 600, fit: 'cover', format: 'webp', quality: 82 },
  ],
  bento: [
    { suffix: '', width: 1200, height: 800, fit: 'cover', format: 'webp', quality: 85 },
  ],
  gallery: [
    { suffix: '',      width: 1200, height: 900, fit: 'cover', format: 'webp', quality: 85 },
    { suffix: '',      width: 1200, height: 900, fit: 'cover', format: 'jpg',  quality: 88 },
  ],
};

const SUPPORTED = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.tiff', '.tif']);

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { profile: null, file: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--profile') result.profile = args[++i];
    if (args[i] === '--file')    result.file    = args[++i];
  }
  return result;
}

async function processFile(srcPath, profile, outSubdir) {
  const baseName = path.basename(srcPath, path.extname(srcPath))
    .replace(/\s+/g, '-')
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '');

  const variants = PROFILES[profile];
  if (!variants) {
    console.error(`Неизвестный профиль: ${profile}. Доступны: ${Object.keys(PROFILES).join(', ')}`);
    return;
  }

  const subdir = path.join(OUT_DIR, outSubdir || profile);
  fs.mkdirSync(subdir, { recursive: true });

  for (const v of variants) {
    const ext = v.format === 'jpg' ? 'jpg' : v.format;
    const outName = `${baseName}${v.suffix}.${ext}`;
    const outPath = path.join(subdir, outName);

    let pipeline = sharp(srcPath);

    if (v.width && v.height) {
      pipeline = pipeline.resize(v.width, v.height, { fit: v.fit || 'cover', position: 'centre' });
    } else if (v.width) {
      pipeline = pipeline.resize(v.width, null, { withoutEnlargement: true });
    }

    if (v.format === 'webp') {
      pipeline = pipeline.webp({ quality: v.quality });
    } else if (v.format === 'jpg') {
      pipeline = pipeline.jpeg({ quality: v.quality, mozjpeg: true });
    }

    await pipeline.toFile(outPath);

    const { size } = fs.statSync(outPath);
    console.log(`  ${outName.padEnd(35)} ${(size / 1024).toFixed(0).padStart(5)} KB`);
  }
}

async function main() {
  const { profile, file } = parseArgs();

  if (!fs.existsSync(RAW_DIR)) {
    fs.mkdirSync(RAW_DIR, { recursive: true });
    console.log(`Папка создана: scripts/raw-photos/`);
    console.log(`Скинь в неё фото и запусти скрипт снова.`);
    return;
  }

  const files = file
    ? [path.resolve(RAW_DIR, file)]
    : fs.readdirSync(RAW_DIR)
        .filter(f => SUPPORTED.has(path.extname(f).toLowerCase()))
        .map(f => path.join(RAW_DIR, f));

  if (!files.length) {
    console.log(`В scripts/raw-photos/ нет фото. Добавь файлы и повтори.`);
    return;
  }

  const selectedProfile = profile || 'gallery'; // дефолт если не указан
  console.log(`\nПрофиль: ${selectedProfile}`);
  console.log(`Файлов: ${files.length}\n`);

  for (const f of files) {
    if (!fs.existsSync(f)) { console.warn(`Не найден: ${f}`); continue; }
    console.log(`→ ${path.basename(f)}`);
    await processFile(f, selectedProfile, selectedProfile);
  }

  console.log(`\nГотово. Файлы в: public/images/processed/${selectedProfile}/`);
  console.log(`Скопируй нужные в public/images/activities/, bento/, hero/ и т.д.`);
}

main().catch(err => {
  console.error('Ошибка:', err.message);
  process.exit(1);
});
