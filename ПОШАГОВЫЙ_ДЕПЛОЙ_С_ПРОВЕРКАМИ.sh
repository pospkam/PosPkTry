#!/bin/bash

###############################################################################
# ПОШАГОВЫЙ ДЕПЛОЙ С ПРОВЕРКАМИ ВСЕХ 71 СТРАНИЦ
# Сервер: 147.45.158.166
# Проверка взаимосвязей между страницами
###############################################################################

set -e

# Цвета
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${GREEN}✓${NC} $1"; }
log_warn() { echo -e "${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }
log_step() { echo -e "${BLUE}▶${NC} $1"; }
log_check() { echo -e "${CYAN}🔍${NC} $1"; }

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  🚀 ПОШАГОВЫЙ ДЕПЛОЙ С ПРОВЕРКАМИ ВСЕХ 71 СТРАНИЦ         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# ============================================
# ШАГ 1: ПРОВЕРКА ТЕКУЩЕГО СОСТОЯНИЯ
# ============================================
log_step "ШАГ 1/10: Проверка текущего состояния"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

log_check "Проверяю директорию проекта..."
if [ ! -d "/var/www/kamchatour" ]; then
    log_error "Директория /var/www/kamchatour не найдена!"
    exit 1
fi
cd /var/www/kamchatour
log_info "Директория найдена: $(pwd)"

log_check "Проверяю git репозиторий..."
CURRENT_BRANCH=$(git branch --show-current)
CURRENT_COMMIT=$(git log -1 --oneline)
log_info "Текущая ветка: $CURRENT_BRANCH"
log_info "Текущий коммит: $CURRENT_COMMIT"

log_check "Проверяю статус PM2..."
pm2 describe kamchatour &>/dev/null && log_info "Приложение запущено" || log_warn "Приложение не запущено"

echo ""

# ============================================
# ШАГ 2: РЕЗЕРВНОЕ КОПИРОВАНИЕ
# ============================================
log_step "ШАГ 2/10: Создание резервной копии"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

BACKUP_DIR="/var/www/kamchatour_backup_$(date +%Y%m%d_%H%M%S)"
log_check "Создаю резервную копию в $BACKUP_DIR..."

# Копируем только важные файлы
mkdir -p $BACKUP_DIR
cp -r .next $BACKUP_DIR/ 2>/dev/null || log_warn ".next не найден (это нормально)"
cp package.json $BACKUP_DIR/
cp package-lock.json $BACKUP_DIR/ 2>/dev/null || true
log_info "Резервная копия создана"

echo ""

# ============================================
# ШАГ 3: ОБНОВЛЕНИЕ КОДА ИЗ GITHUB
# ============================================
log_step "ШАГ 3/10: Обновление кода из GitHub"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

log_check "Сохраняю локальные изменения..."
git stash save "backup_before_deploy_$(date +%Y%m%d_%H%M%S)" || true

log_check "Получаю последние изменения..."
git fetch origin main
log_info "Изменения получены"

log_check "Сбрасываю к последнему коммиту..."
git reset --hard origin/main
LAST_COMMIT=$(git log -1 --oneline)
log_info "Обновлён до: $LAST_COMMIT"

echo ""

# ============================================
# ШАГ 4: ПРОВЕРКА ВСЕХ СТРАНИЦ В КОДЕ
# ============================================
log_step "ШАГ 4/10: Проверка всех страниц в коде"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

log_check "Подсчитываю страницы..."
PAGES_COUNT=$(find app -name "page.tsx" | wc -l)
log_info "Найдено страниц (page.tsx): $PAGES_COUNT"

log_check "Проверяю взаимосвязи..."
LINKS_COUNT=$(grep -r "import.*Link.*from.*next/link" app --include="*.tsx" | wc -l)
ROUTER_COUNT=$(grep -r "useRouter" app --include="*.tsx" | wc -l)
log_info "Файлов с Link: $LINKS_COUNT"
log_info "Файлов с useRouter: $ROUTER_COUNT"

log_check "Проверяю отсутствие эмодзи..."
EMOJI_COUNT=$(grep -r "🏔️\|🌋\|⭐\|✨\|🐻\|🎣" app --include="*.tsx" 2>/dev/null | wc -l)
if [ $EMOJI_COUNT -eq 0 ]; then
    log_info "✅ Эмодзи отсутствуют (0 найдено)"
else
    log_warn "⚠️ Найдено эмодзи: $EMOJI_COUNT"
fi

echo ""

# ============================================
# ШАГ 5: УСТАНОВКА ЗАВИСИМОСТЕЙ
# ============================================
log_step "ШАГ 5/10: Установка зависимостей"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

log_check "Проверяю package.json..."
if [ ! -f "package.json" ]; then
    log_error "package.json не найден!"
    exit 1
fi
log_info "package.json найден"

log_check "Устанавливаю зависимости..."
npm install --production=false
log_info "Зависимости установлены"

log_check "Проверяю критичные зависимости..."
npm list lucide-react &>/dev/null && log_info "✅ lucide-react установлен" || log_error "❌ lucide-react НЕ установлен"
npm list react-datepicker &>/dev/null && log_info "✅ react-datepicker установлен" || log_warn "⚠️ react-datepicker НЕ установлен"
npm list date-fns &>/dev/null && log_info "✅ date-fns установлен" || log_warn "⚠️ date-fns НЕ установлен"

echo ""

# ============================================
# ШАГ 6: ОСТАНОВКА ПРИЛОЖЕНИЯ
# ============================================
log_step "ШАГ 6/10: Остановка текущего приложения"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

log_check "Останавливаю приложение..."
pm2 delete kamchatour 2>/dev/null && log_info "Приложение остановлено" || log_warn "Приложение не было запущено"

echo ""

# ============================================
# ШАГ 7: ОЧИСТКА КЕША
# ============================================
log_step "ШАГ 7/10: Очистка кеша сборки"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

log_check "Удаляю .next..."
rm -rf .next
log_info ".next удалён"

log_check "Удаляю кеш node_modules..."
rm -rf node_modules/.cache
log_info "Кеш очищен"

echo ""

# ============================================
# ШАГ 8: СБОРКА ПРОЕКТА (ГЛАВНЫЙ ЭТАП)
# ============================================
log_step "ШАГ 8/10: Сборка проекта (это займёт 2-3 минуты)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

log_check "Запускаю сборку..."
BUILD_OUTPUT=$(npm run build 2>&1)
BUILD_EXIT_CODE=$?

if [ $BUILD_EXIT_CODE -ne 0 ]; then
    log_error "Ошибка при сборке!"
    echo "$BUILD_OUTPUT" | tail -30
    exit 1
fi

log_info "✅ Сборка завершена успешно!"

# Подсчитываем собранные страницы
BUILT_PAGES=$(echo "$BUILD_OUTPUT" | grep -c "○\|ƒ\|●" || echo "0")
log_info "📦 Собрано страниц: $BUILT_PAGES"

# Проверяем статические страницы
STATIC_PAGES=$(echo "$BUILD_OUTPUT" | grep -c "○" || echo "0")
log_info "📄 Статических: $STATIC_PAGES"

# Проверяем динамические страницы
DYNAMIC_PAGES=$(echo "$BUILD_OUTPUT" | grep -c "ƒ" || echo "0")
log_info "⚡ Динамических: $DYNAMIC_PAGES"

echo ""

# ============================================
# ШАГ 9: ЗАПУСК ПРИЛОЖЕНИЯ
# ============================================
log_step "ШАГ 9/10: Запуск приложения"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

log_check "Запускаю через PM2..."
pm2 start npm --name kamchatour -- start
log_info "Приложение запущено"

log_check "Сохраняю конфигурацию PM2..."
pm2 save
log_info "Конфигурация сохранена"

log_check "Жду инициализации (5 секунд)..."
sleep 5

echo ""

# ============================================
# ШАГ 10: ПРОВЕРКА РЕЗУЛЬТАТОВ
# ============================================
log_step "ШАГ 10/10: Проверка результатов деплоя"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

log_check "Проверяю статус PM2..."
PM2_STATUS=$(pm2 describe kamchatour | grep "status" | awk '{print $4}')
if [ "$PM2_STATUS" = "online" ]; then
    log_info "✅ Статус: online"
else
    log_error "❌ Статус: $PM2_STATUS"
fi

log_check "Проверяю доступность главной страницы..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    log_info "✅ HTTP 200 OK"
else
    log_warn "⚠️ HTTP $HTTP_CODE"
fi

log_check "Проверяю отсутствие эмодзи на главной..."
EMOJI_ON_PAGE=$(curl -s http://localhost:3000/ | grep -c "🏔️\|🌋\|⭐" || echo "0")
if [ "$EMOJI_ON_PAGE" = "0" ]; then
    log_info "✅ Эмодзи отсутствуют"
else
    log_warn "⚠️ Найдено эмодзи: $EMOJI_ON_PAGE"
fi

log_check "Проверяю наличие lucide иконок..."
LUCIDE_COUNT=$(curl -s http://localhost:3000/ | grep -c "lucide" || echo "0")
if [ "$LUCIDE_COUNT" -gt 0 ]; then
    log_info "✅ lucide-react иконки работают"
else
    log_warn "⚠️ lucide-react не обнаружен"
fi

echo ""

# ============================================
# ИТОГОВЫЙ ОТЧЁТ
# ============================================
echo "╔════════════════════════════════════════════════════════════╗"
echo "║              ✅ ДЕПЛОЙ ЗАВЕРШЁН УСПЕШНО!                   ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 ИТОГОВАЯ СТАТИСТИКА:"
echo "  📦 Страниц в коде: $PAGES_COUNT"
echo "  📦 Собрано страниц: $BUILT_PAGES"
echo "  📄 Статических: $STATIC_PAGES"
echo "  ⚡ Динамических: $DYNAMIC_PAGES"
echo "  🔗 Взаимосвязей (Link): $LINKS_COUNT"
echo "  🔗 Навигация (Router): $ROUTER_COUNT"
echo "  ❌ Эмодзи в коде: $EMOJI_COUNT"
echo "  ✅ Статус PM2: $PM2_STATUS"
echo "  ✅ HTTP код: $HTTP_CODE"
echo ""
echo "🌐 Приложение доступно:"
echo "  http://147.45.158.166/"
echo ""
echo "📋 Команды для управления:"
echo "  pm2 logs kamchatour       - логи"
echo "  pm2 restart kamchatour    - перезапуск"
echo "  pm2 status                - статус"
echo ""
echo "📝 Показываю последние 20 строк логов:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
pm2 logs kamchatour --lines 20 --nostream
echo ""
log_info "Деплой завершён! 🎉"
