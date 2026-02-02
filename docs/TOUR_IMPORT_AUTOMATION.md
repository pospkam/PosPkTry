# Автоматизация загрузки туров - Концепция и решения

## 1. Загрузка туров с сайта партнера

### Варианты решения:

#### **Вариант A: API интеграция** (Лучший вариант)
Если у партнера есть API:

**Преимущества:**
- ✅ Стабильно и надёжно
- ✅ Официально поддерживается
- ✅ Структурированные данные
- ✅ Легко обновлять

**Реализация:**
```typescript
// /app/api/partners/import/tours/route.ts
interface PartnerTourAPI {
  id: string;
  name: string;
  price: number;
  duration: number;
  description: string;
  images: string[];
}

async function fetchToursFromPartnerAPI(partnerId: string) {
  const partner = await getPartnerSettings(partnerId);
  
  const response = await fetch(partner.apiUrl, {
    headers: {
      'Authorization': `Bearer ${partner.apiKey}`,
      'Content-Type': 'application/json'
    }
  });
  
  const tours: PartnerTourAPI[] = await response.json();
  
  // Мапинг в нашу структуру
  return tours.map(tour => ({
    operatorId: partnerId,
    name: tour.name,
    price: tour.price,
    duration: tour.duration,
    description: tour.description,
    images: tour.images,
    source: 'partner_api',
    externalId: tour.id
  }));
}
```

---

#### **Вариант B: RSS/XML Feed**
Если партнер предоставляет RSS/XML:

**Преимущества:**
- ✅ Стандартный формат
- ✅ Легко парсить
- ✅ Автоматические обновления

**Реализация:**
```typescript
import Parser from 'rss-parser';

async function importFromRSS(feedUrl: string) {
  const parser = new Parser();
  const feed = await parser.parseURL(feedUrl);
  
  return feed.items.map(item => ({
    name: item.title,
    description: item.content,
    link: item.link,
    publishedAt: new Date(item.pubDate)
  }));
}
```

---

#### **Вариант C: Web Scraping** (Если нет API)
Парсинг HTML сайта партнера:

**Технологии:**
- **Puppeteer** - для сложных сайтов с JavaScript
- **Cheerio** - для простых HTML сайтов
- **Playwright** - альтернатива Puppeteer

**Реализация:**
```typescript
import * as cheerio from 'cheerio';

async function scrapePartnerWebsite(url: string) {
  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);
  
  const tours: any[] = [];
  
  $('.tour-card').each((i, element) => {
    tours.push({
      name: $(element).find('.tour-title').text(),
      price: parseFloat($(element).find('.tour-price').text()),
      description: $(element).find('.tour-description').text(),
      image: $(element).find('.tour-image').attr('src'),
      link: $(element).find('a').attr('href')
    });
  });
  
  return tours;
}
```

**С Puppeteer (для сайтов с JS):**
```typescript
import puppeteer from 'puppeteer';

async function scrapeDynamicSite(url: string) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto(url, { waitUntil: 'networkidle0' });
  
  const tours = await page.evaluate(() => {
    const tourElements = document.querySelectorAll('.tour-card');
    return Array.from(tourElements).map(el => ({
      name: el.querySelector('.tour-title')?.textContent,
      price: el.querySelector('.tour-price')?.textContent,
      image: el.querySelector('.tour-image')?.getAttribute('src')
    }));
  });
  
  await browser.close();
  return tours;
}
```

---

#### **Вариант D: CSV/Excel импорт**
Партнер предоставляет файл:

**Реализация:**
```typescript
import Papa from 'papaparse';

async function importFromCSV(file: File) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        const tours = results.data.map((row: any) => ({
          name: row['Название тура'],
          price: parseFloat(row['Цена']),
          duration: parseInt(row['Длительность']),
          description: row['Описание']
        }));
        resolve(tours);
      },
      error: reject
    });
  });
}
```

---

## 2. Интеграция с Авито

### Проблема:
Авито **НЕ предоставляет публичный API** для парсинга объявлений.

### Решения:

#### **Вариант A: Авито API для бизнеса** (Официальный)
Авито предоставляет платный API для автоматизации:

**Возможности:**
- ✅ Размещение объявлений
- ✅ Обновление цен
- ✅ Снятие с публикации
- ❌ НЕТ возможности получить чужие объявления

**Документация:** https://developers.avito.ru/

**Подходит для:**
- Автоматической публикации туров партнера на Авито
- Синхронизации цен

**НЕ подходит для:**
- Импорта объявлений других людей

---

#### **Вариант B: Парсинг страницы профиля партнера**
Если партнер дает ссылку на свой профиль:

**Технология:**
```typescript
async function parseAvitoProfile(profileUrl: string) {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox'] 
  });
  
  const page = await browser.newPage();
  
  // Антибот обход
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)...');
  
  await page.goto(profileUrl, { waitUntil: 'networkidle0' });
  
  // Ждем загрузки объявлений
  await page.waitForSelector('[data-marker="item"]');
  
  const ads = await page.evaluate(() => {
    const items = document.querySelectorAll('[data-marker="item"]');
    return Array.from(items).map(item => ({
      title: item.querySelector('[itemprop="name"]')?.textContent,
      price: item.querySelector('[itemprop="price"]')?.getAttribute('content'),
      link: item.querySelector('a')?.href,
      image: item.querySelector('img')?.src
    }));
  });
  
  await browser.close();
  return ads;
}
```

**Проблемы:**
- ❌ Авито активно борется с парсингом
- ❌ Captcha
- ❌ IP блокировки
- ❌ Изменение структуры HTML

---

#### **Вариант C: Ручная загрузка через интерфейс**
Партнер сам загружает туры:

**Реализация:**
1. Партнер копирует данные из Авито
2. Вставляет в форму на нашем сайте
3. Система автоматически парсит и форматирует

**Компонент для импорта:**
```typescript
// /app/partner/tours/import/page.tsx
function ImportFromAvito() {
  const [avitoUrl, setAvitoUrl] = useState('');
  
  const handleImport = async () => {
    // Отправляем URL на бэкенд для парсинга
    const response = await fetch('/api/partners/import/avito', {
      method: 'POST',
      body: JSON.stringify({ url: avitoUrl })
    });
    
    const tourData = await response.json();
    // Заполняем форму автоматически
  };
  
  return (
    <div>
      <input 
        value={avitoUrl}
        onChange={(e) => setAvitoUrl(e.target.value)}
        placeholder="https://www.avito.ru/kamchatskiy_kray/predlozheniya_uslug/..."
      />
      <button onClick={handleImport}>Импортировать</button>
    </div>
  );
}
```

---

## 3. Рекомендуемая архитектура системы импорта

### Структура:

```
/app/api/partners/import/
├── tours/route.ts          # API для импорта туров
├── avito/route.ts          # Парсинг Авито (с ограничениями)
├── schedule/route.ts       # Запуск по расписанию
└── mapping/route.ts        # Мапинг полей

/lib/importers/
├── base-importer.ts        # Базовый класс
├── api-importer.ts         # Импорт через API
├── rss-importer.ts         # Импорт из RSS
├── scraper-importer.ts     # Web scraping
└── avito-parser.ts         # Парсер Авито

/app/partner/tours/
├── import/page.tsx         # UI для импорта
└── import-settings/page.tsx # Настройки импорта
```

---

### Базовый класс импортера:

```typescript
// /lib/importers/base-importer.ts
export abstract class BaseImporter {
  abstract fetch(): Promise<RawTourData[]>;
  abstract map(data: RawTourData): TourData;
  abstract validate(tour: TourData): boolean;
  
  async import(partnerId: string) {
    const rawData = await this.fetch();
    const tours = rawData.map(d => this.map(d));
    const valid = tours.filter(t => this.validate(t));
    
    // Сохранение в БД
    for (const tour of valid) {
      await saveTour(partnerId, tour);
    }
    
    return {
      total: rawData.length,
      imported: valid.length,
      skipped: rawData.length - valid.length
    };
  }
}
```

---

## 4. Планировщик задач (Cron Jobs)

### Автоматический импорт по расписанию:

**С использованием node-cron:**
```typescript
// /lib/scheduler/tour-import-scheduler.ts
import cron from 'node-cron';

// Каждый день в 3:00 ночи
cron.schedule('0 3 * * *', async () => {
  console.log('Starting automatic tour import...');
  
  const partners = await getActivePartners();
  
  for (const partner of partners) {
    if (partner.autoImportEnabled) {
      try {
        await importToursForPartner(partner.id);
        console.log(`✅ Imported tours for ${partner.name}`);
      } catch (error) {
        console.error(`❌ Failed to import for ${partner.name}:`, error);
      }
    }
  }
});
```

**Запуск через PM2:**
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'kamhub',
    script: 'npm',
    args: 'start',
    instances: 1
  }, {
    name: 'tour-importer',
    script: './lib/scheduler/tour-import-scheduler.js',
    instances: 1,
    cron_restart: '0 3 * * *' // Каждый день в 3:00
  }]
};
```

---

## 5. Схема БД для импорта

```sql
-- Настройки импорта партнера
CREATE TABLE partner_import_settings (
  id SERIAL PRIMARY KEY,
  partner_id UUID REFERENCES partners(id),
  
  -- Тип импорта
  import_type VARCHAR(50) NOT NULL, -- 'api', 'rss', 'scraper', 'manual'
  
  -- API настройки
  api_url VARCHAR(500),
  api_key TEXT,
  api_secret TEXT,
  
  -- RSS настройки
  rss_url VARCHAR(500),
  
  -- Scraper настройки
  scraper_url VARCHAR(500),
  scraper_selectors JSONB,
  
  -- Расписание
  auto_import_enabled BOOLEAN DEFAULT false,
  import_schedule VARCHAR(50) DEFAULT 'daily', -- 'hourly', 'daily', 'weekly'
  
  -- Мапинг полей
  field_mapping JSONB,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- История импортов
CREATE TABLE tour_import_history (
  id SERIAL PRIMARY KEY,
  partner_id UUID REFERENCES partners(id),
  
  import_type VARCHAR(50),
  status VARCHAR(50), -- 'success', 'partial', 'failed'
  
  total_items INTEGER,
  imported_items INTEGER,
  skipped_items INTEGER,
  failed_items INTEGER,
  
  error_log JSONB,
  
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

-- Импортированные туры (для отслеживания)
ALTER TABLE tours ADD COLUMN IF NOT EXISTS external_id VARCHAR(255);
ALTER TABLE tours ADD COLUMN IF NOT EXISTS import_source VARCHAR(50);
ALTER TABLE tours ADD COLUMN IF NOT EXISTS last_imported_at TIMESTAMP;
```

---

## 6. UI для настройки импорта

```typescript
// /app/partner/tours/import-settings/page.tsx
function ImportSettings() {
  const [settings, setSettings] = useState({
    importType: 'api',
    apiUrl: '',
    apiKey: '',
    autoImportEnabled: false,
    schedule: 'daily'
  });
  
  return (
    <div>
      <h1>Настройки импорта туров</h1>
      
      <select 
        value={settings.importType}
        onChange={(e) => setSettings({...settings, importType: e.target.value})}
      >
        <option value="api">API интеграция</option>
        <option value="rss">RSS Feed</option>
        <option value="scraper">Парсинг сайта</option>
        <option value="manual">Ручная загрузка</option>
      </select>
      
      {settings.importType === 'api' && (
        <>
          <input 
            placeholder="API URL"
            value={settings.apiUrl}
            onChange={(e) => setSettings({...settings, apiUrl: e.target.value})}
          />
          <input 
            type="password"
            placeholder="API Key"
            value={settings.apiKey}
            onChange={(e) => setSettings({...settings, apiKey: e.target.value})}
          />
        </>
      )}
      
      <label>
        <input 
          type="checkbox"
          checked={settings.autoImportEnabled}
          onChange={(e) => setSettings({...settings, autoImportEnabled: e.target.checked})}
        />
        Автоматический импорт
      </label>
      
      <button onClick={handleSave}>Сохранить</button>
    </div>
  );
}
```

---

## 7. Итоговые рекомендации

### ✅ Для импорта с сайта партнера:

**Приоритет:**
1. **API** - если партнер предоставляет
2. **RSS/XML Feed** - если есть
3. **CSV/Excel** - простой вариант
4. **Web Scraping** - последний вариант (нестабильно)

### ⚠️ Для Авито:

**Реальность:**
- Официальный API - только для **размещения** своих объявлений
- Парсинг чужих объявлений - технически возможен, но **нарушает ToS**
- Авито активно борется с парсингом

**Легальные варианты:**
1. Партнер вручную копирует данные из Авито к нам
2. Партнер использует наш API для автопубликации на Авито
3. Интеграция через официальный Avito API для размещения

### 🎯 Что реализовать сначала:

1. **Ручная загрузка** - форма импорта с URL/CSV
2. **API интеграция** - для партнеров с API
3. **Планировщик** - автоматическое обновление
4. **UI настроек** - удобный интерфейс

---

## 8. Необходимые пакеты

```json
{
  "dependencies": {
    "cheerio": "^1.0.0-rc.12",
    "puppeteer": "^21.5.0",
    "node-cron": "^3.0.3",
    "papaparse": "^5.4.1",
    "rss-parser": "^3.13.0",
    "axios": "^1.6.2"
  }
}
```

---

**Хочешь, чтобы я реализовал один из вариантов прямо сейчас?**
