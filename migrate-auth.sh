#!/bin/bash

echo "🚀 Начинаем миграцию модуля auth в Core Infrastructure Pillar"
echo ""

# 1. Создаем целевую структуру
echo "📁 Создаем структуру директорий..."
mkdir -p pillars/core-infrastructure/lib/auth/{services,strategies,types,guards}
mkdir -p pillars/core-infrastructure/api/auth
echo "✅ Директории созданы"
echo ""

# 2. Находим текущие файлы аутентификации
echo "📁 Поиск файлов аутентификации в проекте..."
echo ""
echo "=== Файлы в lib/auth/ ==="
find lib/auth -type f 2>/dev/null | head -20 || echo "❌ lib/auth не найден или пуст"
echo ""

echo "=== Файлы в app/api/auth/ ==="
find app/api/auth -type f 2>/dev/null | head -20 || echo "❌ app/api/auth не найден или пуст"
echo ""

echo "=== Файлы с именем *auth* ==="
find . -path ./pillars -prune -o -path ./node_modules -prune -o -type f \( -name "*auth*.ts" -o -name "*auth*.tsx" \) -print 2>/dev/null | grep -v node_modules | head -20
echo ""

# 3. Создаем план переноса
echo "📋 Создаем план миграции..."
cat > AUTH_MIGRATION_PLAN.md << 'MIGRATION'
# 🔐 План Миграции Модуля Auth в Core Infrastructure

## 📍 Текущие Расположения

### API Endpoints
- `app/api/auth/login/route.ts`
- `app/api/auth/signin/route.ts`
- `app/api/auth/signup/route.ts`
- `app/api/auth/register/route.ts`
- `app/api/auth/demo/route.ts`

### Бизнес-Логика
- `lib/auth/` - основные функции аутентификации
- `lib/auth/jwt.ts` - работа с JWT токенами
- `lib/auth/session.ts` - управление сессиями

### Компоненты
- `components/auth/` - UI компоненты (останутся в app/)
- `app/auth/` - страницы аутентификации

### Middleware
- `middleware.ts` - глобальный middleware для проверки auth

---

## 🎯 Новое Расположение в Core Infrastructure

```
pillars/core-infrastructure/
├── lib/
│   └── auth/
│       ├── services/
│       │   ├── jwt.ts          ← JWT работа
│       │   ├── session.ts       ← Управление сессиями
│       │   ├── password.ts      ← Хеширование паролей
│       │   └── validation.ts    ← Валидация данных
│       ├── strategies/
│       │   ├── local.ts         ← Email/password логин
│       │   ├── oauth.ts         ← OAuth2
│       │   └── social.ts        ← Социальные логины
│       ├── types/
│       │   ├── auth.ts          ← Интерфейсы Auth
│       │   ├── user.ts          ← Интерфейсы User
│       │   └── tokens.ts        ← Интерфейсы Token
│       ├── guards/
│       │   ├── auth.guard.ts    ← Проверка auth
│       │   ├── role.guard.ts    ← Проверка ролей
│       │   └── permission.guard.ts ← Проверка прав
│       └── index.ts             ← Public API exports
├── api/
│   └── auth/
│       ├── login/route.ts       ← POST /api/auth/login
│       ├── register/route.ts    ← POST /api/auth/register
│       ├── logout/route.ts      ← POST /api/auth/logout
│       ├── refresh/route.ts     ← POST /api/auth/refresh
│       └── me/route.ts          ← GET /api/auth/me
└── types/
    └── index.ts                 ← Экспорт основных типов
```

---

## 📋 Порядок Действий

### Этап 1: Подготовка (файлы готовы)
- [x] Созданы директории в Core Infrastructure
- [ ] Найдены все текущие файлы auth
- [ ] Создан список зависимостей

### Этап 2: Копирование файлов
- [ ] Скопировать `lib/auth/*` в `pillars/core-infrastructure/lib/auth/services/`
- [ ] Скопировать `app/api/auth/*` в `pillars/core-infrastructure/api/auth/`
- [ ] Скопировать `middleware.ts` в `pillars/core-infrastructure/lib/auth/guards/`

### Этап 3: Анализ зависимостей
- [ ] Найти все импорты `@/lib/auth` в проекте
- [ ] Найти все импорты `@/app/api/auth` в проекте
- [ ] Найти использование middleware в `app/layout.tsx` и `next.config.js`

### Этап 4: Обновление импортов
- [ ] Заменить `@/lib/auth` на `@core-infrastructure/lib/auth`
- [ ] Обновить API пути в компонентах
- [ ] Обновить middleware в layout и конфиге

### Этап 5: Создание Public API
- [ ] Создать `pillars/core-infrastructure/lib/auth/index.ts` с экспортами
- [ ] Создать `pillars/core-infrastructure/types/index.ts` с типами
- [ ] Обновить `pillars/core-infrastructure/lib/index.ts`

### Этап 6: Тестирование
- [ ] Запустить `npm run build`
- [ ] Проверить `npx tsc --noEmit`
- [ ] Запустить `npm test` (если есть)
- [ ] Проверить API endpoints в браузере

### Этап 7: Очистка
- [ ] Удалить старые файлы из `lib/auth/` (если не используются другие Pillars)
- [ ] Удалить старые API endpoints из `app/api/auth/` (если перенесены)
- [ ] Обновить документацию

---

## 🔍 Команды для Анализа

```bash
# Найти все файлы auth
find lib -name "*auth*" -type f
find app/api -path "*/auth/*" -type f
find . -path ./pillars -prune -o -type f -name "*auth*.ts" -print

# Найти все импорты auth
grep -r "from '@/lib/auth" --include="*.ts" --include="*.tsx"
grep -r "from '@/app/api/auth" --include="*.ts" --include="*.tsx"
grep -r "middleware.ts" app/layout.tsx

# Проверить зависимости
grep -r "import.*auth" lib/ | grep -v "lib/auth" | head -20
grep -r "getSession\|checkAuth\|verifyToken" --include="*.ts" --include="*.tsx" | head -20
```

---

## 📊 Статистика

| Метрика | Значение |
|---------|----------|
| API endpoints в auth/ | ~5 |
| Файлов в lib/auth/ | ~10 |
| Строк кода в auth | ~1000 |
| Мест для обновления импортов | ~50-100 |
| Ожидаемое время миграции | 2-3 часа |

---

## ⚠️ Важные Замечания

1. **Зависимости:** Auth часто используется всеми Pillars через `@core-infrastructure/lib/auth`
2. **Middleware:** Нужно обновить глобальный middleware в `middleware.ts`
3. **API пути:** Все компоненты ссылаются на `/api/auth/*`
4. **Сессии:** Проверить использование session cookie
5. **Переменные окружения:** Проверить все JWT_* переменные

---

## 🎯 Успешность Миграции

Миграция успешна, когда:
- ✅ `npm run build` проходит без ошибок
- ✅ `npx tsc --noEmit` нет ошибок типов
- ✅ Все импорты обновлены
- ✅ API endpoints работают
- ✅ Аутентификация функционирует
- ✅ Тесты проходят (если есть)

---

*Создано: 27 января 2026*
*Версия плана: 1.0.0*
MIGRATION

echo "✅ План миграции создан в AUTH_MIGRATION_PLAN.md"
echo ""
echo "📚 Следующие шаги:"
echo "1. Прочитай AUTH_MIGRATION_PLAN.md"
echo "2. Запусти: grep -r \"from '@/lib/auth\" --include=\"*.ts\" --include=\"*.tsx\""
echo "3. Запусти: find lib/auth -type f"
echo "4. Скопируй файлы в pillars/core-infrastructure/lib/auth/"
echo "5. Обнови импорты"
echo "6. Тестируй"
