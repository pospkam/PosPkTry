#!/usr/bin/env tsx

/**
 * Stitch SDK Integration Script для KamchatourHub
 *
 * Генерирует Tailwind-компоненты через Google Stitch SDK
 * с соблюдением дизайн-системы проекта.
 *
 * Использование:
 *   npm run stitch:generate -- "Страница бронирования с календарём"
 *   npm run stitch:edit -- <screen-id> "Добавь боковую панель с погодой"
 *   npm run stitch:export -- <screen-id> --output components/generated/BookingPage.tsx
 */

import { stitch } from '@google/stitch-sdk';
import * as fs from 'fs';
import * as path from 'path';

// Конфигурация
const STITCH_API_KEY = process.env.STITCH_API_KEY || '';
const PROJECT_ID = process.env.STITCH_PROJECT_ID || '';

// Дизайн-система KamchatourHub (из DESIGN.md)
const DESIGN_SYSTEM_CONTEXT = `
# KamchatourHub Design System Context

## Цветовая схема
- Основной фон: var(--bg-primary) = #F5F0EB (light) / #0D1117 (dark)
- Карточки: var(--bg-card) = #FFFFFF (light) / #21262D (dark)
- Акцент (CTA): var(--accent) = #D44A0C (light) / #E8734A (dark)
- Океан (ссылки): var(--ocean) = #2568B0 (light) / #00A8CC (dark)
- Текст: var(--text-primary), var(--text-secondary), var(--text-muted)
- Успех: var(--success) = #3FB950
- Предупреждение: var(--warning) = #D29922
- Опасность: var(--danger) = #DC2626

## Типографика
- Заголовки: Playfair Display (serif) — font-playfair
- Текст: Outfit (sans-serif) — font-sans
- Размеры: text-5xl (hero), text-4xl (h1), text-3xl (h2), text-base (body)

## Компоненты
- Кнопки: ds-btn, ds-btn-primary, ds-btn-secondary
- Карточки: bg-[var(--bg-card)] border border-[var(--border)] rounded-lg
- Формы: ds-input, ds-label
- Touch targets: min-h-[44px] min-w-[44px]

## Запрещено
- glassmorphism (bg-white/10, backdrop-blur-*)
- hardcoded hex цвета (только CSS variables)
- emoji (только lucide-react иконки)
- font-black (максимум font-bold)

## Стиль
Премиальная туристическая платформа Камчатки.
Природные мотивы: вулканы, океан, тайга.
Тёплые тона + доверие + профессионализм.
`.trim();

// Интерфейсы
interface GenerateOptions {
  prompt: string;
  projectId?: string;
  outputFormat?: 'html' | 'react' | 'tailwind';
  includeDesignSystem?: boolean;
}

interface EditOptions {
  screenId: string;
  editPrompt: string;
}

interface ExportOptions {
  screenId: string;
  outputPath: string;
  format?: 'tsx' | 'jsx' | 'html';
}

// Проверка API ключа
function checkApiKey(): void {
  if (!STITCH_API_KEY) {
    console.error('❌ STITCH_API_KEY не установлен в .env.local');
    console.error('   Получите ключ на https://stitch.withgoogle.com');
    process.exit(1);
  }
}

// Генерация нового экрана
async function generateScreen(options: GenerateOptions): Promise<string> {
  checkApiKey();

  console.log('🎨 Генерация экрана через Stitch SDK...');
  console.log(`📝 Промпт: ${options.prompt}`);

  try {
    // Инициализация или получение проекта
    let project;
    if (PROJECT_ID) {
      // Используем существующий проект
      project = stitch.project(PROJECT_ID);
      console.log(`📂 Используется проект: ${PROJECT_ID}`);
    } else {
      // Создаём новый проект
      project = await stitch.createProject('KamchatourHub');
      console.log(`📂 Создан новый проект: ${project.projectId}`);
      console.log(`   Добавьте в .env.local: STITCH_PROJECT_ID=${project.projectId}`);
    }

    // Расширенный промпт с контекстом дизайн-системы
    const fullPrompt = options.includeDesignSystem !== false
      ? `${options.prompt}\n\n${DESIGN_SYSTEM_CONTEXT}`
      : options.prompt;

    // Генерация экрана
    const screen = await project.generate(fullPrompt);
    const screenId = screen.id;

    console.log(`✅ Экран создан: ${screenId}`);

    // Получение HTML кода (это URL для скачивания)
    const htmlUrl = await screen.getHtml();
    console.log(`🔗 HTML URL: ${htmlUrl}`);

    // Скачивание HTML
    const response = await fetch(htmlUrl);
    const code = await response.text();

    // Сохранение в временный файл
    const tempDir = path.join(process.cwd(), '.stitch-temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFile = path.join(tempDir, `${screenId}.html`);
    fs.writeFileSync(tempFile, code, 'utf-8');

    console.log(`💾 Код сохранён: ${tempFile}`);
    console.log('');
    console.log('📋 Следующие шаги:');
    console.log(`   1. Просмотрите код: cat ${tempFile}`);
    console.log(`   2. Конвертируйте в React и экспортируйте: npm run stitch:export -- ${screenId} --output components/MyComponent.tsx`);
    console.log(`   3. Редактируйте: npm run stitch:edit -- ${screenId} "Добавь кнопку"`);

    return screenId;
  } catch (error) {
    console.error('❌ Ошибка генерации:', error);
    throw error;
  }
}

// Редактирование существующего экрана
async function editScreen(options: EditOptions): Promise<void> {
  checkApiKey();

  console.log('✏️  Редактирование экрана через Stitch SDK...');
  console.log(`🆔 Screen ID: ${options.screenId}`);
  console.log(`📝 Изменения: ${options.editPrompt}`);

  try {
    if (!PROJECT_ID) {
      throw new Error('STITCH_PROJECT_ID не установлен в .env.local');
    }

    const project = stitch.project(PROJECT_ID);
    const screen = project.screen(options.screenId);

    // Применение изменений
    const edited = await screen.edit(options.editPrompt);
    const htmlUrl = await edited.getHtml();

    // Скачивание обновлённого HTML
    const response = await fetch(htmlUrl);
    const code = await response.text();

    // Обновление временного файла
    const tempDir = path.join(process.cwd(), '.stitch-temp');
    const tempFile = path.join(tempDir, `${options.screenId}.html`);
    fs.writeFileSync(tempFile, code, 'utf-8');

    console.log(`✅ Экран обновлён`);
    console.log(`💾 Код сохранён: ${tempFile}`);
  } catch (error) {
    console.error('❌ Ошибка редактирования:', error);
    throw error;
  }
}

// Экспорт экрана в компонент
async function exportScreen(options: ExportOptions): Promise<void> {
  checkApiKey();

  console.log('📦 Экспорт экрана в компонент...');
  console.log(`🆔 Screen ID: ${options.screenId}`);
  console.log(`📂 Output: ${options.outputPath}`);

  try {
    const tempDir = path.join(process.cwd(), '.stitch-temp');
    const tempFile = path.join(tempDir, `${options.screenId}.html`);

    // Проверка временного файла
    if (!fs.existsSync(tempFile)) {
      throw new Error(`Временный файл не найден: ${tempFile}. Сначала запустите: npm run stitch:generate`);
    }

    // Чтение HTML кода
    let code = fs.readFileSync(tempFile, 'utf-8');

    // Конвертация HTML в React/TSX (базовая)
    // В production можно использовать html-to-react или подобные библиотеки
    code = convertHtmlToReact(code);

    // Постобработка: добавление 'use client' если нужно
    if (!code.includes("'use client'") && !code.includes('"use client"')) {
      code = `'use client';\n\n${code}`;
    }

    // Создание директории если не существует
    const outputDir = path.dirname(options.outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Сохранение компонента
    fs.writeFileSync(options.outputPath, code, 'utf-8');

    console.log(`✅ Компонент экспортирован: ${options.outputPath}`);
    console.log('');
    console.log('📋 Следующие шаги:');
    console.log('   1. Проверьте импорты (lucide-react, next/link и т.д.)');
    console.log('   2. Добавьте TypeScript типы если нужно');
    console.log('   3. Запустите type-check: npm run type-check');
  } catch (error) {
    console.error('❌ Ошибка экспорта:', error);
    throw error;
  }
}

// Базовая конвертация HTML в React (упрощённая)
function convertHtmlToReact(html: string): string {
  // Оборачиваем в React компонент
  const componentCode = `
import React from 'react';

export default function GeneratedComponent() {
  return (
    <div dangerouslySetInnerHTML={{ __html: \`${html.replace(/`/g, '\\`')}\` }} />
  );
}
`.trim();

  return componentCode;
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log('📖 Использование:');
    console.log('');
    console.log('  Генерация:');
    console.log('    npm run stitch:generate -- "Промпт для генерации"');
    console.log('');
    console.log('  Редактирование:');
    console.log('    npm run stitch:edit -- <screen-id> "Промпт для изменений"');
    console.log('');
    console.log('  Экспорт:');
    console.log('    npm run stitch:export -- <screen-id> --output path/to/Component.tsx');
    console.log('');
    console.log('Примеры:');
    console.log('  npm run stitch:generate -- "Страница бронирования с календарём и формой оплаты"');
    console.log('  npm run stitch:edit -- abc123 "Добавь боковую панель с погодой"');
    console.log('  npm run stitch:export -- abc123 --output components/booking/BookingPage.tsx');
    process.exit(0);
  }

  try {
    if (command === 'generate') {
      const prompt = args[1];
      if (!prompt) {
        console.error('❌ Укажите промпт для генерации');
        process.exit(1);
      }
      await generateScreen({ prompt });
    } else if (command === 'edit') {
      const screenId = args[1];
      const editPrompt = args[2];
      if (!screenId || !editPrompt) {
        console.error('❌ Укажите screen-id и промпт для редактирования');
        process.exit(1);
      }
      await editScreen({ screenId, editPrompt });
    } else if (command === 'export') {
      const screenId = args[1];
      const outputIndex = args.indexOf('--output');
      const outputPath = outputIndex !== -1 ? args[outputIndex + 1] : undefined;

      if (!screenId || !outputPath) {
        console.error('❌ Укажите screen-id и --output путь');
        process.exit(1);
      }
      await exportScreen({ screenId, outputPath });
    } else {
      console.error(`❌ Неизвестная команда: ${command}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Ошибка выполнения:', error);
    process.exit(1);
  }
}

// Запуск если вызван напрямую
if (require.main === module) {
  main();
}

// Экспорт для программного использования
export { generateScreen, editScreen, exportScreen };
