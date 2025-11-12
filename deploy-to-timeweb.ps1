# Скрипт автоматического деплоя KamHub на Timeweb Cloud
# Использование: .\deploy-to-timeweb.ps1

param(
    [string]$ServerIP = "45.8.96.120",
    [string]$ServerUser = "root",
    [string]$ServerPath = "/var/www/kamhub",
    [string]$RepoUrl = "https://github.com/PosPk/kamhub.git",
    [string]$Domain = "kamhub.ru"
)

# Цвета для вывода
$Green = "`e[32m"
$Blue = "`e[34m"
$Red = "`e[31m"
$Yellow = "`e[33m"
$NC = "`e[0m" # No Color

Write-Host "$Blue📡 Начинаем деплой KamHub на Timeweb Cloud...$NC"

# Функция для выполнения команд на сервере
function Run-Remote {
    param([string]$Command)
    & ssh "${ServerUser}@${ServerIP}" $Command
}

# 1. Проверка подключения
Write-Host "$Blue1️⃣ Проверка SSH подключения...$NC"
try {
    $result = Run-Remote "echo 'Подключение успешно'"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "$Green✅ SSH подключение установлено$NC"
    } else {
        Write-Host "$Red❌ Ошибка SSH подключения$NC"
        exit 1
    }
} catch {
    Write-Host "$Red❌ Ошибка SSH подключения: $($_.Exception.Message)$NC"
    exit 1
}

# 2. Установка необходимых пакетов
Write-Host "$Blue2️⃣ Установка зависимостей на сервере...$NC"
Run-Remote @"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq git nginx postgresql-client curl

# Node.js 20
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

# PM2
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

echo '✅ Зависимости установлены'
"@

# 3. Клонирование/обновление репозитория
Write-Host "$Blue3️⃣ Обновление кода приложения...$NC"
Run-Remote @"
if [ -d ${ServerPath} ]; then
    echo 'Обновление существующего репозитория...'
    cd ${ServerPath}
    git fetch origin
    git reset --hard origin/main
    git clean -fd
else
    echo 'Клонирование репозитория...'
    mkdir -p ${ServerPath}
    git clone ${RepoUrl} ${ServerPath}
    cd ${ServerPath}
fi
echo '✅ Код обновлён'
"@

# 3.5. Копирование production конфигурации
Write-Host "$Blue3️⃣.5️⃣ Настройка production конфигурации...$NC"
if (Test-Path "timeweb-production.env") {
    Write-Host "$BlueКопируем конфигурацию на сервер...$NC"
    & scp "timeweb-production.env" "${ServerUser}@${ServerIP}:${ServerPath}/.env"

    Run-Remote @"
cd ${ServerPath}
echo '✅ Конфигурация скопирована'
echo '🎨 KamHub готов к работе!'
"@
} else {
    Write-Host "$Red❌ Файл timeweb-production.env не найден!$NC"
    Write-Host "$YellowСоздайте его командой: node final-deployment-test.js$NC"
    exit 1
}

# 4. Установка npm зависимостей
Write-Host "$Blue4️⃣ Установка npm пакетов...$NC"
Run-Remote @"
cd ${ServerPath}
npm ci --production=false
echo '✅ Зависимости установлены'
"@

# 5. Применение схемы БД
Write-Host "$Blue5️⃣ Применение схемы БД...$NC"
Write-Host "$Red⚠️  ВНИМАНИЕ: Убедитесь что DATABASE_URL настроен в .env$NC"
Run-Remote @"
cd ${ServerPath}
if [ -f .env ]; then
    source .env
    if [ ! -z "`$DATABASE_URL" ]; then
        echo 'Применение схемы БД...'
        bash scripts/apply-all-schemas.sh || echo 'Схемы уже применены или ошибка'
        echo '✅ БД настроена'
    else
        echo '⚠️  DATABASE_URL не найден в .env'
    fi
else
    echo '⚠️  Файл .env не найден. Создайте его из .env.local.example'
fi
"@

# 6. Сборка Next.js приложения
Write-Host "$Blue6️⃣ Сборка производственной версии...$NC"
Run-Remote @"
cd ${ServerPath}
npm run build
echo '✅ Приложение собрано'
"@

# 7. Настройка PM2
Write-Host "$Blue7️⃣ Настройка PM2...$NC"
Run-Remote @"
cd ${ServerPath}

# Создать директорию для логов
mkdir -p /var/log/pm2

# Остановить предыдущий процесс если есть
pm2 delete kamhub-production 2>/dev/null || true

# Запустить через PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup systemd -u root --hp /root

echo '✅ PM2 настроен и запущен'
"@

# 8. Настройка Nginx
Write-Host "$Blue8️⃣ Настройка Nginx...$NC"
Run-Remote @"
# Копировать конфиг
cp ${ServerPath}/nginx.conf /etc/nginx/sites-available/kamhub

# Создать симлинк если не существует
ln -sf /etc/nginx/sites-available/kamhub /etc/nginx/sites-enabled/kamhub 2>/dev/null || true

# Удалить default конфиг
rm -f /etc/nginx/sites-enabled/default

# Проверить конфигурацию
nginx -t

# Перезагрузить Nginx
systemctl reload nginx

echo '✅ Nginx настроен'
"@

# 9. Настройка SSL (Let's Encrypt)
Write-Host "$Blue9️⃣ Настройка SSL сертификата...$NC"
Write-Host "$Red⚠️  Убедитесь что домен ${Domain} указывает на ${ServerIP}$NC"
Run-Remote @"
if ! command -v certbot &> /dev/null; then
    apt-get install -y certbot python3-certbot-nginx
fi

# Получить сертификат (только если домен настроен)
# certbot --nginx -d ${Domain} -d www.${Domain} --non-interactive --agree-tos --email admin@${Domain}

echo '⚠️  Запустите certbot вручную после настройки DNS'
"@

# 10. Проверка статуса
Write-Host "$Blue🔟 Проверка статуса приложения...$NC"
Run-Remote @"
echo ''
echo '═══════════════════════════════════════'
echo '📊 Статус сервисов:'
echo '═══════════════════════════════════════'

echo ''
echo '🔹 PM2 процессы:'
pm2 list

echo ''
echo '🔹 Nginx статус:'
systemctl status nginx --no-pager | head -10

echo ''
echo '═══════════════════════════════════════'
echo '✅ Деплой завершён успешно!'
echo '═══════════════════════════════════════'
echo ''
echo '🌐 Приложение доступно по адресу:'
echo '   http://${ServerIP}:3000 (напрямую)'
echo '   http://${Domain} (через Nginx, если DNS настроен)'
echo '   https://${Domain} (SSL, если сертификат установлен)'
echo ''
echo '📋 Полезные команды:'
echo '   pm2 logs kamhub-production  - просмотр логов'
echo '   pm2 restart kamhub-production  - перезапуск'
echo '   pm2 monit  - мониторинг'
echo ''
"@

Write-Host "$Green🎉 Деплой завершён успешно!$NC"
Write-Host ""
Write-Host "🌐 KamHub доступен по адресу:"
Write-Host "   http://$ServerIP:3000 (напрямую)"
Write-Host "   http://$Domain (через Nginx)"
Write-Host ""
Write-Host "📊 Для мониторинга:"
Write-Host "   pm2 logs kamhub-production"
Write-Host "   pm2 monit"


