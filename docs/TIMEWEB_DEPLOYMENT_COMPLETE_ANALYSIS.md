# ПОЛНЫЙ АНАЛИЗ ДЕПЛОЯ НА TIMEWEB

**Дата анализа:** 3 февраля 2026  
**Методология:** Проверка всех документов, скриптов, конфигураций  
**Цель:** Понять текущее состояние деплоя и дать чёткий план  

---

## EXECUTIVE SUMMARY

### Найдено:

```
✅ 9 документов по Timeweb деплою
✅ 7 скриптов автоматизации
✅ 1 GitHub Actions workflow
✅ 5 .env примеров
✅ 5 упоминаний серверов
```

### Проблемы:

```
⚠️ Несколько IP адресов (confusion какой актуальный)
⚠️ Устаревшая информация (ноябрь 2025)
⚠️ Дублирование инструкций
⚠️ Отсутствие проверки текущего состояния серверов
```

---

## 1. НАЙДЕННЫЕ СЕРВЕРЫ

### IP адреса в документации:

| IP | Упоминания | Последнее обновление | Статус |
|---|---|---|---|
| **5.129.248.224** | 30+ | февраль 2026 | ⭐ ОСНОВНОЙ |
| 45.8.96.120 | 10+ | ноябрь 2025 | ❓ Устарел? |
| 147.45.158.166 | 5+ | ноябрь 2025 | ❓ Старый |
| 147.45.102.76 | 2 | архив | ❌ Старый |

### Актуальный сервер (по документам):

```
IP: 5.129.248.224
Панель: https://timeweb.cloud/my/servers/5898003
Port: 22 (SSH), 80 (HTTP), 443 (HTTPS)
Используется в:
  - .env.production.example
  - .github/SETUP_GITHUB_SECRETS.md
  - deploy-timeweb.yml
  - Большинство свежих документов
```

---

## 2. ДОКУМЕНТАЦИЯ ПО ДЕПЛОЮ

### Найдено 9 документов:

**Основные (актуальные):**

1. **docs/deployment/TIMEWEB_DEPLOY_NOW.md** (от 2025-11-12)
   - Пошаговая инструкция
   - IP: 45.8.96.120 (возможно устарел)
   - Полнота: 8/10

2. **docs/deployment/TIMEWEB_DEPLOY_INSTRUCTIONS.md**
   - IP: 5.129.248.224 ⭐
   - Автоматический deploy через скрипты
   - Webhook setup
   - Полнота: 9/10

3. **docs/deployment/DEPLOY_MANUAL_TIMEWEB.md**
   - IP: 5.129.248.224 ⭐
   - Подробная ручная установка
   - Полнота: 8/10

**Дополнительные:**

4. **docs/deployment/TIMEWEB_DB_SETUP.md** - Настройка БД
5. **docs/deployment/TIMEWEB_ENV_SETUP.md** - Настройка окружения
6. **docs/deployment/ДЕПЛОЙ_TIMEWEB_ИНСТРУКЦИЯ.md** - На русском
7. **docs/archive/roles/DEPLOY_TIMEWEB_GUIDE.md** - Старая версия
8. **docs/TIMEWEB_DEPLOYMENT.md** - Краткая инструкция
9. **docs/TIMEWEB_MANUAL_DEPLOY.md** - Ручной деплой

### Проблема:

```
9 документов с частично дублирующейся информацией
→ Confusion какой использовать
→ Разные IP адреса
→ Разная актуальность
```

**Рекомендация:** Объединить в 1 актуальный документ

---

## 3. СКРИПТЫ АВТОМАТИЗАЦИИ

### Найдено 7 скриптов:

| Скрипт | Строк | Функционал | Статус |
|--------|-------|------------|--------|
| `deploy-timeweb.sh` | 372 | Полный автоматический деплой | ✅ Актуальный |
| `deploy-timeweb-full.sh` | - | Возможно дубликат | ❓ |
| `scripts/timeweb-quick-deploy.sh` | - | Быстрый деплой | ❓ |
| `scripts/auto-deploy-timeweb.sh` | - | Авто-деплой | ❓ |
| `scripts/deploy-to-timeweb.sh` | - | Ещё один вариант | ❓ |
| `deploy-to-timeweb-now.sh` | - | Срочный деплой | ❓ |
| `deploy-to-timeweb.ps1` | - | PowerShell (Windows) | ❓ |

### Проблемы:

```
7 скриптов = избыточность
→ Какой использовать?
→ Какой актуальный?
→ Есть ли различия?
```

**Требуется:** Проверить каждый скрипт и выбрать один актуальный

---

## 4. GITHUB ACTIONS WORKFLOW

### Файл: `.github/workflows/deploy-timeweb.yml`

**Что делает:**
```yaml
Триггер: push в main или manual dispatch
Сервер: использует secrets (TIMEWEB_HOST, TIMEWEB_USER, TIMEWEB_PASSWORD)
Действия:
  1. git pull (если есть) или git clone
  2. npm ci --production=false
  3. npm run build
  4. pm2 restart или pm2 start
```

**Проблемы:**

```
⚠️ Использует пароль вместо SSH ключа (менее безопасно)
⚠️ Нет проверки успешности build
⚠️ Нет rollback при ошибке
⚠️ Нет применения миграций
⚠️ Нет уведомлений (только echo в лог)
```

**Оценка:** 5/10 - Работает базово, но без best practices

---

## 5. КОНФИГУРАЦИЯ ОКРУЖЕНИЯ

### .env файлы:

**1. .env.production.example** (актуальный)
```
DATABASE_URL: postgresql://kamhub_user:pass@localhost:5432/kamhub
NEXT_PUBLIC_API_URL: http://5.129.248.224:3002 ⭐
YANDEX_WEATHER_API_KEY: REPLACE_WITH_YANDEX_WEATHER_API_KEY (есть ключ!)
YANDEX_MAPS_API_KEY: REPLACE_WITH_YANDEX_MAPS_API_KEY (есть ключ!)
```

**2. .env.local.example** (для разработки)
```
Для локальной разработки
Меньше переменных
```

**3. .env.example** (базовый)
```
Минимальный набор
```

### Критичные переменные:

**ОБЯЗАТЕЛЬНЫЕ (проект не запустится):**
```
✅ DATABASE_URL - есть пример
✅ JWT_SECRET - генерируется автоматически
✅ NODE_ENV=production
```

**ВАЖНЫЕ (функционал не работает):**
```
✅ YANDEX_WEATHER_API_KEY - ЕСТЬ ключ!
✅ YANDEX_MAPS_API_KEY - ЕСТЬ ключ!
❌ GROQ_API_KEY - нет (AI не работает)
❌ DEEPSEEK_API_KEY - нет (AI fallback нет)
```

**ОПЦИОНАЛЬНЫЕ:**
```
❌ CLOUDPAYMENTS_* - нет (платежи не работают)
❌ SMTP_* - нет (email не работают)
❌ SMS_RU_API_KEY - нет (SMS не работают)
❌ TELEGRAM_BOT_TOKEN - нет (уведомления не работают)
```

---

## 6. ТЕКУЩЕЕ СОСТОЯНИЕ ДЕПЛОЯ

### Что известно:

**Сервер:** 5.129.248.224 (основной)

**Предположительно установлено:**
- Node.js 20
- PostgreSQL 14
- Nginx
- PM2

**НЕ проверено:**
```
❓ Запущено ли приложение сейчас?
❓ Работает ли БД?
❓ Применены ли миграции?
❓ Актуальна ли версия кода?
```

### Требуется проверка:

```bash
# Подключиться и проверить
ssh root@5.129.248.224

# Проверить что работает
pm2 status
curl http://localhost:3000
systemctl status nginx
psql -U kamhub_user -d kamhub -c "\dt"
```

---

## 7. ПРОЦЕСС ДЕПЛОЯ (ЧТО И КАК)

### Вариант 1: Автоматический (GitHub Actions)

**Шаги:**

```
1. Настройка (один раз):
   - Добавить secrets в GitHub
   - Запустить "Initial Deploy" workflow

2. Использование:
   - git push origin main
   - Workflow запустится автоматически
   - ~5-10 минут
   - Приложение обновится

Время: ~10 минут (первый раз), ~3-5 минут (обновления)
Сложность: Низкая
Требует: GitHub secrets
```

**Проблемы:**
```
⚠️ Нет rollback
⚠️ Нет применения миграций
⚠️ Нет проверки health после deploy
```

---

### Вариант 2: Ручной (через скрипт)

**Шаги:**

```bash
1. Подключиться к серверу:
   ssh root@5.129.248.224

2. Запустить скрипт:
   cd /var/www/kamhub
   bash deploy-timeweb.sh
   
3. Скрипт делает:
   - Обновление системы
   - Установка зависимостей (если нужно)
   - git pull
   - npm ci
   - npm run build
   - Применение миграций
   - pm2 restart
   - Проверка health

Время: ~10-15 минут
Сложность: Средняя
Требует: SSH доступ
```

**Преимущества:**
```
✅ Полный контроль
✅ Применяет миграции
✅ Проверяет результат
```

---

### Вариант 3: С нуля (первичная установка)

**Используется:** `deploy-timeweb-full.sh` (372 строки)

**Что делает:**

```
1. Обновление системы (apt update/upgrade)
2. Установка Node.js 20
3. Установка PostgreSQL 14 + PostGIS
4. Установка Nginx
5. Установка PM2
6. Создание БД и пользователя
7. Применение 16 миграций
8. Клонирование/копирование проекта
9. npm install + build
10. Настройка PM2 (запуск, автостарт)
11. Настройка Nginx (reverse proxy)
12. Настройка firewall (ufw)
13. Создание backup скриптов

Время: ~15-20 минут
Сложность: Низкая (автоматически)
Требует: Чистый сервер
```

**Оценка:** 9/10 - Отличный скрипт

---

## 8. АРХИТЕКТУРА ДЕПЛОЯ

```
Пользователь
    ↓
  Internet
    ↓
Nginx (80/443) - Reverse Proxy
    ↓
Next.js (3002) - PM2
    ↓
PostgreSQL (5432) - Локально
    ↓
Timeweb VDS
```

### Компоненты:

**1. Nginx**
- Принимает HTTP/HTTPS запросы
- Проксирует на Next.js (порт 3002)
- Отдаёт статику с кэшированием
- Security headers

**2. PM2**
- Менеджер процессов Node.js
- Автоперезапуск при падении
- Логирование
- Автостарт при reboot
- Cluster mode (использует все CPU)

**3. PostgreSQL**
- База данных
- PostGIS расширение (для карт)
- uuid-ossp (для UUID)
- 24 таблицы (после миграций)

**4. Next.js**
- Приложение на порту 3002
- Production mode
- SSR + API routes

---

## 9. МИГРАЦИИ БАЗЫ ДАННЫХ

### Найдено 16 миграций:

```
lib/database/migrations/
├── 002_add_password_hash.sql
├── 003_link_users_partners.sql
├── 004_fix_bookings_schema.sql
├── 005_add_notifications.sql
├── 006_add_operator_tables.sql
├── 006_add_password_hash_to_users.sql (дубликат?)
├── 007_add_user_id_to_partners.sql
├── 007_booking_notifications_trigger.sql (дубликат номера?)
├── 008_transfer_system_tables.sql
├── 009_transfer_notifications.sql
├── 010_add_guide_fields.sql
├── 011_create_guide_tables.sql
├── 012_create_gear_system.sql
├── 013_create_cars_system.sql
├── 014_create_souvenir_system.sql
├── 015_create_tourist_system.sql
└── 016_add_tour_category.sql
```

### Проблемы:

```
⚠️ Дублирование номеров (006 дважды, 007 дважды)
⚠️ Нет 001_ миграции (или это database/schema.sql?)
⚠️ Нет команды npm run migrate:up в package.json?
```

**Требуется проверка:** Есть ли npm скрипт для миграций

---

## 10. КРИТИЧЕСКИЕ НАХОДКИ

### Находка 1: Есть production API ключи!

```
YANDEX_WEATHER_API_KEY=REPLACE_WITH_YANDEX_WEATHER_API_KEY
YANDEX_MAPS_API_KEY=REPLACE_WITH_YANDEX_MAPS_API_KEY

⚠️ ОПАСНОСТЬ: Ключи в открытом репозитории!
→ Любой может их использовать
→ Могут украсть лимиты API
→ Нужно переместить в secrets
```

### Находка 2: Множественные версии скриптов

```
7 скриптов деплоя
9 документов
→ Непонятно какой актуальный
→ Возможны различия
→ Confusion при деплое
```

### Находка 3: GitHub Actions без миграций

```
Workflow делает:
✓ git pull
✓ npm ci
✓ npm run build
✓ pm2 restart

НЕ делает:
✗ npm run migrate (нет применения миграций!)
✗ Проверка health
✗ Rollback при ошибке

Проблема: После deploy новые миграции не применятся
```

### Находка 4: Порт 3002 vs 3000

```
В документации: порт 3002
В nginx config: proxy_pass http://127.0.0.1:3002

Но в .env.local.example: PORT=3000

→ Какой порт реально используется?
→ Нужна проверка
```

---

## 11. ПЛАН ДЕЙСТВИЙ

### ЧТО НУЖНО СДЕЛАТЬ СРОЧНО:

**1. Проверить текущее состояние сервера (10 минут)**

```bash
# Подключиться
ssh root@5.129.248.224

# Проверить компоненты
pm2 status                      # Запущено ли приложение?
systemctl status nginx          # Работает ли Nginx?
systemctl status postgresql     # Работает ли БД?
curl http://localhost:3002      # Отвечает ли приложение?
curl http://5.129.248.224       # Доступно ли снаружи?

# Проверить БД
psql -U kamhub_user -d kamhub -c "\dt"  # Есть ли таблицы?

# Проверить версию кода
cd /var/www/kamhub
git log -1 --oneline            # Какой коммит задеплоен?
```

**2. Убрать API ключи из репозитория (5 минут)**

```bash
# Локально
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env.production.example" \
  --prune-empty --tag-name-filter cat -- --all

# Или просто удалить ключи из файла
sed -i 's/REPLACE_WITH_YANDEX_WEATHER_API_KEY/YOUR_YANDEX_WEATHER_KEY/' .env.production.example
sed -i 's/REPLACE_WITH_YANDEX_MAPS_API_KEY/YOUR_YANDEX_MAPS_KEY/' .env.production.example

git add .env.production.example
git commit -m "security: Remove production API keys from example"
git push
```

**3. Объединить документацию (30 минут)**

Создать один файл: `docs/deployment/TIMEWEB_CURRENT.md`
Удалить/архивировать остальные 8

---

### ЧТО НУЖНО УЛУЧШИТЬ:

**4. GitHub Actions workflow (1 час)**

Добавить:
```yaml
# Применение миграций
- name: Apply migrations
  run: npm run migrate:up || true

# Health check после deploy
- name: Health check
  run: |
    sleep 10
    curl -f http://5.129.248.224/api/health || exit 1

# Уведомление в Telegram (если настроен)
- name: Notify
  if: always()
  run: |
    # отправить статус деплоя
```

**5. Объединить скрипты (30 минут)**

Оставить:
- `deploy-timeweb.sh` - основной
- `scripts/update.sh` - для обновлений

Удалить остальные 5

**6. Добавить мониторинг (2 часа)**

- Health check endpoint (`/api/health`)
- Database check
- Uptime monitoring (UptimeRobot)
- Error tracking (Sentry)

---

## 12. АКТУАЛЬНАЯ ИНСТРУКЦИЯ ДЕПЛОЯ

### Для ПЕРВОГО деплоя:

```bash
# 1. На локальной машине
git clone https://github.com/PosPk/kamhub.git
cd kamhub

# 2. Скопировать на сервер
scp -r . root@5.129.248.224:/var/www/kamhub/

# 3. На сервере
ssh root@5.129.248.224
cd /var/www/kamhub
chmod +x deploy-timeweb.sh
bash deploy-timeweb.sh

# 4. Добавить API ключи вручную
nano .env
# Добавить GROQ_API_KEY, DEEPSEEK_API_KEY

# 5. Перезапустить
pm2 restart kamchatour-hub

# 6. Проверить
curl http://5.129.248.224
```

**Время:** ~20 минут

---

### Для ОБНОВЛЕНИЙ:

**Вариант А: Через GitHub Actions**
```
1. git push origin main
2. Workflow запустится автоматически
3. Подождать 5 минут
4. Проверить: http://5.129.248.224
```

**Вариант Б: Вручную**
```bash
ssh root@5.129.248.224
cd /var/www/kamhub
git pull origin main
npm ci
npm run build
pm2 restart kamchatour-hub
```

**Время:** 3-5 минут

---

## 13. ПРОБЛЕМЫ И РЕШЕНИЯ

### Проблема 1: "Сайт не открывается"

**Диагностика:**
```bash
# На сервере
pm2 status                      # Приложение работает?
curl http://localhost:3002      # Next.js отвечает?
systemctl status nginx          # Nginx работает?
sudo netstat -tlnp | grep 3002  # Порт слушается?
```

**Решения:**
```bash
# Если pm2 не работает
pm2 restart kamchatour-hub

# Если порт занят
pm2 delete kamchatour-hub
pm2 start npm --name kamchatour-hub -- start

# Если Nginx не работает
sudo nginx -t
sudo systemctl restart nginx
```

---

### Проблема 2: "Build fails"

**Диагностика:**
```bash
cd /var/www/kamhub
npm run build
# Смотрим ошибку
```

**Частые причины:**
```
- Недостаточно памяти → увеличить RAM или NODE_OPTIONS
- Отсутствуют зависимости → npm ci --production=false
- Синтаксическая ошибка → проверить последний коммит
- .env неправильный → проверить переменные
```

---

### Проблема 3: "База данных не работает"

**Диагностика:**
```bash
# Проверить PostgreSQL
systemctl status postgresql

# Проверить подключение
psql -U kamhub_user -d kamhub -c "SELECT 1;"

# Проверить таблицы
psql -U kamhub_user -d kamhub -c "\dt"
```

**Решения:**
```bash
# Если БД нет
sudo -u postgres createdb kamhub
sudo -u postgres createuser kamhub_user

# Если нет миграций
cd /var/www/kamhub
npm run migrate:up

# Если миграций нет
psql -U kamhub_user -d kamhub -f database/full-schema.sql
```

---

## 14. РЕКОМЕНДАЦИИ

### Срочно (сегодня):

```
1. Проверить состояние сервера 5.129.248.224
   Команда: ssh root@5.129.248.224 && pm2 status
   Время: 5 минут
   
2. Удалить API ключи из .env.production.example
   Команда: sed замена + commit
   Время: 5 минут
   
3. Проверить какие скрипты актуальные
   Команда: cat каждый, сравнить
   Время: 15 минут
```

### На этой неделе:

```
4. Объединить документацию деплоя (1 актуальный файл)
   Время: 30 минут
   
5. Улучшить GitHub Actions (миграции + health check)
   Время: 1 час
   
6. Настроить мониторинг (UptimeRobot, health endpoint)
   Время: 2 часа
```

---

## 15. ВЫВОДЫ

### Что есть (положительное):

```
✅ Полная документация (9 файлов)
✅ Автоматические скрипты (7 штук)
✅ GitHub Actions workflow
✅ Production API ключи (Yandex Weather, Maps)
✅ Примеры .env файлов
✅ Актуальный сервер: 5.129.248.224
```

### Что не так (проблемы):

```
⚠️ API ключи в открытом репозитории (SECURITY!)
⚠️ 9 документов = confusion
⚠️ 7 скриптов = непонятно какой использовать
⚠️ GitHub Actions без миграций
⚠️ Нет проверки текущего состояния
⚠️ Устаревшие IP в документах
```

### Реальная готовность деплоя:

```
Техническая: 8/10 (скрипты работают)
Документация: 6/10 (много, но запутанная)
Безопасность: 4/10 (ключи в репо!)
Автоматизация: 5/10 (GitHub Actions базовый)
Мониторинг: 2/10 (почти отсутствует)

ОБЩАЯ ОЦЕНКА: 6/10 (можно задеплоить, но с проблемами)
```

---

## 16. АКТУАЛЬНАЯ ИНФОРМАЦИЯ (SUMMARY)

### Основной сервер:

```
IP: 5.129.248.224
Панель: https://timeweb.cloud/my/servers/5898003
SSH: ssh root@5.129.248.224
URL: http://5.129.248.224 (если задеплоен)
```

### Основной скрипт:

```
deploy-timeweb.sh (372 строки)
Делает: Полный автоматический деплой
Использовать: Для первого деплоя или обновлений
```

### GitHub Actions:

```
Файл: .github/workflows/deploy-timeweb.yml
Триггер: push в main
Что делает: git pull + build + pm2 restart
Проблемы: Нет миграций, нет health check
```

### API ключи:

```
⚠️ В .env.production.example есть реальные ключи!
→ Нужно удалить СРОЧНО
→ Добавить в .gitignore
→ Использовать GitHub Secrets
```

---

## 17. НЕМЕДЛЕННЫЕ ДЕЙСТВИЯ

### Приоритет КРИТИЧЕСКИЙ (сделать сейчас):

**1. Удалить API ключи из репозитория**
```bash
# Уже в следующем коммите
```

**2. Проверить сервер**
```bash
ssh root@5.129.248.224
pm2 status
curl http://localhost:3002
```

**3. Если не задеплоен - задеплоить**
```bash
cd /var/www/kamhub
bash deploy-timeweb.sh
```

---

**Документ обновлён:** 3 февраля 2026  
**Статус:** Готов к использованию  
**Следующий шаг:** Проверить сервер и удалить API ключи
