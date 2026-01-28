// Add these scripts to your package.json

{
  "scripts": {
    // ====== STAGE 9: Production Ready ======
    "build": "next build",
    "start": "next start",
    "dev": "next dev",
    "test": "vitest",
    "test:integration": "vitest run --include='**/*.integration.test.ts'",
    "test:smoke:production": "vitest run tests/smoke/production.test.ts",
    
    // CI/CD
    "ci:build": "docker build -t registry.kamhub.com/kamhub:$(git rev-parse --short HEAD) .",
    "ci:push": "docker push registry.kamhub.com/kamhub:$(git rev-parse --short HEAD)",
    "ci:test": "npm run test && npm run test:integration",
    
    // Database
    "db:migrate": "npm run db:migrate:production",
    "db:migrate:staging": "NODE_ENV=staging npx prisma migrate deploy",
    "db:migrate:production": "NODE_ENV=production npx prisma migrate deploy",
    "db:rollback:staging": "NODE_ENV=staging npm run db:rollback",
    "db:seed:staging": "ts-node scripts/staging/seed-staging-data.ts",
    
    // ====== STAGE 10: Beta Deployment ======
    
    // Staging Commands
    "staging:seed": "ts-node scripts/staging/seed-staging-data.ts",
    "staging:deploy": "kubectl apply -k k8s/staging/",
    "staging:health-check": "kubectl get all -n kamhub-staging && kubectl logs -n kamhub-staging -l app=kamhub-api --tail=50",
    "staging:status": "kubectl get pods,svc,ingress -n kamhub-staging",
    
    // UAT
    "test:uat": "vitest run tests/uat/",
    "uat:status": "npm run staging:status",
    "uat:report": "npm run test:integration -- --reporter=html",
    
    // Load Testing
    "load-test:staging": "k6 run load-tests/k6/load-test.js --env URL=https://staging.kamhub.com",
    "load-test:report": "node scripts/generate-load-report.js",
    "load-test:analyze": "node scripts/analyze-load-results.js",
    "load-test:compare": "node scripts/compare-load-baselines.js",
    
    // Security
    "security:audit": "npm audit && npm run security:audit:full",
    "security:audit:full": "bash scripts/security/audit.sh",
    "security:pentest": "bash scripts/security/penetration-test.sh",
    "security:scan-images": "trivy image registry.kamhub.com/kamhub:latest",
    "security:detect-secrets": "bash scripts/security/detect-secrets.sh",
    "security:owasp-check": "bash scripts/security/owasp-check.sh",
    
    // Production Deployment
    "production:validate": "bash scripts/validation/production-readiness-check.sh",
    "production:readiness-check": "bash scripts/validation/production-readiness-check.sh",
    "production:readiness-report": "npm run production:readiness-check > readiness-report.txt",
    "production:deploy": "bash scripts/deployment/blue-green-switch.sh deploy",
    "production:switch:blue": "bash scripts/deployment/blue-green-switch.sh blue",
    "production:switch:green": "bash scripts/deployment/blue-green-switch.sh green",
    "production:status": "bash scripts/deployment/blue-green-switch.sh status",
    "production:rollback": "bash scripts/deployment/blue-green-switch.sh rollback",
    
    // Monitoring
    "monitor:staging": "kubectl port-forward -n kamhub-staging svc/prometheus 9090:9090",
    "monitor:production": "kubectl port-forward -n kamhub-production svc/prometheus 9090:9090",
    "logs:staging": "kubectl logs -f -n kamhub-staging -l app=kamhub-api --all-containers=true",
    "logs:production": "kubectl logs -f -n kamhub-production -l app=kamhub-api --all-containers=true",
    
    // Kubernetes
    "k8s:staging": "kubectl apply -k k8s/staging/ && kubectl rollout status deployment/kamhub-api -n kamhub-staging",
    "k8s:production": "kubectl apply -k k8s/production/ && kubectl rollout status deployment/kamhub-api -n kamhub-production",
    "k8s:delete:staging": "kubectl delete namespace kamhub-staging",
    "k8s:delete:production": "kubectl delete namespace kamhub-production",
    
    // Quick starts
    "start:staging": "npm run staging:deploy && npm run staging:seed && npm run staging:health-check",
    "deploy:production": "npm run production:readiness-check && npm run production:deploy"
  }
}

// ====== HOW TO ADD THESE SCRIPTS ======

// Option 1: Using npm-scripts-merge
// npm install --save-dev npm-scripts-merge
// then create scripts.json with above content
// npx npm-scripts-merge package.json scripts.json

// Option 2: Manual addition to package.json
// Copy the "scripts" section above and merge into your existing package.json

// Option 3: Using jq (CLI)
// jq '.scripts += {
//   "staging:seed": "ts-node scripts/staging/seed-staging-data.ts",
//   ...
// }' package.json > package.json.tmp && mv package.json.tmp package.json

// ====== VERIFICATION ======

// After adding scripts, verify they're installed:
// npm run
// (should list all new commands)

// Test a few:
// npm run staging:status
// npm run production:readiness-check
// npm run test:uat
