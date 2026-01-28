#!/bin/bash

# KamHub Test Suite Runner
# Полный набор тестов перед production deployment

set -e  # Exit on error

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функции вывода
print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

# Проверка зависимостей
check_dependencies() {
    print_header "ПРОВЕРКА ЗАВИСИМОСТЕЙ"

    # Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js не установлен"
        exit 1
    fi
    print_success "Node.js версия: $(node --version)"

    # Docker
    if ! command -v docker &> /dev/null; then
        print_warning "Docker не установлен (необходим для интеграционных тестов)"
    else
        print_success "Docker установлен"
    fi

    # npm packages
    if [ ! -d "node_modules" ]; then
        print_warning "node_modules не найден, установка зависимостей..."
        npm install
    fi
    print_success "npm зависимости установлены"
}

# Запуск unit тестов
run_unit_tests() {
    print_header "PHASE 1: UNIT ТЕСТЫ"
    
    echo "Запуск unit тестов..."
    npm run test:unit -- --coverage --collectCoverageFrom='src/**/*.ts'
    
    print_success "Unit тесты завершены"
}

# Запуск интеграционных тестов
run_integration_tests() {
    print_header "PHASE 2: ИНТЕГРАЦИОННЫЕ ТЕСТЫ"
    
    echo "Запуск Docker контейнеров..."
    docker-compose -f docker-compose.test.yml up -d
    
    echo "Ожидание готовности БД (10 сек)..."
    sleep 10
    
    echo "Запуск интеграционных тестов..."
    npm run test:integration
    
    echo "Остановка Docker контейнеров..."
    docker-compose -f docker-compose.test.yml down
    
    print_success "Интеграционные тесты завершены"
}

# Запуск тестов безопасности
run_security_tests() {
    print_header "PHASE 3: ТЕСТЫ БЕЗОПАСНОСТИ"
    
    echo "Запуск тестов безопасности..."
    npm run test:security
    
    echo "Проверка уязвимостей зависимостей..."
    npm audit --production
    
    print_success "Тесты безопасности завершены"
}

# Запуск тестов производительности
run_performance_tests() {
    print_header "PHASE 4: ТЕСТЫ ПРОИЗВОДИТЕЛЬНОСТИ"
    
    echo "Запуск тестов производительности..."
    npm run test:performance
    
    print_success "Тесты производительности завершены"
}

# Запуск E2E тестов
run_e2e_tests() {
    print_header "PHASE 5: E2E ТЕСТЫ"
    
    echo "Установка Playwright браузеров..."
    npx playwright install --with-deps
    
    echo "Запуск приложения..."
    npm run start &
    APP_PID=$!
    
    echo "Ожидание запуска приложения (15 сек)..."
    sleep 15
    
    echo "Запуск E2E тестов..."
    npm run test:e2e || E2E_FAILED=1
    
    # Остановка приложения
    kill $APP_PID || true
    
    if [ $E2E_FAILED ]; then
        print_error "E2E тесты не прошли"
        return 1
    fi
    
    print_success "E2E тесты завершены"
}

# Генерация отчёта
generate_report() {
    print_header "ГЕНЕРАЦИЯ ОТЧЁТА"
    
    echo "Сбор результатов тестов..."
    npm run test:coverage -- --reporters json-summary
    
    echo "Генерация HTML отчёта..."
    node scripts/generate-test-report.js
    
    print_success "Отчёт сгенерирован: open test-results/report.html"
}

# Финальная проверка готовности
check_production_readiness() {
    print_header "ПРОВЕРКА ГОТОВНОСТИ К PRODUCTION"
    
    # Проверка покрытия кода
    COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
    echo "Покрытие кода: ${COVERAGE}%"
    
    if (( $(echo "$COVERAGE < 80" | bc -l) )); then
        print_warning "Покрытие кода ниже 80%"
    else
        print_success "Покрытие кода достаточно"
    fi
    
    # Проверка уязвимостей
    VULNERABILITIES=$(npm audit --json | jq '.metadata.vulnerabilities.critical')
    echo "Критические уязвимости: $VULNERABILITIES"
    
    if [ "$VULNERABILITIES" -gt 0 ]; then
        print_error "Найдены критические уязвимости!"
        return 1
    else
        print_success "Уязвимостей не найдено"
    fi
    
    # Проверка performance метрик
    if [ -f "test-results/performance.json" ]; then
        P95=$(cat test-results/performance.json | jq '.p95_response_time')
        echo "P95 Response Time: ${P95}ms"
        
        if (( $(echo "$P95 > 500" | bc -l) )); then
            print_warning "P95 Response Time > 500ms"
        else
            print_success "Performance в норме"
        fi
    fi
}

# Основная функция
main() {
    print_header "🚀 KAMHUB - ПОЛНЫЙ НАБОР ТЕСТОВ ПЕРЕД PRODUCTION"
    
    # Парсинг аргументов
    PHASE=${1:-all}
    
    case $PHASE in
        check)
            check_dependencies
            ;;
        unit)
            check_dependencies
            run_unit_tests
            ;;
        integration)
            check_dependencies
            run_integration_tests
            ;;
        security)
            check_dependencies
            run_security_tests
            ;;
        performance)
            check_dependencies
            run_performance_tests
            ;;
        e2e)
            check_dependencies
            run_e2e_tests
            ;;
        phase1)
            check_dependencies
            run_unit_tests
            ;;
        phase2)
            check_dependencies
            run_integration_tests
            ;;
        phase3)
            check_dependencies
            run_security_tests
            ;;
        phase4)
            check_dependencies
            run_performance_tests
            ;;
        phase5)
            check_dependencies
            run_e2e_tests
            ;;
        all)
            check_dependencies
            run_unit_tests
            run_integration_tests
            run_security_tests
            run_performance_tests
            run_e2e_tests
            generate_report
            check_production_readiness
            ;;
        *)
            echo "Использование: $0 {check|unit|integration|security|performance|e2e|phase1-5|all}"
            exit 1
            ;;
    esac
    
    echo ""
    print_header "✅ ТЕСТИРОВАНИЕ ЗАВЕРШЕНО"
    echo "Результаты: test-results/"
    echo "Отчёт: test-results/report.html"
}

main "$@"
