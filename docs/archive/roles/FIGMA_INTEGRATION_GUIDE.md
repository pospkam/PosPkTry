# 🎨 FIGMA ИНТЕГРАЦИЯ - РУКОВОДСТВО
## KamHub - Импорт дизайнов из Figma

**Дата:** 7 ноября 2025  
**Статус:** ✅ ГОТОВО

---

## 📋 ЧТО СОЗДАНО

### 1. Figma Client (`lib/figma/figma-client.ts`)
```typescript
Функции:
✅ authorize() - OAuth авторизация
✅ getFile() - получение файла Figma
✅ getComponents() - получение компонентов
✅ exportImages() - экспорт изображений
✅ getStyles() - получение стилей
✅ figmaColorToCSS() - конвертация цветов
```

### 2. API Endpoints:
```
✅ GET  /api/figma/callback - OAuth callback
✅ POST /api/figma/import - импорт дизайнов
```

---

## 🔑 ВАШИ CREDENTIALS

```
Client ID:     4WZfL71ZBHuFZ9FD6zcJZz
Client Secret: FIGMA_SECRET_REMOVED
```

**УЖЕ НАСТРОЕНЫ В КОДЕ!** ✅

---

## 🚀 КАК ИСПОЛЬЗОВАТЬ

### Вариант 1: OAuth авторизация (для админов)

#### Шаг 1: Получить ссылку для авторизации
```typescript
import { figmaClient } from '@/lib/figma/figma-client';

const authUrl = figmaClient.getAuthUrl();
// https://www.figma.com/oauth?client_id=...
```

#### Шаг 2: Пользователь авторизуется в Figma
- Кликает по ссылке
- Дает разрешения
- Редиректится на `/api/figma/callback`

#### Шаг 3: Автоматическое сохранение токена
- Токен сохраняется автоматически
- Админ редиректится в настройки

---

### Вариант 2: Personal Access Token (быстро)

#### Шаг 1: Получите Personal Access Token
1. Откройте Figma
2. Settings → Account → Personal Access Tokens
3. Создайте новый токен
4. Скопируйте токен

#### Шаг 2: Импортируйте дизайн
```bash
curl -X POST http://localhost:3000/api/figma/import \
  -H "Content-Type: application/json" \
  -d '{
    "fileKey": "YOUR_FIGMA_FILE_KEY",
    "personalAccessToken": "YOUR_PERSONAL_TOKEN"
  }'
```

---

## 📊 ВОЗМОЖНОСТИ ИНТЕГРАЦИИ

### 1. Импорт компонентов
```typescript
// Получить все компоненты из Figma файла
const components = await figmaClient.getComponents(fileKey);

// Автоматически генерировать React компоненты
```

### 2. Экспорт изображений
```typescript
// Экспортировать иконки, иллюстрации
const images = await figmaClient.exportImages(
  fileKey,
  ['node-id-1', 'node-id-2'],
  'svg',
  2
);
```

### 3. Синхронизация стилей
```typescript
// Получить цвета, типографику, тени
const styles = await figmaClient.getStyles(fileKey);

// Автоматически обновить Tailwind config
```

---

## 🎯 ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ

### Импорт иконок для туров:
```typescript
// 1. Получить файл Figma с иконками
const file = await figmaClient.getFile('TOUR_ICONS_FILE_KEY');

// 2. Экспортировать иконки в SVG
const icons = await figmaClient.exportImages(
  'TOUR_ICONS_FILE_KEY',
  ['icon-volcano', 'icon-fishing', 'icon-heli'],
  'svg'
);

// 3. Сохранить в public/icons/
```

### Импорт UI компонентов:
```typescript
// 1. Получить компоненты кнопок
const components = await figmaClient.getComponents('UI_KIT_FILE_KEY');

// 2. Генерировать React компоненты
// components.forEach(component => {
//   generateReactComponent(component);
// });
```

---

## 🔧 НАСТРОЙКА В FIGMA

### 1. Добавьте Redirect URI в Figma:
```
https://kamhub.ru/api/figma/callback
```

### 2. В настройках вашего Figma App:
1. Перейдите: https://www.figma.com/developers/apps
2. Выберите ваше приложение
3. Settings → OAuth Redirect URIs
4. Добавьте: `https://kamhub.ru/api/figma/callback`

---

## 💡 АВТОМАТИЗАЦИЯ

### Синхронизация дизайн-системы:
```typescript
// Скрипт для автоматического импорта
// scripts/sync-figma-designs.ts

import { figmaClient, getFigmaFileWithToken } from '@/lib/figma/figma-client';

async function syncDesigns() {
  const token = process.env.FIGMA_PERSONAL_TOKEN;
  const fileKey = process.env.FIGMA_FILE_KEY;

  // Импортировать стили
  const styles = await figmaClient.getStyles(fileKey);

  // Обновить Tailwind config
  updateTailwindConfig(styles);

  // Импортировать компоненты
  const components = await figmaClient.getComponents(fileKey);

  // Генерировать React компоненты
  generateComponents(components);
}
```

---

## 🎨 ПОЛЬЗА ДЛЯ KAMHUB

### 1. Консистентный дизайн
- Автоматический импорт цветов и стилей
- Синхронизация с дизайн-системой
- Единый источник истины

### 2. Быстрая разработка
- Импорт готовых компонентов
- Автогенерация React кода
- Экспорт иконок и иллюстраций

### 3. Коллаборация
- Дизайнеры работают в Figma
- Разработчики импортируют автоматически
- Всегда актуальные дизайны

---

## 📝 СЛЕДУЮЩИЕ ШАГИ

### 1. Получите Personal Access Token из Figma
### 2. Создайте файл дизайн-системы в Figma
### 3. Импортируйте компоненты через API
### 4. Настройте автоматическую синхронизацию

---

**Интеграция готова!** 🎨  
**Credentials настроены!** ✅  
**Можно использовать!** 🚀

## KamHub - Импорт дизайнов из Figma

**Дата:** 7 ноября 2025  
**Статус:** ✅ ГОТОВО

---

## 📋 ЧТО СОЗДАНО

### 1. Figma Client (`lib/figma/figma-client.ts`)
```typescript
Функции:
✅ authorize() - OAuth авторизация
✅ getFile() - получение файла Figma
✅ getComponents() - получение компонентов
✅ exportImages() - экспорт изображений
✅ getStyles() - получение стилей
✅ figmaColorToCSS() - конвертация цветов
```

### 2. API Endpoints:
```
✅ GET  /api/figma/callback - OAuth callback
✅ POST /api/figma/import - импорт дизайнов
```

---

## 🔑 ВАШИ CREDENTIALS

```
Client ID:     4WZfL71ZBHuFZ9FD6zcJZz
Client Secret: FIGMA_SECRET_REMOVED
```

**УЖЕ НАСТРОЕНЫ В КОДЕ!** ✅

---

## 🚀 КАК ИСПОЛЬЗОВАТЬ

### Вариант 1: OAuth авторизация (для админов)

#### Шаг 1: Получить ссылку для авторизации
```typescript
import { figmaClient } from '@/lib/figma/figma-client';

const authUrl = figmaClient.getAuthUrl();
// https://www.figma.com/oauth?client_id=...
```

#### Шаг 2: Пользователь авторизуется в Figma
- Кликает по ссылке
- Дает разрешения
- Редиректится на `/api/figma/callback`

#### Шаг 3: Автоматическое сохранение токена
- Токен сохраняется автоматически
- Админ редиректится в настройки

---

### Вариант 2: Personal Access Token (быстро)

#### Шаг 1: Получите Personal Access Token
1. Откройте Figma
2. Settings → Account → Personal Access Tokens
3. Создайте новый токен
4. Скопируйте токен

#### Шаг 2: Импортируйте дизайн
```bash
curl -X POST http://localhost:3000/api/figma/import \
  -H "Content-Type: application/json" \
  -d '{
    "fileKey": "YOUR_FIGMA_FILE_KEY",
    "personalAccessToken": "YOUR_PERSONAL_TOKEN"
  }'
```

---

## 📊 ВОЗМОЖНОСТИ ИНТЕГРАЦИИ

### 1. Импорт компонентов
```typescript
// Получить все компоненты из Figma файла
const components = await figmaClient.getComponents(fileKey);

// Автоматически генерировать React компоненты
```

### 2. Экспорт изображений
```typescript
// Экспортировать иконки, иллюстрации
const images = await figmaClient.exportImages(
  fileKey,
  ['node-id-1', 'node-id-2'],
  'svg',
  2
);
```

### 3. Синхронизация стилей
```typescript
// Получить цвета, типографику, тени
const styles = await figmaClient.getStyles(fileKey);

// Автоматически обновить Tailwind config
```

---

## 🎯 ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ

### Импорт иконок для туров:
```typescript
// 1. Получить файл Figma с иконками
const file = await figmaClient.getFile('TOUR_ICONS_FILE_KEY');

// 2. Экспортировать иконки в SVG
const icons = await figmaClient.exportImages(
  'TOUR_ICONS_FILE_KEY',
  ['icon-volcano', 'icon-fishing', 'icon-heli'],
  'svg'
);

// 3. Сохранить в public/icons/
```

### Импорт UI компонентов:
```typescript
// 1. Получить компоненты кнопок
const components = await figmaClient.getComponents('UI_KIT_FILE_KEY');

// 2. Генерировать React компоненты
// components.forEach(component => {
//   generateReactComponent(component);
// });
```

---

## 🔧 НАСТРОЙКА В FIGMA

### 1. Добавьте Redirect URI в Figma:
```
https://kamhub.ru/api/figma/callback
```

### 2. В настройках вашего Figma App:
1. Перейдите: https://www.figma.com/developers/apps
2. Выберите ваше приложение
3. Settings → OAuth Redirect URIs
4. Добавьте: `https://kamhub.ru/api/figma/callback`

---

## 💡 АВТОМАТИЗАЦИЯ

### Синхронизация дизайн-системы:
```typescript
// Скрипт для автоматического импорта
// scripts/sync-figma-designs.ts

import { figmaClient, getFigmaFileWithToken } from '@/lib/figma/figma-client';

async function syncDesigns() {
  const token = process.env.FIGMA_PERSONAL_TOKEN;
  const fileKey = process.env.FIGMA_FILE_KEY;

  // Импортировать стили
  const styles = await figmaClient.getStyles(fileKey);

  // Обновить Tailwind config
  updateTailwindConfig(styles);

  // Импортировать компоненты
  const components = await figmaClient.getComponents(fileKey);

  // Генерировать React компоненты
  generateComponents(components);
}
```

---

## 🎨 ПОЛЬЗА ДЛЯ KAMHUB

### 1. Консистентный дизайн
- Автоматический импорт цветов и стилей
- Синхронизация с дизайн-системой
- Единый источник истины

### 2. Быстрая разработка
- Импорт готовых компонентов
- Автогенерация React кода
- Экспорт иконок и иллюстраций

### 3. Коллаборация
- Дизайнеры работают в Figma
- Разработчики импортируют автоматически
- Всегда актуальные дизайны

---

## 📝 СЛЕДУЮЩИЕ ШАГИ

### 1. Получите Personal Access Token из Figma
### 2. Создайте файл дизайн-системы в Figma
### 3. Импортируйте компоненты через API
### 4. Настройте автоматическую синхронизацию

---

**Интеграция готова!** 🎨  
**Credentials настроены!** ✅  
**Можно использовать!** 🚀

## KamHub - Импорт дизайнов из Figma

**Дата:** 7 ноября 2025  
**Статус:** ✅ ГОТОВО

---

## 📋 ЧТО СОЗДАНО

### 1. Figma Client (`lib/figma/figma-client.ts`)
```typescript
Функции:
✅ authorize() - OAuth авторизация
✅ getFile() - получение файла Figma
✅ getComponents() - получение компонентов
✅ exportImages() - экспорт изображений
✅ getStyles() - получение стилей
✅ figmaColorToCSS() - конвертация цветов
```

### 2. API Endpoints:
```
✅ GET  /api/figma/callback - OAuth callback
✅ POST /api/figma/import - импорт дизайнов
```

---

## 🔑 ВАШИ CREDENTIALS

```
Client ID:     4WZfL71ZBHuFZ9FD6zcJZz
Client Secret: FIGMA_SECRET_REMOVED
```

**УЖЕ НАСТРОЕНЫ В КОДЕ!** ✅

---

## 🚀 КАК ИСПОЛЬЗОВАТЬ

### Вариант 1: OAuth авторизация (для админов)

#### Шаг 1: Получить ссылку для авторизации
```typescript
import { figmaClient } from '@/lib/figma/figma-client';

const authUrl = figmaClient.getAuthUrl();
// https://www.figma.com/oauth?client_id=...
```

#### Шаг 2: Пользователь авторизуется в Figma
- Кликает по ссылке
- Дает разрешения
- Редиректится на `/api/figma/callback`

#### Шаг 3: Автоматическое сохранение токена
- Токен сохраняется автоматически
- Админ редиректится в настройки

---

### Вариант 2: Personal Access Token (быстро)

#### Шаг 1: Получите Personal Access Token
1. Откройте Figma
2. Settings → Account → Personal Access Tokens
3. Создайте новый токен
4. Скопируйте токен

#### Шаг 2: Импортируйте дизайн
```bash
curl -X POST http://localhost:3000/api/figma/import \
  -H "Content-Type: application/json" \
  -d '{
    "fileKey": "YOUR_FIGMA_FILE_KEY",
    "personalAccessToken": "YOUR_PERSONAL_TOKEN"
  }'
```

---

## 📊 ВОЗМОЖНОСТИ ИНТЕГРАЦИИ

### 1. Импорт компонентов
```typescript
// Получить все компоненты из Figma файла
const components = await figmaClient.getComponents(fileKey);

// Автоматически генерировать React компоненты
```

### 2. Экспорт изображений
```typescript
// Экспортировать иконки, иллюстрации
const images = await figmaClient.exportImages(
  fileKey,
  ['node-id-1', 'node-id-2'],
  'svg',
  2
);
```

### 3. Синхронизация стилей
```typescript
// Получить цвета, типографику, тени
const styles = await figmaClient.getStyles(fileKey);

// Автоматически обновить Tailwind config
```

---

## 🎯 ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ

### Импорт иконок для туров:
```typescript
// 1. Получить файл Figma с иконками
const file = await figmaClient.getFile('TOUR_ICONS_FILE_KEY');

// 2. Экспортировать иконки в SVG
const icons = await figmaClient.exportImages(
  'TOUR_ICONS_FILE_KEY',
  ['icon-volcano', 'icon-fishing', 'icon-heli'],
  'svg'
);

// 3. Сохранить в public/icons/
```

### Импорт UI компонентов:
```typescript
// 1. Получить компоненты кнопок
const components = await figmaClient.getComponents('UI_KIT_FILE_KEY');

// 2. Генерировать React компоненты
// components.forEach(component => {
//   generateReactComponent(component);
// });
```

---

## 🔧 НАСТРОЙКА В FIGMA

### 1. Добавьте Redirect URI в Figma:
```
https://kamhub.ru/api/figma/callback
```

### 2. В настройках вашего Figma App:
1. Перейдите: https://www.figma.com/developers/apps
2. Выберите ваше приложение
3. Settings → OAuth Redirect URIs
4. Добавьте: `https://kamhub.ru/api/figma/callback`

---

## 💡 АВТОМАТИЗАЦИЯ

### Синхронизация дизайн-системы:
```typescript
// Скрипт для автоматического импорта
// scripts/sync-figma-designs.ts

import { figmaClient, getFigmaFileWithToken } from '@/lib/figma/figma-client';

async function syncDesigns() {
  const token = process.env.FIGMA_PERSONAL_TOKEN;
  const fileKey = process.env.FIGMA_FILE_KEY;

  // Импортировать стили
  const styles = await figmaClient.getStyles(fileKey);

  // Обновить Tailwind config
  updateTailwindConfig(styles);

  // Импортировать компоненты
  const components = await figmaClient.getComponents(fileKey);

  // Генерировать React компоненты
  generateComponents(components);
}
```

---

## 🎨 ПОЛЬЗА ДЛЯ KAMHUB

### 1. Консистентный дизайн
- Автоматический импорт цветов и стилей
- Синхронизация с дизайн-системой
- Единый источник истины

### 2. Быстрая разработка
- Импорт готовых компонентов
- Автогенерация React кода
- Экспорт иконок и иллюстраций

### 3. Коллаборация
- Дизайнеры работают в Figma
- Разработчики импортируют автоматически
- Всегда актуальные дизайны

---

## 📝 СЛЕДУЮЩИЕ ШАГИ

### 1. Получите Personal Access Token из Figma
### 2. Создайте файл дизайн-системы в Figma
### 3. Импортируйте компоненты через API
### 4. Настройте автоматическую синхронизацию

---

**Интеграция готова!** 🎨  
**Credentials настроены!** ✅  
**Можно использовать!** 🚀

## KamHub - Импорт дизайнов из Figma

**Дата:** 7 ноября 2025  
**Статус:** ✅ ГОТОВО

---

## 📋 ЧТО СОЗДАНО

### 1. Figma Client (`lib/figma/figma-client.ts`)
```typescript
Функции:
✅ authorize() - OAuth авторизация
✅ getFile() - получение файла Figma
✅ getComponents() - получение компонентов
✅ exportImages() - экспорт изображений
✅ getStyles() - получение стилей
✅ figmaColorToCSS() - конвертация цветов
```

### 2. API Endpoints:
```
✅ GET  /api/figma/callback - OAuth callback
✅ POST /api/figma/import - импорт дизайнов
```

---

## 🔑 ВАШИ CREDENTIALS

```
Client ID:     4WZfL71ZBHuFZ9FD6zcJZz
Client Secret: FIGMA_SECRET_REMOVED
```

**УЖЕ НАСТРОЕНЫ В КОДЕ!** ✅

---

## 🚀 КАК ИСПОЛЬЗОВАТЬ

### Вариант 1: OAuth авторизация (для админов)

#### Шаг 1: Получить ссылку для авторизации
```typescript
import { figmaClient } from '@/lib/figma/figma-client';

const authUrl = figmaClient.getAuthUrl();
// https://www.figma.com/oauth?client_id=...
```

#### Шаг 2: Пользователь авторизуется в Figma
- Кликает по ссылке
- Дает разрешения
- Редиректится на `/api/figma/callback`

#### Шаг 3: Автоматическое сохранение токена
- Токен сохраняется автоматически
- Админ редиректится в настройки

---

### Вариант 2: Personal Access Token (быстро)

#### Шаг 1: Получите Personal Access Token
1. Откройте Figma
2. Settings → Account → Personal Access Tokens
3. Создайте новый токен
4. Скопируйте токен

#### Шаг 2: Импортируйте дизайн
```bash
curl -X POST http://localhost:3000/api/figma/import \
  -H "Content-Type: application/json" \
  -d '{
    "fileKey": "YOUR_FIGMA_FILE_KEY",
    "personalAccessToken": "YOUR_PERSONAL_TOKEN"
  }'
```

---

## 📊 ВОЗМОЖНОСТИ ИНТЕГРАЦИИ

### 1. Импорт компонентов
```typescript
// Получить все компоненты из Figma файла
const components = await figmaClient.getComponents(fileKey);

// Автоматически генерировать React компоненты
```

### 2. Экспорт изображений
```typescript
// Экспортировать иконки, иллюстрации
const images = await figmaClient.exportImages(
  fileKey,
  ['node-id-1', 'node-id-2'],
  'svg',
  2
);
```

### 3. Синхронизация стилей
```typescript
// Получить цвета, типографику, тени
const styles = await figmaClient.getStyles(fileKey);

// Автоматически обновить Tailwind config
```

---

## 🎯 ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ

### Импорт иконок для туров:
```typescript
// 1. Получить файл Figma с иконками
const file = await figmaClient.getFile('TOUR_ICONS_FILE_KEY');

// 2. Экспортировать иконки в SVG
const icons = await figmaClient.exportImages(
  'TOUR_ICONS_FILE_KEY',
  ['icon-volcano', 'icon-fishing', 'icon-heli'],
  'svg'
);

// 3. Сохранить в public/icons/
```

### Импорт UI компонентов:
```typescript
// 1. Получить компоненты кнопок
const components = await figmaClient.getComponents('UI_KIT_FILE_KEY');

// 2. Генерировать React компоненты
// components.forEach(component => {
//   generateReactComponent(component);
// });
```

---

## 🔧 НАСТРОЙКА В FIGMA

### 1. Добавьте Redirect URI в Figma:
```
https://kamhub.ru/api/figma/callback
```

### 2. В настройках вашего Figma App:
1. Перейдите: https://www.figma.com/developers/apps
2. Выберите ваше приложение
3. Settings → OAuth Redirect URIs
4. Добавьте: `https://kamhub.ru/api/figma/callback`

---

## 💡 АВТОМАТИЗАЦИЯ

### Синхронизация дизайн-системы:
```typescript
// Скрипт для автоматического импорта
// scripts/sync-figma-designs.ts

import { figmaClient, getFigmaFileWithToken } from '@/lib/figma/figma-client';

async function syncDesigns() {
  const token = process.env.FIGMA_PERSONAL_TOKEN;
  const fileKey = process.env.FIGMA_FILE_KEY;

  // Импортировать стили
  const styles = await figmaClient.getStyles(fileKey);

  // Обновить Tailwind config
  updateTailwindConfig(styles);

  // Импортировать компоненты
  const components = await figmaClient.getComponents(fileKey);

  // Генерировать React компоненты
  generateComponents(components);
}
```

---

## 🎨 ПОЛЬЗА ДЛЯ KAMHUB

### 1. Консистентный дизайн
- Автоматический импорт цветов и стилей
- Синхронизация с дизайн-системой
- Единый источник истины

### 2. Быстрая разработка
- Импорт готовых компонентов
- Автогенерация React кода
- Экспорт иконок и иллюстраций

### 3. Коллаборация
- Дизайнеры работают в Figma
- Разработчики импортируют автоматически
- Всегда актуальные дизайны

---

## 📝 СЛЕДУЮЩИЕ ШАГИ

### 1. Получите Personal Access Token из Figma
### 2. Создайте файл дизайн-системы в Figma
### 3. Импортируйте компоненты через API
### 4. Настройте автоматическую синхронизацию

---

**Интеграция готова!** 🎨  
**Credentials настроены!** ✅  
**Можно использовать!** 🚀





























