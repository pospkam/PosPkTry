# Настройка GitHub Secrets для автоматического деплоя

## Шаг 1: Откройте настройки репозитория

1. Перейдите на https://github.com/PosPk/kamhub
2. Settings → Secrets and variables → Actions
3. Нажмите "New repository secret"

## Шаг 2: Добавьте секреты

### TIMEWEB_HOST
- Name: `TIMEWEB_HOST`
- Value: `5.129.248.224`

### TIMEWEB_USER
- Name: `TIMEWEB_USER`
- Value: `root`

### TIMEWEB_PASSWORD
- Name: `TIMEWEB_PASSWORD`
- Value: `ваш пароль от сервера`

## Шаг 3: Запустите первоначальный деплой

1. Перейдите на вкладку **Actions**
2. Выберите workflow **"Initial Deploy to Timeweb (Full Setup)"**
3. Нажмите **"Run workflow"**
4. Выберите ветку **main**
5. Нажмите **"Run workflow"**

Процесс займет 5-10 минут. GitHub Actions подключится к серверу и выполнит полную установку:
- Node.js, PostgreSQL, Nginx, PM2
- Применит все миграции
- Соберет и запустит приложение
- Настроит автозапуск

## Шаг 4: После успешного деплоя

### Автоматические обновления

Теперь при каждом push в ветку `main` приложение будет автоматически обновляться на сервере!

### Ручное обновление

1. Actions → "Deploy to Timeweb Cloud"
2. Run workflow → main → Run workflow

### Проверка работы

Откройте http://5.129.248.224 в браузере

## Альтернатива: Использование SSH ключа (более безопасно)

### Генерация SSH ключа

На вашем компьютере:

```bash
ssh-keygen -t ed25519 -C "github-actions@kamhub" -f kamhub_deploy_key
```

### Добавление ключа на сервер

```bash
ssh-copy-id -i kamhub_deploy_key.pub root@5.129.248.224
```

### Добавление приватного ключа в GitHub Secrets

1. Скопируйте содержимое `kamhub_deploy_key` (приватный ключ)
2. GitHub → Settings → Secrets → New secret
3. Name: `TIMEWEB_SSH_KEY`
4. Value: (вставьте содержимое приватного ключа)

### Обновите workflow

В `.github/workflows/*.yml` замените:

```yaml
password: ${{ secrets.TIMEWEB_PASSWORD }}
```

на:

```yaml
key: ${{ secrets.TIMEWEB_SSH_KEY }}
```

## Мониторинг деплоя

Все логи деплоя доступны на вкладке **Actions** в репозитории GitHub.

## Решение проблем

### "Permission denied"

Проверьте, что пароль/ключ добавлен правильно в Secrets.

### "Connection timeout"

Проверьте:
1. Сервер доступен: `ping 5.129.248.224`
2. SSH порт открыт: `telnet 5.129.248.224 22`
3. Firewall настроен правильно

### Полезные ссылки

- Логи деплоя: https://github.com/PosPk/kamhub/actions
- Панель Timeweb: https://timeweb.cloud/my/servers/5898003
- Документация GitHub Actions: https://docs.github.com/en/actions
