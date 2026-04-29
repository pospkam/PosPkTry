const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

function makeSVG(size, maskable) {
  const cx = size / 2;
  const cy = size / 2;
  const s = size / 512;
  const rx = maskable ? Math.round(size * 0.12) : Math.round(size * 0.18);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" rx="${rx}" fill="#0f172a"/>
  <!-- Ocean wave -->
  <path d="M ${cx - 180 * s} ${cy + 100 * s} Q ${cx - 90 * s} ${cy + 120 * s} ${cx} ${cy + 100 * s} Q ${cx + 90 * s} ${cy + 80 * s} ${cx + 180 * s} ${cy + 100 * s}" stroke="#38bdf8" stroke-width="${4 * s}" fill="none"/>
  <!-- Main volcano -->
  <polygon points="${cx - 140 * s},${cy + 80 * s} ${cx - 20 * s},${cy - 100 * s} ${cx + 100 * s},${cy + 80 * s}" fill="#e76f2e"/>
  <!-- Snow cap -->
  <polygon points="${cx - 20 * s},${cy - 100 * s} ${cx - 40 * s},${cy - 50 * s} ${cx + 10 * s},${cy - 50 * s}" fill="#ffffff"/>
  <!-- Second volcano -->
  <polygon points="${cx + 40 * s},${cy + 80 * s} ${cx + 140 * s},${cy - 40 * s} ${cx + 200 * s},${cy + 80 * s}" fill="#d45a1e"/>
  <!-- KH text -->
  <text x="${cx}" y="${cy + 140 * s}" font-family="sans-serif" font-size="${56 * s}" font-weight="bold" fill="#ffffff" text-anchor="middle">KH</text>
  </svg>`;
}

async function createIcon(size, filename, maskable) {
  const svg = makeSVG(size, maskable);
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(path.join('/root/PosPkTry/public/icons', filename));
  const stats = fs.statSync(path.join('public/icons', filename));
  console.log(`Created ${filename}: ${size}x${size}, ${Math.round(stats.size / 1024)}KB`);
}

(async () => {
  fs.mkdirSync('/root/PosPkTry/public/icons', { recursive: true });
  await createIcon(192, 'icon-192.png', false);
  await createIcon(512, 'icon-512.png', false);
  await createIcon(512, 'icon-maskable-512.png', true);
  await createIcon(180, 'apple-touch-icon.png', false);
  console.log('All 4 icons created!');
})();
