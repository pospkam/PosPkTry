// Парсинг idilesom.com/kam/places через Bright Data Web Unlocker
// Запуск: node scrape-idilesom.js
// Результат: idilesom-tours.json

const API_TOKEN = "eaf70e24-b62f-4a8d-a0b2-9eb760f3f7ec";

const CATEGORIES = [
  { id: 133, slug: "volcanoes",  name: "Вулканы" },
  { id: 146, slug: "thermal",   name: "Горячие источники" },
  { id: 145, slug: "mud",       name: "Грязевые источники" },
  { id: 128, slug: "mountains", name: "Горы и пики" },
  { id: 147, slug: "rivers",    name: "Реки" },
  { id: 148, slug: "lakes",     name: "Озёра" },
  { id: 212, slug: "eco",       name: "Эко-маршруты" },
  { id: 180, slug: "geysers",   name: "Гейзеры" },
];

async function fetchViaUnlocker(url) {
  const resp = await fetch("https://api.brightdata.com/request", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_TOKEN}`,
    },
    body: JSON.stringify({
      zone: "unlocker",
      url,
      format: "raw",
    }),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);
  return resp.text();
}

function parseList(html) {
  const items = [];
  // Ищем карточки маршрутов
  const cardRegex = /href="\/kam\/places\/(\d+)"[^>]*>[\s\S]*?<div[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
  let m;
  while ((m = cardRegex.exec(html)) !== null) {
    items.push({ id: m[1], title: m[2].replace(/<[^>]+>/g, "").trim() });
  }
  // Fallback: просто ищем все ссылки на маршруты
  if (items.length === 0) {
    const linkRegex = /href="\/kam\/places\/(\d+)"/g;
    const seen = new Set();
    while ((m = linkRegex.exec(html)) !== null) {
      if (!seen.has(m[1])) { seen.add(m[1]); items.push({ id: m[1] }); }
    }
  }
  return items;
}

function parseDetail(html, id) {
  const get = (regex) => { const m = html.match(regex); return m ? m[1].replace(/<[^>]+>/g, "").trim() : null; };

  const title = get(/<h1[^>]*>([\s\S]*?)<\/h1>/) ||
                get(/class="[^"]*place-title[^"]*"[^>]*>([\s\S]*?)<\//) ;

  const district = get(/Район[^:]*:\s*<[^>]*>([\s\S]*?)<\//) ||
                   get(/([А-Яа-я]+ р-н)/);

  const length = get(/(\d+[\.,]\d+)\s*км/) ;
  const duration = get(/(Целый день|Несколько часов|Несколько дней|Больше недели)/i);

  // Описание
  const desc = get(/class="[^"]*description[^"]*"[^>]*>([\s\S]{20,500}?)<\//) ||
               get(/class="[^"]*text[^"]*"[^>]*>([\s\S]{20,400}?)<\//);

  // Координаты из Яндекс/Google карт ссылок или meta
  const coords = html.match(/[-+]?\d{2,3}\.\d{4,}[,\s]+[-+]?\d{2,3}\.\d{4,}/);
  const lat = coords ? parseFloat(coords[0].split(/[,	\s]+/)[0]) : null;
  const lng = coords ? parseFloat(coords[0].split(/[,	\s]+/)[1]) : null;

  // Изображения
  const imgs = [];
  const imgRegex = /src="(https?:\/\/[^\"]+\.(jpg|jpeg|png|webp)[^\"]*)"/g;
  let im;
  while ((im = imgRegex.exec(html)) !== null) {
    if (!im[1].includes("icon") && !im[1].includes("logo") && !im[1].includes("avatar")) {
      imgs.push(im[1]);
    }
    if (imgs.length >= 5) break;
  }

  return { id, title, district, length_km: length ? parseFloat(length.replace(",", ".")) : null, duration, description: desc, lat, lng, images: imgs };
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const results = {};
  let totalRequests = 0;

  for (const cat of CATEGORIES) {
    console.log(`\n=== ${cat.name} (activites=${cat.id}) ===`);
    results[cat.slug] = { name: cat.name, items: [] };

    const listUrl = `https://idilesom.com/kam/places?activites=${cat.id}&features=0`;
    let listHtml;
    try {
      listHtml = await fetchViaUnlocker(listUrl);
      totalRequests++;
    } catch (e) {
      console.error(`Ошибка списка: ${e.message}`);
      continue;
    }

    const items = parseList(listHtml);
    console.log(`Найдено маршрутов: ${items.length}`);

    for (const item of items.slice(0, 15)) { // max 15 на категорию
      const detailUrl = `https://idilesom.com/kam/places/${item.id}`;
      try {
        await sleep(800); // пауза между запросами
        const detailHtml = await fetchViaUnlocker(detailUrl);
        totalRequests++;
        const detail = parseDetail(detailHtml, item.id);
        if (!detail.title && item.title) detail.title = item.title;
        results[cat.slug].items.push(detail);
        console.log(`  ✓ [${item.id}] ${detail.title || "?"} | ${detail.district || "?"} | ${detail.duration || "?"}`);
      } catch (e) {
        console.error(`  ✗ [${item.id}] ${e.message}`);
      }
    }

    await sleep(1000);
  }

  // Сохраняем
  const fs = await import("fs");
  const out = JSON.stringify(results, null, 2);
  fs.writeFileSync("idilesom-tours.json", out);
  console.log(`\n✅ Готово! Всего запросов: ${totalRequests}`);
  console.log(`📁 Сохранено: idilesom-tours.json`);

  // Краткая статистика
  let total = 0;
  for (const [slug, cat] of Object.entries(results)) {
    console.log(`  ${cat.name}: ${cat.items.length} маршрутов`);
    total += cat.items.length;
  }
  console.log(`  Итого: ${total} маршрутов`);
}

main().catch(console.error);
