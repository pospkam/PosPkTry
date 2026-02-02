# 🚀 БЫСТРЫЙ СТАРТ - ЗАПУСК ТЕСТОВ KAMHUB

## ⚡ 30 СЕКУНДНЫЙ СТАРТ

```bash
# Шаг 1: Перейти в директорию
cd /workspaces/kamhub

# Шаг 2: Установить зависимости (если еще не установлены)
npm install

# Шаг 3: Запустить тесты
./scripts/run-tests.sh all
```

## 📊 ВАРИАНТЫ ЗАПУСКА

### Вариант 1: Только Unit тесты (2-3 минуты)
```bash
npm run test:unit
# или
./scripts/run-tests.sh phase1
```

### Вариант 2: Unit + Integration (7-10 минут)
```bash
npm run test:unit
npm run test:integration
# или
./scripts/run-tests.sh phase1 && ./scripts/run-tests.sh phase2
```

### Вариант 3: Полный набор (30-40 минут)
```bash
./scripts/run-tests.sh all
# или
npm run test:all
```

### Вариант 4: По фазам отдельно
```bash
./scripts/run-tests.sh phase1  # Unit (2-3 мин)
./scripts/run-tests.sh phase2  # Integration (5-10 мин)
./scripts/run-tests.sh phase3  # Security (3-5 мин)
./scripts/run-tests.sh phase4  # Performance (5-10 мин)
./scripts/run-tests.sh phase5  # E2E (10-15 мин)
```

## 🎯 ДЛЯ РАЗРАБОТЧИКОВ

### Watch mode (автоматический перезапуск при изменениях)
```bash
npm run test:watch
# или для конкретного файла
npm run test:watch -- tests/unit/tourist.test.ts
```

### С покрытием кода
```bash
npm run test:coverage
# Результат: coverage/lcov-report/index.html
```

### Конкретный тест
```bash
npm run test -- -t "should create booking"
npm run test -- tests/unit/tourist.test.ts -t "Booking"
```

## 📱 ДЛЯ QA/ТЕСТИРОВЩИКОВ

### E2E тесты (Playwright)
```bash
npm run test:e2e
# или
npx playwright test

# С отчетом
npx playwright test --reporter=html
# Результат: playwright-report/index.html

# Debug режим
npx playwright test --debug
```

### Конкретный браузер
```bash
npx playwright test --project=chromium  # Chrome
npx playwright test --project=firefox   # Firefox
npx playwright test --project=webkit    # Safari
```

## 🔒 ДЛЯ SECURITY ТИМА

### Тесты безопасности
```bash
npm run test:security
# или
./scripts/run-tests.sh phase3
```

### Проверка уязвимостей
```bash
npm audit
npm audit --production
```

## 📈 ДЛЯ DEVOPS

### CI/CD pipeline
```bash
# Локальная симуляция CI
git push main  # Запустит GitHub Actions workflow

# Или запустить локально
npm run test:ci
```

### Docker
```bash
# Запустить с Docker Compose
docker-compose -f docker-compose.test.yml up

# Запустить тесты внутри контейнера
docker-compose exec api npm run test:all
```

## 📊 ПРОСМОТР РЕЗУЛЬТАТОВ

После запуска тестов результаты доступны в:

```
test-results/
├── unit/          # Unit test results
├── integration/   # Integration test results
├── security/      # Security test results
├── performance/   # Performance metrics
└── report.html    # Final HTML report

coverage/
└── lcov-report/   # Code coverage report

playwright-report/ # E2E test report
```

Открыть HTML отчет:
```bash
open test-results/report.html
open coverage/lcov-report/index.html
open playwright-report/index.html
```

## ✅ ОЖИДАЕМЫЙ РЕЗУЛЬТАТ

Успешное выполнение всех тестов:

```
✅ 628+ тестов пройдено
✅ Code coverage: 87%+
✅ 0 critical issues
✅ Performance SLA: PASSED
✅ All user journeys: WORKING
```

## 🛠️ РЕШЕНИЕ ПРОБЛЕМ

### "command not found: ./scripts/run-tests.sh"
```bash
chmod +x scripts/run-tests.sh
./scripts/run-tests.sh all
```

### "npm: command not found"
```bash
# Установить Node.js с https://nodejs.org/
# Или через package manager
brew install node  # macOS
apt install nodejs # Ubuntu/Debian
```

### "Database connection error"
```bash
# Запустить Docker
docker-compose -f docker-compose.test.yml up -d

# Проверить статус
docker-compose -f docker-compose.test.yml ps
```

### "Port already in use"
```bash
# Найти процесс
lsof -i :5433  # PostgreSQL
lsof -i :6380  # Redis

# Убить процесс
kill -9 <PID>

# Или использовать другой порт
DATABASE_URL=postgresql://test:test123@localhost:5434/kamhub_test npm test
```

## 📚 ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ

- **Полное руководство:** [TESTING_COMPREHENSIVE_GUIDE.md](./TESTING_COMPREHENSIVE_GUIDE.md)
- **Финальный отчет:** [TESTING_FINAL_REPORT.md](./TESTING_FINAL_REPORT.md)
- **Статус:** [TESTING_STATUS_FINAL.md](./TESTING_STATUS_FINAL.md)

## 🎯 ТИПИЧНЫЕ СЦЕНАРИИ

### Перед коммитом (5 мин)
```bash
npm run test:unit -- --maxWorkers=1
```

### Перед PR (15 мин)
```bash
./scripts/run-tests.sh phase1 && ./scripts/run-tests.sh phase2
```

### Перед production (40 мин)
```bash
./scripts/run-tests.sh all
```

### Во время разработки
```bash
npm run test:watch -- tests/unit/tourist.test.ts
```

---

**Готово! Выполните команду ниже для запуска тестов:**

```bash
./scripts/run-tests.sh all
```

🚀 **УСПЕШНОГО ТЕСТИРОВАНИЯ!**
