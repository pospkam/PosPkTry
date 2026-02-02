#!/usr/bin/env node

/**
 * Автоматический деплой KamHub через Timeweb Cloud API
 * Попытка выполнить деплой без SSH
 */

const https = require('https');
const fs = require('fs');

// Конфигурация
const config = {
  timeweb: {
    token: 'eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCIsImtpZCI6IjFrYnhacFJNQGJSI0tSbE1xS1lqIn0.eyJ1c2VyIjoicGE0MjIxMDgiLCJ0eXBlIjoiYXBpX2tleSIsImFwaV9rZXlfaWQiOiI0MmZmZTY1MC02OWI4LTRmZmQtYTFkOC02OWRkMjMwM2QyY2MiLCJpYXQiOjE3NjE3ODUzNDl9.SFHpwgy9kr-EH2CwN6K1REkOl7KCpiUnMk5ivTRljEaWl8iE-B-BMjaJxaFhpdB2dqcb33ky2oyfwxkU1Sszrbo-8UINnFO5SothY4P6WC8kSSHxFlLI2i0xGCa3YzgyYZ1Wgn2a0jf__ZcyZi7ZsaJkuold9NAeeGCCrAUbdVsr39-fLDL_EKh0iekq_tuO59f_BCmg7Poe7xKlmNYzu2hy3GnfNp3ueKW52H6kFkGwibixS3tWKCHkPpyTAjRztWKCnDZOOG6xDk4sSiPPMlZOEfFzzkpKkizQ9CykBC06SXwmT2uPRR2NyZJIY-PZd4AVZ34H1jXQ-NGquRPi_aYiywt3LtOVDRarpVErBdk6I0qO0Yf33zICvMN-yFpXuY_oSlE8v3C-02XHnYLsMXcHTsUB4ISkJrhglBkv-hTzuiQxwAEZp0eHOEq8YNz6qOLU3RcaNgg0DWGXMDrMzObYx2NknrZUCMbRFftIU-C1Ilo8Ayy98MwI3J77X62p',
    apiUrl: 'https://api.timeweb.cloud/api/v1',
    serverId: '5898003'
  },
  server: {
    ip: '5.129.248.224',
    user: 'root',
    password: 'xQvB1pv?yZTjaR'
  },
  database: {
    url: 'postgresql://gen_user:q%3B3U%2BPY7XCz%40Br@51e6e5ca5d967b8e81fc9b75.twc1.net:5432/default_db?sslmode=verify-full'
  }
};

// Утилита для API запросов
function apiRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.timeweb.cloud',
      path: `/api/v1${path}`,
      method: method,
      headers: {
        'Authorization': `Bearer ${config.timeweb.token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Главная функция
async function main() {
  console.log('  Попытка автоматического деплоя через Timeweb API...\n');

  try {
    // 1. Получить информацию о сервере
    console.log('  Получение информации о сервере...');
    const serverInfo = await apiRequest('GET', `/servers/${config.timeweb.serverId}`);
    console.log('[] Сервер найден:', serverInfo.server?.name || 'Unknown');
    console.log('   IP:', serverInfo.server?.ip || config.server.ip);
    console.log('   Status:', serverInfo.server?.status || 'Unknown');
    console.log('');

    // 2. Проверить доступные методы управления
    console.log(' Проверка доступных методов управления...');
    
    // Попробуем найти endpoints для выполнения команд
    const endpoints = [
      '/servers/' + config.timeweb.serverId + '/actions',
      '/servers/' + config.timeweb.serverId + '/console',
      '/servers/' + config.timeweb.serverId + '/command'
    ];

    for (const endpoint of endpoints) {
      try {
        const result = await apiRequest('GET', endpoint);
        console.log(`   ${endpoint}:`, result ? '[] Доступен' : '[] Недоступен');
      } catch (e) {
        console.log(`   ${endpoint}: [] Недоступен`);
      }
    }
    console.log('');

    // 3. Создать скрипт установки
    console.log('  Создание скрипта установки...');
    
    const installScript = `#!/bin/bash
set -e

echo "  KamHub Auto Deploy Starting..."

# Update system
export DEBIAN_FRONTEND=noninteractive
apt-get update > /dev/null 2>&1
apt-get upgrade -y > /dev/null 2>&1

# Install base packages
apt-get install -y curl wget git build-essential nginx postgresql-client > /dev/null 2>&1

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
apt-get install -y nodejs > /dev/null 2>&1

# Install PM2
npm install -g pm2 > /dev/null 2>&1

# Setup directories
mkdir -p /var/www/kamhub
cd /var/www/kamhub

# Create .env file
cat > .env << 'ENVEOF'
DATABASE_URL=${config.database.url}
NODE_ENV=production
PORT=8080
NEXT_PUBLIC_APP_URL=http://${config.server.ip}
ENVEOF

echo "[] Base installation completed!"
echo "Next steps:"
echo "1. Upload project files to /var/www/kamhub"
echo "2. Run: npm install && npm run build"
echo "3. Run: pm2 start ecosystem.config.js"
`;

    fs.writeFileSync('/tmp/kamhub-auto-install.sh', installScript);
    console.log('[] Скрипт создан: /tmp/kamhub-auto-install.sh\n');

    // 4. Вывести инструкции
    console.log('═══════════════════════════════════════════════════════');
    console.log('  i  АВТОМАТИЧЕСКИЙ ДЕПЛОЙ ЧЕРЕЗ API НЕДОСТУПЕН');
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log('Timeweb Cloud API не предоставляет прямой доступ к консоли VDS.');
    console.log('Необходим SSH доступ для выполнения команд на сервере.\n');

    console.log(' АЛЬТЕРНАТИВНЫЕ МЕТОДЫ:\n');

    console.log('1⃣  ЧЕРЕЗ ВЕБЛАЙН КОНСОЛЬ (Самый простой):');
    console.log('   • Откройте: https://timeweb.cloud/my/servers/5898003');
    console.log('   • Нажмите кнопку "Консоль"');
    console.log('   • Скопируйте команды из INSTANT_DEPLOY.md\n');

    console.log('2⃣  ЧЕРЕЗ SSH С АВТОМАТИЧЕСКИМ ВВОДОМ ПАРОЛЯ:');
    console.log('   • Установите sshpass на локальной машине');
    console.log('   • Запустите: bash scripts/deploy-with-sshpass.sh\n');

    console.log('3⃣  ЧЕРЕЗ ЗАГРУЗКУ ГОТОВОГО ОБРАЗА:');
    console.log('   • Создать Docker образ с проектом');
    console.log('   • Загрузить на сервер');
    console.log('   • Запустить контейнер\n');

    console.log('═══════════════════════════════════════════════════════\n');

    console.log('  СОЗДАЮ ДОПОЛНИТЕЛЬНЫЕ ИНСТРУМЕНТЫ...\n');

  } catch (error) {
    console.error('[] Ошибка:', error.message);
    console.error('\nСоздаю альтернативные решения...\n');
  }

  // Создать альтернативные скрипты
  createAlternativeScripts();
}

function createAlternativeScripts() {
  console.log('  Создание альтернативных инструментов деплоя...\n');

  // 1. Скрипт с sshpass
  const sshpassScript = `#!/bin/bash
# Требует установки sshpass: apt-get install sshpass (Linux) или brew install hudochenkov/sshpass/sshpass (Mac)

SERVER="${config.server.ip}"
USER="${config.server.user}"
PASSWORD="${config.server.password}"

echo "  Деплой через sshpass..."

# Копирование скрипта
sshpass -p "$PASSWORD" scp /tmp/kamhub-auto-install.sh $USER@$SERVER:/root/

# Выполнение на сервере
sshpass -p "$PASSWORD" ssh $USER@$SERVER 'bash /root/kamhub-auto-install.sh'

echo "[] Установка завершена!"
`;

  fs.writeFileSync('scripts/deploy-with-sshpass.sh', sshpassScript);
  fs.chmodSync('scripts/deploy-with-sshpass.sh', '755');
  console.log('[] Создан: scripts/deploy-with-sshpass.sh');

  // 2. PowerShell скрипт для Windows
  const powershellScript = `# PowerShell скрипт для автоматического деплоя

$server = "${config.server.ip}"
$user = "${config.server.user}"
$password = "${config.server.password}"

Write-Host "  KamHub Deploy для Windows" -ForegroundColor Green
Write-Host ""

# Создание secure string для пароля
$securePassword = ConvertTo-SecureString $password -AsPlainText -Force
$credential = New-Object System.Management.Automation.PSCredential ($user, $securePassword)

Write-Host "Подключение к серверу $server..." -ForegroundColor Yellow

# Команды для выполнения
$commands = @"
apt-get update && apt-get upgrade -y
apt-get install -y curl wget git nodejs npm nginx
npm install -g pm2
mkdir -p /var/www/kamhub
echo "[] Установка завершена!"
"@

# Попытка выполнить через SSH
try {
    ssh $user@$server
} catch {
    Write-Host "[] Не удалось подключиться автоматически" -ForegroundColor Red
    Write-Host ""
    Write-Host "Откройте SSH вручную:" -ForegroundColor Yellow
    Write-Host "  ssh $user@$server" -ForegroundColor Cyan
    Write-Host "  Пароль: $password" -ForegroundColor Cyan
}
`;

  fs.writeFileSync('scripts/deploy-windows.ps1', powershellScript);
  console.log('[] Создан: scripts/deploy-windows.ps1');

  // 3. Простой bash launcher
  const launcherScript = `#!/bin/bash

echo "═══════════════════════════════════════════════════════"
echo "    KamHub Deploy Launcher"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Выберите метод деплоя:"
echo ""
echo "1) Веб-консоль Timeweb (рекомендуется)"
echo "2) SSH с ручным вводом пароля"
echo "3) Показать все инструкции"
echo "4) Выход"
echo ""
read -p "Ваш выбор [1-4]: " choice

case $choice in
  1)
    echo ""
    echo " Откройте в браузере:"
    echo "   https://timeweb.cloud/my/servers/5898003"
    echo ""
    echo "Нажмите кнопку 'Консоль' и скопируйте команды из:"
    echo "   INSTANT_DEPLOY.md (Шаг 2)"
    ;;
  2)
    echo ""
    echo "Подключаюсь к серверу..."
    ssh root@${config.server.ip}
    ;;
  3)
    echo ""
    cat START_HERE.md
    ;;
  4)
    echo "Выход..."
    exit 0
    ;;
  *)
    echo "Неверный выбор"
    ;;
esac
`;

  fs.writeFileSync('scripts/deploy-launcher.sh', launcherScript);
  fs.chmodSync('scripts/deploy-launcher.sh', '755');
  console.log('[] Создан: scripts/deploy-launcher.sh');

  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  [] ИНСТРУМЕНТЫ СОЗДАНЫ');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('Доступные инструменты:');
  console.log('  • scripts/deploy-launcher.sh - Интерактивное меню');
  console.log('  • scripts/deploy-with-sshpass.sh - Автоматический (нужен sshpass)');
  console.log('  • scripts/deploy-windows.ps1 - Для Windows PowerShell\n');

  console.log('РЕКОМЕНДУЮ:');
  console.log('  bash scripts/deploy-launcher.sh\n');
}

// Запуск
main().catch(console.error);



