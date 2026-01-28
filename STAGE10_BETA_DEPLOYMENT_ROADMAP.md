# 🚀 STAGE 10: BETA DEPLOYMENT - ПОЛНЫЙ ROADMAP

## 📅 Дата начала: 28 января 2026 (после завершения Stage 9)
## ⏱️ Ожидаемая длительность: 3 недели
## 🎯 Цель: Успешное развертывание в staging + production с real users

---

## 📋 СТАРТОВЫЕ ТРЕБОВАНИЯ (Перед Stage 10)

### ✅ Stage 9 завершен:
- [x] CI/CD pipeline настроен
- [x] Integration tests готовы
- [x] API documentation полная
- [x] Security audit пройден
- [x] Load testing выполнен
- [x] Kubernetes manifests готовы

### Требуется подготовить:

#### 1. **Production Database**
```sql
-- PostgreSQL 15 production instance
-- Требуется:
-- - Backup strategy
-- - Replication setup
-- - Connection pooling (pgBouncer)
-- - Monitoring integration
-- - SSL/TLS enabled
```

#### 2. **Kubernetes Cluster**
```bash
# Production Kubernetes cluster требуется:
# - 3+ worker nodes (minimum)
# - 10+ GB total memory
# - 20+ GB disk space
# - Kubernetes 1.24+
# - Load balancer support (AWS ELB, GCP LB, etc.)
```

#### 3. **Ingress/SSL Configuration**
```yaml
# Requirements:
- SSL/TLS certificates (Let's Encrypt or commercial)
- DNS records configured
- DDoS protection (CloudFlare optional)
- WAF rules (if applicable)
```

#### 4. **Monitoring Stack**
```bash
# Before deployment:
- Prometheus retention: 30 days
- Grafana dashboards created
- AlertManager configured
- PagerDuty/Slack integration
```

---

## 🚀 PHASE 1: STAGING DEPLOYMENT (День 1-2)

### День 1: Настройка Staging окружения

#### 1. Подготовить staging Kubernetes кластер
```bash
# 1.1 Создать staging namespace
kubectl create namespace kamhub-staging

# 1.2 Обновить staging secrets
kubectl create secret generic kamhub-secrets \
  --from-literal=database-url="postgresql://staging-user:password@staging-db:5432/kamhub-staging" \
  --from-literal=redis-url="redis://staging-redis:6379" \
  --from-literal=jwt-secret="staging-jwt-secret-min-32-chars" \
  --from-literal=encryption-key="staging-encryption-key" \
  -n kamhub-staging

# 1.3 Применить staging manifests
npm run k8s:apply:staging  # или kubectl apply -k k8s/staging

# 1.4 Проверить deployment
kubectl get pods -n kamhub-staging
kubectl get svc -n kamhub-staging
```

#### 2. Database migration на staging
```bash
# 2.1 Создать staging базу
CREATE DATABASE kamhub_staging;

# 2.2 Запустить миграции
npm run db:migrate

# 2.3 Загрузить тестовые данные (опционально)
npm run db:seed:staging

# 2.4 Проверить целостность
npm run db:health-check
```

#### 3. Включить monitoring
```bash
# 3.1 Развернуть Prometheus (уже в K8s manifests)
kubectl port-forward -n kamhub-staging svc/prometheus 9090:9090

# 3.2 Развернуть Grafana
kubectl port-forward -n kamhub-staging svc/grafana 3000:3000

# 3.3 Настроить dashboards
# - API Performance
# - Database Metrics
# - Pod Resource Usage
# - Network I/O
```

### День 2: Testing на Staging

#### 1. Функциональное тестирование (4 часа)
```bash
# 1.1 Запустить full integration tests
npm run test:integration

# 1.2 Smoke tests
# - Create ticket
# - Search knowledge base
# - Add message
# - Update ticket status
# - Check SLA

# 1.3 Edge case testing
# - High volume requests
# - Concurrent operations
# - Error scenarios
# - Network failures
```

#### 2. Load testing на staging (3 часа)
```bash
# 2.1 Baseline load test
npm run test:load

# 2.2 Spike test (5x normal load)
BASE_URL=https://staging-api.kamhub.com npm run test:load

# 2.3 Soak test (24 hours)
# Запустить k6 в long-running mode

# 2.4 Результаты
# - P95 latency
# - Error rate
# - Database performance
# - Memory usage
```

#### 3. Security validation (2 часа)
```bash
# 3.1 Security audit
npm run security:audit

# 3.2 Penetration testing (опционально)
# - OWASP Top 10
# - SQL injection
# - XSS attacks
# - CSRF protection

# 3.3 SSL/TLS check
curl -I https://staging-api.kamhub.com | grep -i ssl
```

---

## 🎯 PHASE 2: USER ACCEPTANCE TESTING (День 2-3)

### День 2-3: UAT с end users

#### 1. Подготовка UAT окружения (2 часа)
```bash
# 1.1 Создать UAT базу данных
CREATE DATABASE kamhub_uat;

# 1.2 Загрузить тестовые данные
npm run db:seed:uat

# 1.3 Создать тестовые accounts
# - Admin users (5)
# - Support agents (10)
# - Regular customers (50)

# 1.4 Предоставить доступ
# - UAT URL
# - Test credentials
# - Documentation
```

#### 2. UAT процесс (8 часов)
```bash
# Требуется протестировать:

Support Pillar:
  ✓ Создание тикета
  ✓ Добавление сообщений
  ✓ Обновление статуса
  ✓ Knowledge Base поиск
  ✓ SLA notifications
  ✓ Agent assignment

Discovery Pillar:
  ✓ Browse tours
  ✓ Search functionality
  ✓ Filters и sorting
  ✓ Recommendations

Booking Pillar:
  ✓ Create booking
  ✓ Payment processing
  ✓ Confirmation email
  ✓ Booking management

User Management:
  ✓ Login/Logout
  ✓ Profile management
  ✓ Password reset
  ✓ 2FA (if enabled)
```

#### 3. Feedback collection (2 часа)
```bash
# Создать Google Form для UAT feedback:
# - Performance rating (1-5)
# - User experience (1-5)
# - Bug reports
# - Feature requests
# - Comments

# Или использовать Jira для issue tracking
```

---

## 🔄 PHASE 3: PRODUCTION PREPARATION (День 3-4)

### День 3: Final production checks

#### 1. Database final checks (2 часа)
```bash
# 1.1 Бэкап staging database
pg_dump kamhub_staging > staging_backup.sql

# 1.2 Бэкап production database schema
pg_dump -s kamhub_prod > schema_backup.sql

# 1.3 Test restoration
psql kamhub_test < staging_backup.sql

# 1.4 Health check
npm run db:health-check
```

#### 2. Infrastructure validation (2 часа)
```bash
# 2.1 Validate K8s manifests (final)
npm run k8s:validate:prod

# 2.2 Check resource limits
kubectl describe nodes

# 2.3 Verify DNS records
nslookup api.kamhub.com

# 2.4 SSL certificate check
openssl s_client -connect api.kamhub.com:443

# 2.5 Load balancer test
curl -I https://api.kamhub.com
```

#### 3. Final security scan (1 час)
```bash
# 3.1 OWASP dependency check
npm audit --audit-level=critical

# 3.2 Secret detection
npm run security:detect-secrets

# 3.3 Vulnerability scanning
npx snyk test

# 3.4 Code review (if applicable)
# Review all Stage 9 changes
```

#### 4. Team preparation (1 час)
```bash
# 4.1 Runbook review
# - Deployment steps
# - Rollback procedure
# - Emergency contacts
# - Escalation path

# 4.2 Team training
# - Kubernetes basics
# - Monitoring dashboard
# - Alert handling
# - Log analysis

# 4.3 Communication plan
# - Announcement email
# - Slack notification
# - Status page update
# - Customer support briefing
```

### День 4: Blue-Green deployment prep

#### 1. Blue environment setup
```bash
# 1.1 Create blue deployment
kubectl apply -k k8s/production --selector=app=kamhub-api-blue

# 1.2 Run health checks
kubectl get pods -l app=kamhub-api-blue

# 1.3 Run smoke tests
# Connect to blue environment
# Test all critical paths

# 1.4 Warm up
# Send synthetic traffic to warm caches
```

#### 2. Green environment readiness
```bash
# 2.1 Prepare green manifests
# kubectl apply -k k8s/production --selector=app=kamhub-api-green

# 2.2 Scale to zero (don't run yet)
kubectl scale deployment kamhub-api-green --replicas=0

# 2.3 Final checks
# Verify all dependencies
# Check database connections
# Validate SSL certificates
```

---

## 🚀 PHASE 4: PRODUCTION DEPLOYMENT (День 5)

### Blue-Green deployment strategy

```
BEFORE:
┌─────────────────────────┐
│   Ingress / LB          │
│                         │
└────────────┬────────────┘
             │
        ┌────▼─────┐
        │   BLUE   │ ← Current production
        │  (100%)  │
        └──────────┘

DURING DEPLOYMENT:
┌─────────────────────────┐
│   Ingress / LB          │
│                         │
└────────────┬────────────┘
             │
    ┌────────┴────────┐
    │                 │
┌───▼────┐        ┌──▼───┐
│  BLUE  │        │GREEN │ ← New version (warming up)
│ (90%)  │        │(10%) │
└────────┘        └──────┘

VERIFICATION:
┌─────────────────────────┐
│   Ingress / LB          │
│                         │
└────────────┬────────────┘
             │
    ┌────────┴────────┐
    │                 │
┌───▼────┐        ┌──▼───┐
│  BLUE  │        │GREEN │ ← No errors (50% traffic)
│ (50%)  │        │(50%) │
└────────┘        └──────┘

COMPLETION:
┌─────────────────────────┐
│   Ingress / LB          │
│                         │
└────────────┬────────────┘
             │
        ┌────▼─────┐
        │  GREEN   │ ← New production
        │  (100%)  │
        └──────────┘

CLEANUP:
        ┌────────┐
        │  BLUE  │ ← Keep as rollback (1 hour)
        │  (0%)  │
        └────────┘
```

### Deployment steps

#### 10:00 - Go/No-go decision
```bash
# 1. Final team meeting
# 2. Check monitoring systems
# 3. Verify backups
# 4. Get final approval

# Proceed only if ALL checks pass ✅
```

#### 10:30 - Start deployment
```bash
# 1. Announce maintenance window (if needed)
# Post to status page
# Send email notification

# 2. Start blue-green deployment
kubectl apply -k k8s/production/blue-green-strategy.yaml

# 3. Monitor deployment
kubectl rollout status deployment/kamhub-api-green -n kamhub

# 4. Run health checks on green
npm run health-check:production

# 5. Run smoke tests on green
npm run test:smoke
```

#### 11:00 - Gradual traffic shift
```bash
# Stage 1: 10% traffic
kubectl patch service kamhub-api -p '{"spec": {"selector": {"version": "green"}}}'
# Monitor for 10 minutes
# Check error rates, latency, etc.

# Stage 2: 50% traffic
# Monitor for 10 minutes

# Stage 3: 100% traffic
# Final verification
# Keep blue running for 1 hour
```

#### 12:00 - Finalize
```bash
# 1. Scale down blue (but keep running)
kubectl scale deployment kamhub-api-blue --replicas=0

# 2. Update DNS/routing
# Point all traffic to green

# 3. Archive logs
tar -czf logs-deployment-$(date +%s).tar.gz logs/

# 4. Announce completion
# Update status page
# Send confirmation email
```

---

## 🛑 ROLLBACK PROCEDURE

### If something goes wrong:

```bash
# Immediate rollback (< 5 minutes)
kubectl patch service kamhub-api -p '{"spec": {"selector": {"version": "blue"}}}'

# Or scale up blue, scale down green
kubectl scale deployment kamhub-api-blue --replicas=3
kubectl scale deployment kamhub-api-green --replicas=0

# Notify team
# Post on Slack/Email
# Create incident post-mortem

# Database rollback (if needed)
psql kamhub < database_backup_pre_deployment.sql
```

---

## 📊 MONITORING DURING DEPLOYMENT

### Key metrics to watch:

```
Real-time dashboard should show:
✓ Request rate (requests/sec)
✓ Error rate (%)
✓ P50, P95, P99 latency
✓ Pod CPU usage
✓ Pod memory usage
✓ Database connection pool
✓ Redis hit rate
✓ HTTP status codes distribution
```

### Alert thresholds:

```
🔴 CRITICAL (Immediate rollback):
  - Error rate > 5%
  - P99 latency > 2000ms
  - Pod restarts > 3 in 5 min
  - Out of memory errors
  - Database connection failures

🟠 WARNING (Investigate):
  - Error rate > 1%
  - P95 latency > 1000ms
  - CPU usage > 80%
  - Memory usage > 75%
  - Increased response times
```

---

## ✅ POST-DEPLOYMENT CHECKLIST

### Immediately after (0-30 minutes)

- [ ] Health checks passing
- [ ] Error rate < 0.5%
- [ ] Response times normal
- [ ] Database responding
- [ ] Redis cache working
- [ ] Emails being sent
- [ ] Webhooks firing
- [ ] Logs showing normal traffic

### First hour

- [ ] Monitor all metrics
- [ ] Check error logs for patterns
- [ ] Verify all integrations
- [ ] Test user workflows
- [ ] Check payment processing
- [ ] Verify email delivery
- [ ] Monitor database load

### First 24 hours

- [ ] Monitor peak traffic
- [ ] Check for memory leaks
- [ ] Verify backup processes
- [ ] Analyze application logs
- [ ] Check performance metrics
- [ ] User feedback collection
- [ ] Team debrief

### First week

- [ ] Performance analysis
- [ ] Cost analysis
- [ ] User feedback review
- [ ] Lessons learned meeting
- [ ] Documentation update
- [ ] Automation improvements

---

## 📞 DEPLOYMENT TEAM

### Roles and responsibilities:

```
Release Manager:
  - Overall coordination
  - Go/No-go decision
  - Communication
  - Issue escalation

DevOps Engineer:
  - Kubernetes operations
  - Database management
  - Infrastructure monitoring
  - Rollback if needed

Support Lead:
  - Customer monitoring
  - Issue tracking
  - Team communication
  - Incident response

Application Developer:
  - Code validation
  - Health checks
  - Smoke testing
  - Performance monitoring

QA Engineer:
  - Test execution
  - Verification
  - UAT oversight
  - Report generation
```

---

## 🎯 SUCCESS CRITERIA

### Deployment is successful when:

```
✅ All pods running and healthy
✅ 0 errors in first 5 minutes
✅ Error rate stays < 0.5% for 1 hour
✅ Response times < 500ms P95
✅ No database connection issues
✅ All integrations working
✅ Monitoring showing normal patterns
✅ Users reporting no issues
✅ Team feedback positive
```

---

## 📞 CONTACTS & ESCALATION

### Escalation path:

```
Level 1: DevOps Engineer
  - Monitor metrics
  - Respond to alerts
  - Basic troubleshooting

Level 2: Team Lead
  - Investigation
  - Decision making
  - Resource allocation

Level 3: CTO/Director
  - Rollback decision
  - Major incident response
  - Executive communication
```

### Communication channels:

```
Primary: Slack #deployment-team
Secondary: Email team
Tertiary: Phone (emergency only)
Status: https://status.kamhub.com
```

---

## 📖 ADDITIONAL RESOURCES

### Documentation to prepare:

```
✓ Deployment runbook
✓ Troubleshooting guide
✓ Rollback procedure
✓ Monitoring dashboard guide
✓ Log analysis guide
✓ SLA compliance report
✓ Architecture diagram
✓ API documentation
```

### Tools needed:

```
✓ kubectl (Kubernetes management)
✓ helm (Package management - optional)
✓ kubectx (Context switching)
✓ kail (Log aggregation)
✓ watch (Metric monitoring)
✓ curl (API testing)
✓ psql (Database management)
```

---

## 🎉 NEXT STEPS AFTER PRODUCTION

### Week 1:
- Stabilization and monitoring
- User feedback collection
- Performance optimization
- Issue resolution

### Week 2-4:
- Advanced features rollout
- Performance tuning
- Cost optimization
- Multi-region expansion

### Month 2+:
- Advanced monitoring (APM)
- Automated scaling policies
- Disaster recovery drills
- Strategic improvements

---

**Document Version:** 1.0  
**Created:** 28 January 2025  
**Status:** Ready for Stage 10 initiation  
**Approval:** Required before proceeding
