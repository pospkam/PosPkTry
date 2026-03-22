# KamchatourHub — GitHub Copilot Instructions

## Проект

**KamchatourHub** — туристическая платформа Камчатки.
Деплой: pospkam-pospktry-c1f3.twc1.net (Timeweb Cloud)

---

## Стек

- **Frontend:** Next.js App Router, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes, Prisma ORM, PostgreSQL
- **Auth:** JWT, 6 ролей (admin / operator / guide / tourist / moderator / support)
- **CI/CD:** GitHub → Timeweb Cloud автодеплой

---

## Структура

```
src/
  app/          # страницы и API routes (87 страниц)
  components/   # UI компоненты (PascalCase)
  hooks/        # кастомные хуки
  lib/          # утилиты, auth, prisma client
  types/        # TypeScript типы
public/
  images/
    carousel/   # фото для карусели на главной
```

---

## Дизайн-система

- **Акцент:** `#00D4FF` (cyan) — активные состояния
- **Glassmorphism:** `backdrop-blur`, `bg-white/10`, `border-white/20`
- **Заголовки:** Playfair Display
- **Темы:** светлая (`light.jpg`) / тёмная (`dark.jpg`)
- **Мобильный навбар (pill):** Дом / Карта / Избранное / ЛК / СОС
- **Футер:** только desktop
- **5 активностей:** Вулканы / Рыбалка / Термы / Снегоход / Джип

---

## Правила кода

### Делай всегда:
- TypeScript строгий — без `any`
- Валидация входных данных на каждом API route
- JWT проверка на защищённых маршрутах
- Prisma транзакции для связанных операций
- Ошибки с сообщениями на **русском языке**
- Переменные окружения через `.env` — без хардкода

### Никогда:
- Не оставляй `console.log` в продакшн-коде
- Не пиши прямые SQL-запросы мимо Prisma
- Не меняй схему БД без миграции (`prisma migrate dev`)
- Не хардкоди строки подключения и секреты

---

## Бизнес-логика бронирований

- Тур может быть у одного оператора
- Гид привязан к туру через оператора
- Турист бронирует тур → статус: pending / confirmed / cancelled / completed
- Отмена с возвратом — только до 48ч до начала
- Все переходы статусов логируются

---

## Перед генерацией кода

1. Проверь: затронута ли авторизация или роли?
2. Если да — убедись что JWT middleware применён
3. Если меняешь схему — подготовь миграцию
4. Если новый компонент — он должен поддерживать обе темы

---

## Что значит успех

- `npm run build` — без ошибок и предупреждений TypeScript
- `npx prisma migrate deploy` — чистый деплой миграций
- Push в `main` → автодеплой прошёл без ошибок
- Мобильная версия выглядит корректно (светлая тема по умолчанию)
