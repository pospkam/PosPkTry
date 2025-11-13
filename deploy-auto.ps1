# PowerShell скрипт для автоматического деплоя

$server = "5.129.248.224"
$user = "root"
$password = "xQvB1pv?yZTjaR"

# Команды для выполнения на сервере
$commands = @"
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get upgrade -y
apt-get install -y curl wget git build-essential nginx postgresql-client
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install -g pm2
systemctl enable nginx && systemctl start nginx
ufw --force enable && ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp
mkdir -p /var/www/kamhub
cd /var/www/kamhub
cat > .env << 'ENVEOF'
DATABASE_URL=postgresql://gen_user:q%3B3U%2BPY7XCz%40Br@51e6e5ca5d967b8e81fc9b75.twc1.net:5432/default_db?sslmode=verify-full
S3_ENDPOINT=https://s3.twcstorage.ru
S3_BUCKET_ID=d9542536-676ee691-7f59-46bb-bf0e-ab64230eec50
S3_ACCESS_KEY_ID=F2CP4X3X17GVQ1YH5I5D
S3_SECRET_ACCESS_KEY=72iAsYR4QQCIdaDI9e9AzXnzVvvP8bvPELmrBVzX
S3_REGION=ru-1
NEXT_PUBLIC_STORAGE_URL=https://s3.twcstorage.ru/d9542536-676ee691-7f59-46bb-bf0e-ab64230eec50
GROQ_API_KEY=
DEEPSEEK_API_KEY=
OPENROUTER_API_KEY=
YANDEX_MAPS_API_KEY=
CLOUDPAYMENTS_PUBLIC_ID=
CLOUDPAYMENTS_API_SECRET=
JWT_SECRET=kH8mP2nQ5rT7wX9zA3bE6fJ1gK4lN8oS
CSRF_SECRET=vY2wZ5xC8aD1eF4gH7jK0lM3nP6qR9tU
NODE_ENV=production
PORT=8080
NEXT_PUBLIC_APP_URL=http://5.129.248.224
ENVEOF
cat > /etc/nginx/sites-available/kamhub << 'NGINXEOF'
server {
    listen 80;
    server_name 5.129.248.224;
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \`$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \`$host;
        proxy_cache_bypass \`$http_upgrade;
        proxy_set_header X-Real-IP \`$remote_addr;
        proxy_set_header X-Forwarded-For \`$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \`$scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
NGINXEOF
ln -sf /etc/nginx/sites-available/kamhub /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
echo "БАЗОВАЯ УСТАНОВКА ЗАВЕРШЕНА"
"@

Write-Host "🚀 Попытка автоматического деплоя..." -ForegroundColor Green
Write-Host ""

# Попытка 1: использовать plink (если установлен PuTTY)
if (Get-Command plink -ErrorAction SilentlyContinue) {
    Write-Host "Найден plink, пробую..." -ForegroundColor Yellow
    echo y | plink -pw $password $user@$server $commands
    exit 0
}

# Попытка 2: SSH с автоматическим вводом пароля через stdin
Write-Host "Пробую SSH с автовводом пароля..." -ForegroundColor Yellow

# Сохраняем команды во временный файл
$tempScript = "$env:TEMP\kamhub_deploy.sh"
$commands | Out-File -FilePath $tempScript -Encoding ASCII

# Создаем expect-подобный скрипт
$expectScript = @"
spawn ssh $user@$server "bash -s" < $tempScript
expect "password:"
send "$password\r"
expect eof
"@

$expectScript | Out-File -FilePath "$env:TEMP\ssh_expect.exp" -Encoding ASCII

Write-Host ""
Write-Host "Подготовлено. Запускаю..." -ForegroundColor Green



