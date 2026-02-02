# 🚀 Stage 9 Quick Start Guide

## 1️⃣ Быстрая проверка локально (5 минут)

```bash
# Перейти в проект
cd /workspaces/kamhub

# Запустить тесты
npm run test

# Запустить интеграционные тесты
npm run test:integration

# Проверить типы
npm run type-check

# Запустить security audit
npm run security:audit
```

## 2️⃣ Проверить Kubernetes manifests (2 минуты)

```bash
# Установить kubectl и kustomize (если не установлены)
# Linux: sudo apt-get install kubectl
# macOS: brew install kubectl

# Валидировать base manifests
npm run k8s:validate

# Валидировать production manifests
npm run k8s:validate:prod
```

## 3️⃣ Применить в Kubernetes кластер (опционально)

```bash
# Если у вас есть локальный minikube или другой кластер:

# 1. Сначала обновите secrets
vi k8s/base/secrets.yaml  # Замените все "CHANGE_ME_*"

# 2. Примените базовые ресурсы
npm run k8s:apply

# 3. Проверьте статус
kubectl get pods -n kamhub
kubectl get services -n kamhub

# 4. Для production (если готовы)
npm run k8s:apply:prod
```

## 4️⃣ GitHub Actions CI/CD (автоматический)

```bash
# Просто сделайте push в main или develop
git add .
git commit -m "Deploy Stage 9: Production Readiness"
git push origin main

# Проверьте результаты в GitHub Actions:
# https://github.com/PosPk/kamhub/actions
```

## 5️⃣ Load Testing (опционально)

```bash
# Запустить k6 load test
npm run test:load

# Или с кастомными параметрами:
BASE_URL=http://localhost:3000 npm run test:load
```

## 📊 Что было реализовано

| Компонент | Статус | Файлы |
|-----------|--------|-------|
| **CI/CD Pipeline** | ✅ Ready | `.github/workflows/ci.yml` |
| **Integration Tests** | ✅ Ready | `tests/integration/` |
| **API Documentation** | ✅ Ready | `lib/swagger/` |
| **Security Audit** | ✅ Ready | `scripts/security/` |
| **Load Testing** | ✅ Ready | `load-tests/k6/` |
| **Kubernetes** | ✅ Ready | `k8s/base/` & `k8s/production/` |
| **npm Scripts** | ✅ Updated | `package.json` |

## 🎯 Следующие шаги

1. ✅ **Staging Deployment**
   ```bash
   # После успешного прохождения всех тестов
   npm run k8s:apply
   ```

2. ✅ **Production Deployment**
   ```bash
   # После UAT в staging
   npm run k8s:apply:prod
   ```

3. ✅ **Monitoring Setup**
   - Prometheus доступен на `:9090` в K8s
   - Grafana доступна на `:3000` в K8s

## 🔑 Ключевые команды

```bash
# Тестирование
npm run test              # Unit tests
npm run test:integration # Integration tests
npm run test:load        # Load testing

# Security
npm run security:audit         # Security audit
npm run security:detect-secrets # Detect secrets

# Kubernetes
npm run k8s:validate      # Validate manifests
npm run k8s:apply         # Apply to cluster
npm run k8s:delete        # Delete from cluster

# Docker
npm run docker:build      # Build image
npm run docker:run        # Run container

# Checking
npm run type-check        # TypeScript check
npm run lint              # ESLint check
```

## ✅ Checklist готовности к Beta

- [ ] Все тесты проходят: `npm run test`
- [ ] Интеграционные тесты работают: `npm run test:integration`
- [ ] Security audit пройден: `npm run security:audit`
- [ ] K8s manifests валидны: `npm run k8s:validate`
- [ ] Документация доступна в `lib/swagger/`
- [ ] Load tests готовы: `npm run test:load`

## ⚠️ Важные замечания

### Security Secrets
Перед deployment **обязательно** обновите:
```yaml
# k8s/base/secrets.yaml
database-url: "postgresql://kamhub_user:PASSWORD@..."
jwt-secret: "STRONG_SECRET_KEY"
encryption-key: "ENCRYPTION_KEY"
```

### Database Migration
Убедитесь, что база данных существует:
```bash
npm run db:migrate
```

### Docker Registry
Для push в registry, обновите в GitHub:
```
Settings → Secrets and variables → DOCKER_USERNAME
Settings → Secrets and variables → DOCKER_PASSWORD
```

## 📖 Полная документация

Смотрите полное руководство в [STAGE9_PRODUCTION_READINESS_COMPLETE.md](./STAGE9_PRODUCTION_READINESS_COMPLETE.md)

---

**Status**: ✅ **PRODUCTION READY**  
**Last Updated**: 2025-01-28
