# Инструкция по развертыванию KamHub на Timeweb Cloud

## Быстрый старт (5 минут)

### 1. Подключение к серверу

```bash
ssh root@5.129.248.224
```

### 2. Загрузка проекта на сервер

```bash
# Вариант A: Если у вас есть файлы локально
scp -r /path/to/kamhub root@5.129.248.224:/root/

# Вариант B: Клонирование из GitHub
git clone https://github.com/PosPk/kamhub.git /root/kamhub
```

### 3. Запуск автоматического деплоя

```bash
cd /root/kamhub
chmod +x deploy-timeweb-full.sh
sudo bash deploy-timeweb-full.sh
```

Скрипт автоматически:
- Установит Node.js 20, PostgreSQL 14, Nginx, PM2
- Настроит базу данных с PostGIS
- Применит ВСЕ миграции (001-015)
- Соберет Next.js приложение
- Запустит через PM2
- Настроит Nginx как reverse proxy
- Настроит firewall
- Создаст скрипты backup и update

### 4. Настройка DNS

В панели Timeweb Cloud:
1. Перейдите в "Домены"
2. Добавьте A-запись: `tourhab.ru` → `5.129.248.224`
3. Добавьте A-запись: `www.tourhab.ru` → `5.129.248.224`

### 5. Установка SSL

```bash
certbot --nginx -d tourhab.ru -d www.tourhab.ru --non-interactive --agree-tos -m admin@tourhab.ru
```

### 6. Добавление API ключей

```bash
vi /var/www/kamhub/.env
```

Добавьте ваши ключи:
```env
DEEPSEEK_API_KEY=your_key_here
DEEPSEEK_API_KEY=your_key_here
YANDEX_MAPS_API_KEY=your_key_here
YANDEX_WEATHER_API_KEY=your_key_here
```

Перезапуск:
```bash
pm2 restart kamhub
```

## Проверка развертывания

```bash
# Статус приложения
pm2 status

# Логи
pm2 logs kamhub --lines 50

# Статус Nginx
systemctl status nginx

# Проверка API
curl http://localhost:3000/api/health

# Проверка внешнего доступа
curl -I https://tourhab.ru
```

## Автоматические обновления через GitHub Webhook

### 1. Создание webhook endpoint

```bash
nano /var/www/kamhub/webhook.js
```

```javascript
const express = require('express');
const crypto = require('crypto');
const { exec } = require('child_process');

const app = express();
app.use(express.json());

const SECRET = process.env.WEBHOOK_SECRET || 'your-secret-here';

app.post('/webhook', (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  const payload = JSON.stringify(req.body);
  const expectedSignature = 'sha256=' + crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  
  if (signature !== expectedSignature) {
    return res.status(401).send('Invalid signature');
  }
  
  if (req.body.ref === 'refs/heads/main') {
    exec('/usr/local/bin/kamhub-update', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error}`);
        return res.status(500).send('Deployment failed');
      }
      console.log(stdout);
      res.send('Deployment successful');
    });
  } else {
    res.send('Not main branch');
  }
});

app.listen(3001, () => console.log('Webhook server on port 3001'));
```

### 2. Запуск webhook сервера

```bash
pm2 start webhook.js --name kamhub-webhook
pm2 save
```

### 3. Настройка в GitHub

1. Перейдите: Settings → Webhooks → Add webhook
2. Payload URL: `https://tourhab.ru/webhook`
3. Content type: `application/json`
4. Secret: ваш секретный ключ
5. Events: Push events
6. Active: ✓

### 4. Добавление Nginx rule для webhook

```bash
nano /etc/nginx/sites-available/kamhub
```

Добавьте перед `location /`:
```nginx
location /webhook {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
}
```

Перезагрузите Nginx:
```bash
nginx -t && systemctl reload nginx
```

## Управление приложением

### PM2 команды

```bash
pm2 start kamhub           # Запуск
pm2 stop kamhub            # Остановка
pm2 restart kamhub         # Перезапуск
pm2 reload kamhub          # Graceful reload
pm2 delete kamhub          # Удаление
pm2 logs kamhub            # Логи
pm2 monit                  # Мониторинг
pm2 save                   # Сохранить конфигурацию
```

### Обновление приложения

```bash
# Автоматически (через скрипт)
kamhub-update

# Вручную
cd /var/www/kamhub
git pull origin main
npm ci --production=false
npm run build
pm2 restart kamhub
```

### Резервное копирование

```bash
# Вручную
kamhub-backup

# Автоматически: настроено в cron (ежедневно 3:00)
# Backup хранятся в /var/backups/kamhub/
```

### Восстановление из backup

```bash
# База данных
cd /var/backups/kamhub
gunzip -c db_20240101_030000.sql.gz | psql -U kamhub_user kamhub

# Код
cd /var/www
rm -rf kamhub
tar -xzf /var/backups/kamhub/code_20240101_030000.tar.gz
cd kamhub
npm ci
npm run build
pm2 restart kamhub
```

## Мониторинг

### Логи

```bash
# PM2 логи
pm2 logs kamhub

# Nginx логи
tail -f /var/log/nginx/kamhub_access.log
tail -f /var/log/nginx/kamhub_error.log

# Системные логи
journalctl -u pm2-root -f
```

### Производительность

```bash
# Использование ресурсов
pm2 monit

# Статистика Nginx
tail -n 1000 /var/log/nginx/kamhub_access.log | awk '{print $9}' | sort | uniq -c | sort -rn

# Загрузка сервера
htop
```

### Проверка здоровья

```bash
# Health check endpoint
curl http://localhost:3000/api/health

# Database connection
psql -U kamhub_user -d kamhub -c "SELECT COUNT(*) FROM users;"

# PM2 status
pm2 jlist
```

## Решение проблем

### Приложение не запускается

```bash
# Проверка логов
pm2 logs kamhub --err

# Проверка порта
netstat -tulpn | grep 3000

# Проверка .env
cat /var/www/kamhub/.env | grep -v "SECRET\|PASSWORD"

# Пересборка
cd /var/www/kamhub
rm -rf .next node_modules
npm install
npm run build
pm2 restart kamhub
```

### Nginx ошибки

```bash
# Тест конфигурации
nginx -t

# Проверка портов
ss -tulpn | grep -E ':80|:443'

# Логи ошибок
tail -n 100 /var/log/nginx/error.log
```

### База данных

```bash
# Проверка подключения
psql -U kamhub_user -d kamhub -c "SELECT version();"

# Список таблиц
psql -U kamhub_user -d kamhub -c "\dt"

# Проверка миграций
psql -U kamhub_user -d kamhub -c "SELECT COUNT(*) FROM tourist_profiles;"
```

### Недостаточно памяти

```bash
# Увеличить лимит памяти Node.js
vi /var/www/kamhub/.env

# Добавить
NODE_OPTIONS=--max-old-space-size=4096

pm2 restart kamhub
```

## Оптимизация производительности

### 1. Включение HTTP/2 в Nginx

```nginx
listen 443 ssl http2;
listen [::]:443 ssl http2;
```

### 2. Кэширование статики

Уже настроено в конфигурации Nginx

### 3. PM2 Cluster Mode

Уже используется: `instances: 'max'`

### 4. PostgreSQL tuning

```bash
sudo nano /etc/postgresql/14/main/postgresql.conf
```

```conf
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
work_mem = 4MB
```

Перезапуск:
```bash
systemctl restart postgresql
```

## Безопасность

### 1. Firewall

```bash
ufw status
```

### 2. Автообновления безопасности

```bash
apt-get install unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades
```

### 3. Fail2ban

```bash
apt-get install fail2ban
systemctl enable fail2ban
```

### 4. SSH ключи (вместо пароля)

```bash
ssh-keygen -t ed25519 -C "kamhub@tourhab.ru"
cat ~/.ssh/id_ed25519.pub  # Добавьте в ~/.ssh/authorized_keys на сервере
```

## Масштабирование

### Горизонтальное (несколько серверов)

1. Вынесите PostgreSQL на отдельный сервер
2. Используйте Load Balancer (Nginx/HAProxy)
3. Настройте Redis для сессий
4. Вынесите статику на CDN

### Вертикальное (увеличение ресурсов)

В панели Timeweb Cloud: "Изменить тариф"

## Контакты поддержки

- **Timeweb Cloud:** https://timeweb.cloud/my/tickets
- **Документация:** https://timeweb.cloud/help
- **Мониторинг сервера:** https://timeweb.cloud/my/servers/5898003

---

**Версия документа:** 1.0  
**Дата:** 2025-11-10  
**Автор:** KamHub Development Team
