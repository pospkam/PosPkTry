#!/usr/bin/env tsx

/**
 * Stitch SDK — Генератор основных экранов KamchatourHub
 *
 * Генерирует ключевые экраны платформы через Stitch SDK
 * с соблюдением дизайн-системы.
 *
 * Использование:
 *   npm run stitch:generate-screens -- --screen=homepage
 *   npm run stitch:generate-screens -- --screen=tour-detail
 *   npm run stitch:generate-screens -- --screen=booking
 *   npm run stitch:generate-screens -- --all
 */

import { generateScreen } from './stitch-generate';

// Определения экранов для генерации
const SCREENS = {
  homepage: {
    name: 'Главная страница',
    prompt: `
Создай главную страницу туристической платформы Камчатки.

Секции (сверху вниз):
1. Hero — крупный заголовок "Камчатка ждёт", подзаголовок, 2 CTA кнопки
2. Поиск туров — форма с полями: направление, даты, человек, кнопка "Найти"
3. Популярные туры — сетка 3 карточки с фото, названием, ценой, сложностью
4. Категории — иконки + названия: Рыбалка, Вулканы, Океан, Дайвинг
5. Эко-баллы — краткое описание программы лояльности
6. Отзывы — 2-3 отзыва с аватарами и рейтингом
7. Footer — ссылки, соцсети, контакты

Используй:
- CSS-переменные: var(--accent), var(--ocean), var(--bg-card), var(--text-primary)
- Playfair Display для заголовков, Outfit для текста
- lucide-react иконки: MapPin, Calendar, Users, Star, Heart
- Mobile-first, адаптивная сетка (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- min-h-[44px] для touch targets

Премиальный стиль, природные мотивы Камчатки (вулканы, океан).
    `.trim(),
    outputPath: 'components/generated/HomepageGenerated.tsx',
  },

  'tour-detail': {
    name: 'Страница тура',
    prompt: `
Создай детальную страницу тура.

Лейаут:
- 2 колонки: Контент (70%) + Sidebar (30%)

Контент (левая колонка):
1. Hero — название тура (font-playfair text-4xl), категория badge, сложность, рейтинг
2. Галерея — 1 большое фото + 4 маленьких в сетке
3. Описание — 2-3 параграфа с иконками (MapPin, Clock, Users)
4. Программа тура — аккордеон с днями (День 1, День 2...)
5. Включено/не включено — 2 колонки со списками
6. Отзывы — список с аватарами, рейтингами

Sidebar (правая колонка):
1. Карточка бронирования — цена, календарь, кнопка "Забронировать"
2. Погода — температура, иконка, прогноз
3. Контакты оператора — телефон, email
4. Похожие туры — 2-3 карточки

Используй:
- CSS vars: var(--accent), var(--ocean), var(--bg-card)
- Playfair Display для заголовков
- lucide-react: Calendar, MapPin, Users, Clock, Star, Phone, Mail
- Адаптивность: lg:grid-cols-3 (sidebar справа на десктопе, снизу на мобиле)

Премиальный, информативный стиль.
    `.trim(),
    outputPath: 'components/generated/TourDetailGenerated.tsx',
  },

  booking: {
    name: 'Страница бронирования',
    prompt: `
Создай страницу бронирования с календарём и формой оплаты.

Лейаут (2 колонки):

Левая колонка (форма):
1. Выбор выезда — календарь с доступными датами (зелёные), занятыми (серые)
2. Данные гостей — форма: Имя, Фамилия, Email, Телефон
3. Количество человек — select (1-10)
4. Доп услуги — чекбоксы: Трансфер, Аренда снаряжения, Страховка
5. Промокод — input + кнопка "Применить"
6. Кнопка "Оплатить" — ds-btn-primary

Правая колонка (итого):
1. Детали тура — название, даты, длительность
2. Расчёт стоимости — базовая цена, доп услуги, скидки
3. Итоговая сумма — крупно, accent цвет
4. Политика отмены — краткое описание
5. Безопасность — иконки замка, SSL

Используй:
- CSS vars: var(--accent), var(--success), var(--bg-card)
- Playfair Display для заголовков
- lucide-react: Calendar, Users, Shield, Lock, Check
- Валидация форм (красные границы для ошибок)
- Mobile-first: grid-cols-1 lg:grid-cols-3 (форма col-span-2)

Доверие + безопасность в дизайне.
    `.trim(),
    outputPath: 'components/generated/BookingPageGenerated.tsx',
  },

  'tour-card': {
    name: 'Карточка тура',
    prompt: `
Создай компонент карточки тура (переиспользуемый).

Структура:
1. Изображение — w-full h-48 object-cover, rounded-t-lg
2. Badge сложности — top-right absolute: "Легко" / "Средне" / "Сложно"
3. Контент (padding p-4):
   - Название (font-playfair text-xl)
   - Категория (text-sm text-muted)
   - Иконки с инфо: Длительность (Clock), Группа (Users), Место (MapPin)
   - Рейтинг (Star иконки + число)
4. Футер — Цена (крупно, accent) + Кнопка "Подробнее"

Hover эффект:
- shadow-lg
- scale-105 для изображения

Props (TypeScript):
interface TourCardProps {
  id: string;
  name: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  duration: number;
  maxPeople: number;
  location: string;
  rating: number;
  price: number;
  imageUrl: string;
}

Используй:
- CSS vars
- lucide-react: Clock, Users, MapPin, Star
- Адаптивность (min-w-[280px])
- Touch target 44px для кнопки

Премиальная карточка, привлекательная.
    `.trim(),
    outputPath: 'components/generated/TourCardGenerated.tsx',
  },

  'operator-dashboard': {
    name: 'Дашборд оператора',
    prompt: `
Создай дашборд туроператора (CRM интерфейс).

Лейаут:
- Sidebar (слева 240px) — навигация с иконками
- Main area (справа) — контент

Sidebar меню:
- Dashboard (Home icon)
- Туры (Map icon)
- Бронирования (Calendar icon)
- Финансы (DollarSign icon)
- Статистика (BarChart icon)
- Настройки (Settings icon)

Main area (Dashboard):
1. Метрики — 4 карточки в ряд:
   - Выручка за месяц (TrendingUp icon)
   - Активные бронирования (Calendar)
   - Завершённые туры (CheckCircle)
   - Рейтинг (Star)

2. График — line chart заглушка "Выручка по месяцам"

3. Последние бронирования — таблица:
   Колонки: ID, Тур, Клиент, Дата, Статус, Сумма, Действия
   Статусы — бейджи: Подтверждено (success), Ожидает (warning), Отменено (danger)

4. Быстрые действия — кнопки: "Создать тур", "Экспорт данных"

Используй:
- CSS vars: var(--bg-card), var(--accent), var(--success)
- Playfair Display для заголовков
- lucide-react для всех иконок
- Таблица с hover на строках
- Адаптивность (sidebar скрыт на мобиле, burger меню)

Профессиональный CRM стиль.
    `.trim(),
    outputPath: 'components/generated/OperatorDashboardGenerated.tsx',
  },
};

// CLI
async function main() {
  const args = process.argv.slice(2);
  const screenArg = args.find((arg) => arg.startsWith('--screen='));
  const allFlag = args.includes('--all');

  if (!screenArg && !allFlag) {
    console.log('📖 Использование:');
    console.log('');
    console.log('  Генерация одного экрана:');
    console.log('    npm run stitch:generate-screens -- --screen=homepage');
    console.log('');
    console.log('  Генерация всех экранов:');
    console.log('    npm run stitch:generate-screens -- --all');
    console.log('');
    console.log('  Доступные экраны:');
    Object.keys(SCREENS).forEach((key) => {
      const screen = SCREENS[key as keyof typeof SCREENS];
      console.log(`    - ${key} (${screen.name})`);
    });
    process.exit(0);
  }

  try {
    let screensToGenerate: string[] = [];

    if (allFlag) {
      screensToGenerate = Object.keys(SCREENS);
    } else if (screenArg) {
      const screenKey = screenArg.replace('--screen=', '');
      if (!(screenKey in SCREENS)) {
        console.error(`❌ Неизвестный экран: ${screenKey}`);
        console.error(`   Доступные: ${Object.keys(SCREENS).join(', ')}`);
        process.exit(1);
      }
      screensToGenerate = [screenKey];
    }

    console.log(`🚀 Генерация ${screensToGenerate.length} экран(ов)...\n`);

    for (const screenKey of screensToGenerate) {
      const screen = SCREENS[screenKey as keyof typeof SCREENS];

      console.log(`\n${'='.repeat(60)}`);
      console.log(`📄 ${screen.name} (${screenKey})`);
      console.log('='.repeat(60));

      const screenId = await generateScreen({
        prompt: screen.prompt,
        includeDesignSystem: true,
      });

      console.log(`\n✅ Экран ${screenKey} создан (ID: ${screenId})`);
      console.log(`📂 Рекомендуемый путь: ${screen.outputPath}`);
      console.log(`   Экспортируй: npm run stitch:export -- ${screenId} --output ${screen.outputPath}`);
    }

    console.log(`\n\n${'='.repeat(60)}`);
    console.log('🎉 Генерация завершена!');
    console.log('='.repeat(60));
    console.log('');
    console.log('📋 Следующие шаги:');
    console.log('   1. Просмотрите сгенерированные файлы в .stitch-temp/');
    console.log('   2. Экспортируйте нужные компоненты через npm run stitch:export');
    console.log('   3. Проверьте типы: npm run type-check');
    console.log('   4. Доработайте при необходимости');
    console.log('');
  } catch (error) {
    console.error('❌ Ошибка генерации экранов:', error);
    process.exit(1);
  }
}

// Запуск
if (require.main === module) {
  main();
}
