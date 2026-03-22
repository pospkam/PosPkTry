#!/bin/bash

##############################################################################
# Production Readiness Checklist
# Проверяет все компоненты перед production deployment
# Usage: npm run production:readiness-check
##############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
GRAY='\033[0;37m'
NC='\033[0m'

# Scoring
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Helper functions
check_pass() {
  PASSED_CHECKS=$((PASSED_CHECKS + 1))
  echo -e "${GREEN}✅ PASS${NC}  - $1"
}

check_fail() {
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
  echo -e "${RED}❌ FAIL${NC}  - $1"
}

check_warn() {
  WARNING_CHECKS=$((WARNING_CHECKS + 1))
  echo -e "${YELLOW}⚠️  WARN${NC}  - $1"
}

check_skip() {
  echo -e "${GRAY}⏭️  SKIP${NC}  - $1"
}

section_start() {
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
}

section_end() {
  echo ""
}

# Infrastructure checks
check_infrastructure() {
  section_start "1️⃣  INFRASTRUCTURE CHECKS"
  
  # Kubernetes cluster
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  if kubectl cluster-info &>/dev/null; then
    check_pass "Kubernetes cluster accessible"
  else
    check_fail "Kubernetes cluster not accessible"
  fi
  
  # Nodes
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  local node_count=$(kubectl get nodes -o json | jq '.items | length')
  if [ "$node_count" -ge 3 ]; then
    check_pass "Sufficient worker nodes ($node_count)"
  else
    check_warn "Less than 3 worker nodes ($node_count)"
  fi
  
  # Node resources
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  local total_memory=$(kubectl get nodes -o json | jq '[.items[].status.allocatable.memory | gsub("Ki"; "") | tonumber] | add')
  if [ "$total_memory" -gt 10485760 ]; then  # 10GB
    check_pass "Sufficient cluster memory (>10GB)"
  else
    check_warn "Low cluster memory (<10GB)"
  fi
  
  # Storage
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  local storage_classes=$(kubectl get storageclasses -o json | jq '.items | length')
  if [ "$storage_classes" -gt 0 ]; then
    check_pass "Storage classes configured"
  else
    check_warn "No storage classes found"
  fi
  
  section_end
}

# Application checks
check_application() {
  section_start "2️⃣  APPLICATION CHECKS"
  
  # Docker images
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  if docker images | grep -q "kamhub.*v1.0.0"; then
    check_pass "Docker images built"
  else
    check_warn "Docker images not found locally"
  fi
  
  # Package.json
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  if [ -f "package.json" ]; then
    check_pass "package.json exists"
  else
    check_fail "package.json not found"
  fi
  
  # Dependencies
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  if [ -d "node_modules" ]; then
    check_pass "Dependencies installed"
  else
    check_warn "Dependencies not installed (npm install needed)"
  fi
  
  # Build output
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  if [ -d "dist" ] || [ -d ".next" ] || [ -d "build" ]; then
    check_pass "Application built"
  else
    check_warn "Application not built (npm run build needed)"
  fi
  
  section_end
}

# Database checks
check_database() {
  section_start "3️⃣  DATABASE CHECKS"
  
  # PostgreSQL connection
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  if [ -n "$DATABASE_URL" ]; then
    if psql "$DATABASE_URL" -c "SELECT 1" &>/dev/null; then
      check_pass "PostgreSQL connection working"
    else
      check_warn "PostgreSQL connection failed"
    fi
  else
    check_warn "DATABASE_URL not set"
  fi
  
  # Database exists
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  if psql "$DATABASE_URL" -c "SELECT 1 FROM users LIMIT 1" &>/dev/null; then
    check_pass "Database schema exists"
  else
    check_warn "Database schema may not exist"
  fi
  
  # Backup
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  if [ -f "backup-pre-deployment.sql" ]; then
    check_pass "Pre-deployment backup exists"
  else
    check_warn "No pre-deployment backup found"
  fi
  
  section_end
}

# Monitoring checks
check_monitoring() {
  section_start "4️⃣  MONITORING & OBSERVABILITY CHECKS"
  
  # Prometheus
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  if kubectl get deployment prometheus -n monitoring &>/dev/null; then
    check_pass "Prometheus deployed"
  else
    check_warn "Prometheus not deployed"
  fi
  
  # Grafana
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  if kubectl get deployment grafana -n monitoring &>/dev/null; then
    check_pass "Grafana deployed"
  else
    check_warn "Grafana not deployed"
  fi
  
  # Alert rules
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  if kubectl get configmap alert-rules -n monitoring &>/dev/null; then
    check_pass "Alert rules configured"
  else
    check_warn "Alert rules not configured"
  fi
  
  # Sentry
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  if [ -n "$SENTRY_DSN" ]; then
    check_pass "Sentry configured"
  else
    check_warn "Sentry DSN not set"
  fi
  
  section_end
}

# Security checks
check_security() {
  section_start "5️⃣  SECURITY CHECKS"
  
  # SSL certificates
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  if kubectl get secret kamhub-tls -n kamhub-production &>/dev/null; then
    check_pass "SSL certificate configured"
  else
    check_warn "SSL certificate not found"
  fi
  
  # Secrets
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  local secret_count=$(kubectl get secrets -n kamhub-production -o json | jq '.items | length')
  if [ "$secret_count" -gt 0 ]; then
    check_pass "Secrets configured ($secret_count)"
  else
    check_fail "No secrets found"
  fi
  
  # Network policies
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  if kubectl get networkpolicies -n kamhub-production &>/dev/null; then
    check_pass "Network policies configured"
  else
    check_warn "Network policies not configured"
  fi
  
  # RBAC
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  if kubectl get rolebindings -n kamhub-production &>/dev/null; then
    check_pass "RBAC configured"
  else
    check_warn "RBAC not configured"
  fi
  
  section_end
}

# Documentation checks
check_documentation() {
  section_start "6️⃣  DOCUMENTATION CHECKS"
  
  # Runbooks
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  if [ -f "docs/RUNBOOK.md" ]; then
    check_pass "Runbook exists"
  else
    check_warn "Runbook not found"
  fi
  
  # API documentation
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  if [ -f "docs/API.md" ] || [ -d "docs/api" ]; then
    check_pass "API documentation exists"
  else
    check_warn "API documentation not found"
  fi
  
  # Incident response
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  if [ -f "docs/INCIDENT_RESPONSE.md" ]; then
    check_pass "Incident response plan exists"
  else
    check_warn "Incident response plan not found"
  fi
  
  section_end
}

# Team checks
check_team() {
  section_start "7️⃣  TEAM READINESS CHECKS"
  
  # On-call team
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  if [ -n "$ON_CALL_TEAM" ]; then
    check_pass "On-call team assigned"
  else
    check_warn "On-call team not assigned"
  fi
  
  # Communication channels
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  if [ -n "$SLACK_CHANNEL" ]; then
    check_pass "Communication channel configured"
  else
    check_warn "Communication channel not configured"
  fi
  
  section_end
}

# Generate report
generate_report() {
  section_start "📊 READINESS REPORT"
  
  local total_score=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
  
  echo "Total Checks:     $TOTAL_CHECKS"
  echo -e "  ${GREEN}Passed${NC}:       $PASSED_CHECKS"
  echo -e "  ${YELLOW}Warnings${NC}:     $WARNING_CHECKS"
  echo -e "  ${RED}Failed${NC}:        $FAILED_CHECKS"
  echo ""
  echo "Readiness Score:  $total_score%"
  echo ""
  
  if [ $FAILED_CHECKS -eq 0 ]; then
    if [ $WARNING_CHECKS -eq 0 ]; then
      echo -e "${GREEN}🚀 READY FOR PRODUCTION DEPLOYMENT${NC}"
      return 0
    else
      echo -e "${YELLOW}⚠️  CAUTION: Some warnings detected${NC}"
      return 0
    fi
  else
    echo -e "${RED}❌ NOT READY FOR PRODUCTION DEPLOYMENT${NC}"
    echo "Please fix all failed checks before proceeding."
    return 1
  fi
}

# Main execution
main() {
  echo ""
  echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║     KamHub Production Readiness Checklist              ║${NC}"
  echo -e "${BLUE}║     Date: $(date '+%Y-%m-%d %H:%M:%S')                     ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
  
  check_infrastructure
  check_application
  check_database
  check_monitoring
  check_security
  check_documentation
  check_team
  
  generate_report
}

main "$@"
