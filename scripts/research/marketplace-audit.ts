/**
 * scripts/research/marketplace-audit.ts
 *
 * Research bot: логинится на каждую платформу как оператор fishingkam,
 * изучает дашборд и форму добавления тура, сохраняет отчёт.
 *
 * Запуск:
 *   npx tsx scripts/research/marketplace-audit.ts              # все платформы
 *   npx tsx scripts/research/marketplace-audit.ts tripster     # одна платформа
 *   npx tsx scripts/research/marketplace-audit.ts --headless   # без браузера
 */

import { chromium, type Browser, type Page } from 'playwright';
import fs from 'fs';
import path from 'path';
import { ACTIVE_PLATFORMS, HIGH_PRIORITY, type PlatformConfig } from './platforms.config';

// ── Config ────────────────────────────────────────────────────────────────────

const REPORTS_DIR = path.join(process.cwd(), 'scripts', 'research', 'reports');
const SCREENSHOTS_DIR = path.join(REPORTS_DIR, 'screenshots');
const ARGS = process.argv.slice(2);
const HEADLESS = ARGS.includes('--headless');
const TARGET = ARGS.find(a => !a.startsWith('--'));

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

interface PlatformReport {
  id: string;
  name: string;
  auditedAt: string;
  loginSuccess: boolean;
  loginError?: string;
  dashboard: {
    url: string;
    title: string;
    screenshot: string;
    menuItems: string[];
    keyMetrics: string[];
  } | null;
  tourForm: {
    url: string;
    title: string;
    screenshot: string;
    fields: FormField[];
    sections: string[];
    hasCategories: boolean;
    hasPricing: boolean;
    hasSchedule: boolean;
    hasPhotos: boolean;
    hasMap: boolean;
    commissionVisible: boolean;
    commissionPercent?: string;
  } | null;
  observations: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ensureDirs() {
  [REPORTS_DIR, SCREENSHOTS_DIR].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });
}

async function screenshot(page: Page, platformId: string, name: string): Promise<string> {
  const filename = `${platformId}_${name}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  return `screenshots/${filename}`;
}

async function extractFormFields(page: Page): Promise<FormField[]> {
  return page.evaluate(() => {
    const fields: Array<{
      name: string; label: string; type: string;
      required: boolean; placeholder: string; options: string[];
    }> = [];

    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      const el = input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      const name = el.name || el.id || '';
      if (!name || ['csrf', '_token', 'authenticity'].some(s => name.toLowerCase().includes(s))) return;

      // найти label
      let label = '';
      const id = el.id;
      if (id) {
        const labelEl = document.querySelector(`label[for="${id}"]`);
        if (labelEl) label = (labelEl.textContent ?? '').trim();
      }
      if (!label) {
        const parent = el.closest('.form-group, .field, [class*="field"], [class*="form"]');
        if (parent) {
          const l = parent.querySelector('label');
          if (l) label = (l.textContent ?? '').trim();
        }
      }
      if (!label) label = name;

      // опции select
      const options: string[] = [];
      if (el.tagName === 'SELECT') {
        (el as HTMLSelectElement).querySelectorAll('option').forEach(opt => {
          if (opt.value) options.push((opt.textContent ?? '').trim());
        });
      }

      fields.push({
        name,
        label: label.replace(/[\n\t\s]+/g, ' ').slice(0, 100),
        type: el.tagName === 'SELECT' ? 'select' : el.tagName === 'TEXTAREA' ? 'textarea' : (el as HTMLInputElement).type || 'text',
        required: (el as HTMLInputElement).required ?? false,
        placeholder: (el as HTMLInputElement).placeholder?.trim() ?? '',
        options: options.slice(0, 20),
      });
    });

    return fields;
  });
}

async function extractMenuItems(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const nav = document.querySelector('nav, [role="navigation"], .sidebar, .menu, [class*="nav"], [class*="menu"]');
    if (!nav) return [];
    return Array.from(nav.querySelectorAll('a, [role="menuitem"]'))
      .map(el => (el.textContent ?? '').trim())
      .filter(t => t.length > 1 && t.length < 50)
      .slice(0, 20);
  });
}

async function detectCapabilities(page: Page): Promise<{
  hasCategories: boolean; hasPricing: boolean; hasSchedule: boolean;
  hasPhotos: boolean; hasMap: boolean; commissionVisible: boolean; commissionPercent?: string;
}> {
  return page.evaluate(() => {
    const html = document.body.innerHTML.toLowerCase();
    const text = (document.body.textContent ?? '').toLowerCase();

    // поиск процента комиссии
    const commMatch = text.match(/(\d+)\s*%\s*(комисси|commission|fee)/i);
    const commMatch2 = text.match(/(комисси|commission|fee)[^%]*(\d+)\s*%/i);
    const commPercent = commMatch?.[1] ?? commMatch2?.[2];

    return {
      hasCategories: html.includes('categor') || html.includes('тип') || html.includes('вид') || html.includes('category'),
      hasPricing: html.includes('price') || html.includes('цен') || html.includes('стоим') || html.includes('руб'),
      hasSchedule: html.includes('schedule') || html.includes('расписан') || html.includes('calendar') || html.includes('дат'),
      hasPhotos: html.includes('photo') || html.includes('image') || html.includes('фото') || html.includes('upload'),
      hasMap: html.includes('map') || html.includes('карт') || html.includes('coordinates') || html.includes('location'),
      commissionVisible: !!(commMatch || commMatch2),
      commissionPercent: commPercent,
    };
  });
}

async function extractSectionHeaders(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    return Array.from(document.querySelectorAll('h1, h2, h3, [class*="section-title"], [class*="step"], fieldset legend'))
      .map(el => (el.textContent ?? '').trim())
      .filter(t => t.length > 2 && t.length < 100)
      .slice(0, 20);
  });
}

// ── Login strategies ──────────────────────────────────────────────────────────

async function tryLogin(page: Page, platform: PlatformConfig): Promise<boolean> {
  try {
    await page.goto(platform.loginUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const { email, password } = platform.credentials;
    if (!email || !password) return false;

    // универсальные selectors для email/login
    const emailSelectors = [
      'input[type="email"]',
      'input[name="email"]',
      'input[name="login"]',
      'input[name="username"]',
      'input[name*="[email]"]',
      'input[name*="[login]"]',
      'input[placeholder*="mail" i]',
      'input[placeholder*="логин" i]',
      'input[placeholder*="email" i]',
      'input[id*="email" i]',
      'input[id*="login" i]',
    ];

    const passwordSelectors = [
      'input[type="password"]',
      'input[name="password"]',
      'input[name*="[password]"]',
      'input[id*="password" i]',
      'input[id*="pass" i]',
    ];

    const submitSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Войти")',
      'button:has-text("Вход")',
      'button:has-text("Sign in")',
      'button:has-text("Log in")',
      'button:has-text("Login")',
      '[class*="login-btn"]',
      '[class*="submit"]',
    ];

    let emailFilled = false;
    for (const sel of emailSelectors) {
      const el = page.locator(sel).first();
      if (await el.count() > 0) {
        await el.fill(email);
        emailFilled = true;
        break;
      }
    }
    if (!emailFilled) return false;

    let passFilled = false;
    for (const sel of passwordSelectors) {
      const el = page.locator(sel).first();
      if (await el.count() > 0) {
        await el.fill(password);
        passFilled = true;
        break;
      }
    }
    if (!passFilled) return false;

    for (const sel of submitSelectors) {
      const el = page.locator(sel).first();
      if (await el.count() > 0) {
        await el.click();
        break;
      }
    }

    await page.waitForTimeout(4000);

    // проверяем что залогинились (нет формы входа)
    const stillOnLogin = await page.locator('input[type="password"]').count() > 0;
    return !stillOnLogin;
  } catch (err) {
    return false;
  }
}

// ── Main audit ────────────────────────────────────────────────────────────────

async function auditPlatform(browser: Browser, platform: PlatformConfig): Promise<PlatformReport> {
  const report: PlatformReport = {
    id: platform.id,
    name: platform.name,
    auditedAt: new Date().toISOString(),
    loginSuccess: false,
    dashboard: null,
    tourForm: null,
    observations: [],
  };

  if (platform.status === 'broken') {
    report.observations.push('Сайт не работает — пропущен.');
    return report;
  }

  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    locale: 'ru-RU',
  });
  const page = await ctx.newPage();

  try {
    // ── Логин ─────────────────────────────────────────────────────────
    console.log(`  [${platform.id}] Попытка входа...`);
    const loginOk = await tryLogin(page, platform);
    report.loginSuccess = loginOk;

    if (!loginOk) {
      report.loginError = 'Не удалось войти автоматически (возможно 2FA или CAPTCHA)';
      report.observations.push('Требуется ручной вход / 2FA / SMS-код');
      const s = await screenshot(page, platform.id, 'login_failed');
      report.observations.push(`Скриншот: ${s}`);
      await ctx.close();
      return report;
    }

    console.log(`  [${platform.id}] Вход успешен`);

    // ── Дашборд ───────────────────────────────────────────────────────
    const dashUrl = platform.dashboardUrl ?? page.url();
    if (platform.dashboardUrl && page.url() !== platform.dashboardUrl) {
      await page.goto(platform.dashboardUrl, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(2000);
    }

    const dashScreenshot = await screenshot(page, platform.id, 'dashboard');
    const menuItems = await extractMenuItems(page);
    const dashTitle = await page.title();

    // ищем метрики на дашборде (цифры в заголовках)
    const metrics = await page.evaluate(() => {
      const candidates: string[] = [];
      document.querySelectorAll('[class*="stat"], [class*="metric"], [class*="count"], [class*="number"]').forEach(el => {
        const text = (el.textContent ?? '').trim();
        if (text.length > 0 && text.length < 60) candidates.push(text);
      });
      return candidates.slice(0, 10);
    });

    report.dashboard = {
      url: dashUrl,
      title: dashTitle,
      screenshot: dashScreenshot,
      menuItems,
      keyMetrics: metrics,
    };

    // ── Форма добавления тура ──────────────────────────────────────────
    const addTourUrl = platform.addTourUrl;
    if (addTourUrl) {
      await page.goto(addTourUrl, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(3000);
    } else {
      // ищем ссылку "создать тур / добавить экскурсию"
      const createSelectors = [
        'a:has-text("Создать тур")',
        'a:has-text("Добавить тур")',
        'a:has-text("Новый тур")',
        'a:has-text("Create experience")',
        'a:has-text("Add tour")',
        'button:has-text("Создать")',
        '[href*="new"], [href*="create"], [href*="add"]',
      ];
      for (const sel of createSelectors) {
        const el = page.locator(sel).first();
        if (await el.count() > 0) {
          await el.click();
          await page.waitForTimeout(3000);
          break;
        }
      }
    }

    const formScreenshot = await screenshot(page, platform.id, 'tour_form');
    const formFields = await extractFormFields(page);
    const sections = await extractSectionHeaders(page);
    const caps = await detectCapabilities(page);
    const formTitle = await page.title();

    report.tourForm = {
      url: page.url(),
      title: formTitle,
      screenshot: formScreenshot,
      fields: formFields,
      sections,
      ...caps,
    };

    report.observations.push(`Найдено ${formFields.length} полей формы`);
    report.observations.push(`Секции: ${sections.join(' | ')}`);
    if (caps.commissionVisible) {
      report.observations.push(`Комиссия видна: ${caps.commissionPercent ?? '?'}%`);
    }

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    report.observations.push(`Ошибка: ${msg}`);
  } finally {
    await ctx.close();
  }

  return report;
}

// ── Report generator ──────────────────────────────────────────────────────────

function generateMarkdownReport(reports: PlatformReport[]): string {
  const lines: string[] = [
    '# Marketplace Audit Report',
    `Дата: ${new Date().toLocaleString('ru-RU')}`,
    '',
    '---',
    '',
  ];

  for (const r of reports) {
    lines.push(`## ${r.name} (${r.id})`);
    lines.push(`**Аудит:** ${r.auditedAt}`);
    lines.push(`**Вход:** ${r.loginSuccess ? 'Успешен' : 'Неудача'}`);
    if (r.loginError) lines.push(`**Ошибка входа:** ${r.loginError}`);
    lines.push('');

    if (r.dashboard) {
      lines.push('### Дашборд');
      lines.push(`- URL: ${r.dashboard.url}`);
      lines.push(`- Заголовок: ${r.dashboard.title}`);
      lines.push(`- Скриншот: ${r.dashboard.screenshot}`);
      if (r.dashboard.menuItems.length > 0) {
        lines.push(`- Меню: ${r.dashboard.menuItems.join(' / ')}`);
      }
      if (r.dashboard.keyMetrics.length > 0) {
        lines.push(`- Метрики: ${r.dashboard.keyMetrics.join(' | ')}`);
      }
      lines.push('');
    }

    if (r.tourForm) {
      lines.push('### Форма добавления тура');
      lines.push(`- URL: ${r.tourForm.url}`);
      lines.push(`- Полей: ${r.tourForm.fields.length}`);
      lines.push(`- Возможности: ${[
        r.tourForm.hasCategories && 'Категории',
        r.tourForm.hasPricing && 'Цены',
        r.tourForm.hasSchedule && 'Расписание',
        r.tourForm.hasPhotos && 'Фото',
        r.tourForm.hasMap && 'Карта',
        r.tourForm.commissionVisible && `Комиссия(${r.tourForm.commissionPercent ?? '?'}%)`,
      ].filter(Boolean).join(', ')}`);

      if (r.tourForm.sections.length > 0) {
        lines.push('');
        lines.push('**Секции формы:**');
        r.tourForm.sections.forEach(s => lines.push(`- ${s}`));
      }

      if (r.tourForm.fields.length > 0) {
        lines.push('');
        lines.push('**Поля формы:**');
        lines.push('| Название | Метка | Тип | Обязательное |');
        lines.push('|----------|-------|-----|--------------|');
        r.tourForm.fields.slice(0, 30).forEach(f => {
          lines.push(`| ${f.name} | ${f.label} | ${f.type} | ${f.required ? 'Да' : 'Нет'} |`);
        });
      }
      lines.push('');
    }

    if (r.observations.length > 0) {
      lines.push('### Наблюдения');
      r.observations.forEach(o => lines.push(`- ${o}`));
    }

    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function main() {
  ensureDirs();

  const platforms = TARGET
    ? ACTIVE_PLATFORMS.filter(p => p.id === TARGET)
    : HIGH_PRIORITY;

  if (platforms.length === 0) {
    console.error(`Платформа не найдена: ${TARGET}`);
    console.log('Доступные ID:', ACTIVE_PLATFORMS.map(p => p.id).join(', '));
    process.exit(1);
  }

  console.log(`\nMarketplace Audit Bot`);
  console.log(`Режим: ${HEADLESS ? 'headless' : 'с браузером'}`);
  console.log(`Платформы (${platforms.length}): ${platforms.map(p => p.name).join(', ')}\n`);

  const browser = await chromium.launch({
    headless: HEADLESS,
    slowMo: HEADLESS ? 0 : 500,
  });

  const reports: PlatformReport[] = [];

  for (const platform of platforms) {
    console.log(`\nАудит: ${platform.name}...`);
    const report = await auditPlatform(browser, platform);
    reports.push(report);

    // сохраняем промежуточный JSON
    const jsonPath = path.join(REPORTS_DIR, `${platform.id}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    console.log(`  Отчёт: ${jsonPath}`);
  }

  await browser.close();

  // итоговый markdown
  const md = generateMarkdownReport(reports);
  const mdPath = path.join(REPORTS_DIR, `audit_${Date.now()}.md`);
  fs.writeFileSync(mdPath, md);

  console.log(`\nГотово.`);
  console.log(`Отчёт: ${mdPath}`);
  console.log(`Скриншоты: ${SCREENSHOTS_DIR}`);

  // краткое summary
  for (const r of reports) {
    const status = r.loginSuccess ? 'OK' : 'FAIL';
    const fields = r.tourForm?.fields.length ?? 0;
    console.log(`  [${status}] ${r.name}: ${fields} полей в форме тура`);
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
