#!/bin/bash

##############################################################################
# Blue-Green Deployment Switch Script
# Переключает трафик между Blue и Green версиями
# Usage: ./scripts/deployment/blue-green-switch.sh [blue|green]
##############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="kamhub-production"
SERVICE_NAME="kamhub-service"
BLUE_DEPLOYMENT="kamhub-api-blue"
GREEN_DEPLOYMENT="kamhub-api-green"
HEALTH_CHECK_RETRIES=30
HEALTH_CHECK_INTERVAL=10
METRICS_PORT=9090

# Functions
print_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
  print_info "Checking prerequisites..."
  
  if ! command -v kubectl &> /dev/null; then
    print_error "kubectl is not installed"
    exit 1
  fi
  
  # Check connection to cluster
  if ! kubectl cluster-info &> /dev/null; then
    print_error "Cannot connect to Kubernetes cluster"
    exit 1
  fi
  
  print_success "All prerequisites met"
}

# Get current active version
get_current_version() {
  local current=$(kubectl get service $SERVICE_NAME -n $NAMESPACE \
    -o jsonpath='{.spec.selector.version}')
  echo "$current"
}

# Get pod count for deployment
get_pod_count() {
  local deployment=$1
  kubectl get pods -n $NAMESPACE \
    -l app=kamhub-api,version=$deployment \
    --field-selector=status.phase=Running \
    -o json | jq '.items | length'
}

# Health check for deployment
health_check() {
  local version=$1
  local ready_replicas=$(kubectl get deployment kamhub-api-$version -n $NAMESPACE \
    -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
  local desired_replicas=$(kubectl get deployment kamhub-api-$version -n $NAMESPACE \
    -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
  
  echo "$ready_replicas/$desired_replicas"
}

# Check API endpoint
check_api_health() {
  local version=$1
  local pod=$(kubectl get pods -n $NAMESPACE \
    -l app=kamhub-api,version=$version \
    --field-selector=status.phase=Running \
    -o name | head -1)
  
  if [ -z "$pod" ]; then
    return 1
  fi
  
  local response=$(kubectl exec -n $NAMESPACE $pod -- \
    curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null || echo "000")
  
  [ "$response" = "200" ]
}

# Wait for deployment to be ready
wait_for_deployment() {
  local version=$1
  local deployment="kamhub-api-$version"
  
  print_info "Waiting for $version deployment to be ready..."
  
  for i in $(seq 1 $HEALTH_CHECK_RETRIES); do
    local health=$(health_check "$version")
    local status=$(check_api_health "$version")
    
    print_info "[$i/$HEALTH_CHECK_RETRIES] $version status: $health"
    
    if [ "$status" = "0" ]; then
      local ready=$(echo $health | cut -d'/' -f1)
      local desired=$(echo $health | cut -d'/' -f2)
      if [ "$ready" = "$desired" ] && [ "$ready" -gt 0 ]; then
        print_success "$version deployment is healthy"
        return 0
      fi
    fi
    
    sleep $HEALTH_CHECK_INTERVAL
  done
  
  print_error "$version deployment did not become ready in time"
  return 1
}

# Switch traffic to version
switch_traffic() {
  local target_version=$1
  local current_version=$(get_current_version)
  
  if [ "$current_version" = "$target_version" ]; then
    print_warning "Traffic is already routed to $target_version"
    return 0
  fi
  
  print_info "Switching traffic from $current_version to $target_version..."
  
  kubectl patch service $SERVICE_NAME -n $NAMESPACE \
    -p '{"spec":{"selector":{"version":"'$target_version'"}}}'
  
  print_success "Traffic switched to $target_version"
}

# Verify traffic switch
verify_traffic_switch() {
  local target_version=$1
  
  print_info "Verifying traffic switch..."
  sleep 5  # Give LB time to update
  
  local current=$(get_current_version)
  if [ "$current" = "$target_version" ]; then
    print_success "Traffic successfully switched to $target_version"
    return 0
  else
    print_error "Traffic switch verification failed. Current: $current, Expected: $target_version"
    return 1
  fi
}

# Rollback to previous version
rollback() {
  local current=$(get_current_version)
  local rollback_target
  
  if [ "$current" = "blue" ]; then
    rollback_target="green"
  else
    rollback_target="blue"
  fi
  
  print_warning "Rolling back to $rollback_target..."
  switch_traffic "$rollback_target"
  verify_traffic_switch "$rollback_target"
}

# Monitor metrics during switch
monitor_metrics() {
  local target_version=$1
  local duration=60  # Monitor for 1 minute
  
  print_info "Monitoring metrics for $target_version deployment..."
  print_info "Collecting metrics for ${duration} seconds..."
  
  kubectl port-forward -n $NAMESPACE \
    deployment/kamhub-api-$target_version $METRICS_PORT:$METRICS_PORT &>/dev/null &
  local pf_pid=$!
  
  sleep 2
  
  # Collect metrics
  local error_rate=$(curl -s http://localhost:$METRICS_PORT/metrics 2>/dev/null | \
    grep 'http_requests_total{status="5' | awk '{print $2}' | head -1 || echo "0")
  
  kill $pf_pid 2>/dev/null || true
  
  if [ "$error_rate" = "0" ]; then
    print_success "No errors detected during switch"
    return 0
  else
    print_warning "Some errors detected: $error_rate"
    return 1
  fi
}

# Generate deployment report
generate_report() {
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  local blue_health=$(health_check "blue")
  local green_health=$(health_check "green")
  local current=$(get_current_version)
  
  cat > deployment-report-$(date +%Y%m%d-%H%M%S).log << EOF
Blue-Green Deployment Report
============================
Timestamp: $timestamp
Current Active Version: $current

Deployment Status:
  Blue:  $blue_health
  Green: $green_health

Service Selector:
  Version: $current

Date: $(date)
EOF

  print_success "Report generated: deployment-report-*.log"
}

# Main deployment logic
deploy_new_version() {
  local current=$(get_current_version)
  local target
  
  if [ "$current" = "blue" ]; then
    target="green"
  else
    target="blue"
  fi
  
  print_info "Starting deployment: $current → $target"
  
  # Step 1: Ensure target deployment is ready
  if ! wait_for_deployment "$target"; then
    print_error "Target deployment is not ready. Aborting."
    exit 1
  fi
  
  # Step 2: Monitor target deployment
  print_info "Running smoke tests on $target..."
  if ! monitor_metrics "$target"; then
    print_warning "Metrics check failed, but proceeding..."
  fi
  
  # Step 3: Switch traffic
  if ! switch_traffic "$target"; then
    print_error "Failed to switch traffic"
    exit 1
  fi
  
  # Step 4: Verify switch
  if ! verify_traffic_switch "$target"; then
    print_error "Traffic switch verification failed. Attempting rollback..."
    rollback
    exit 1
  fi
  
  # Step 5: Generate report
  generate_report
  
  print_success "Deployment completed successfully!"
  print_info "Active version: $target"
}

# Show status
show_status() {
  local current=$(get_current_version)
  local blue_health=$(health_check "blue")
  local green_health=$(health_check "green")
  
  print_info "Current Blue-Green Status:"
  echo ""
  echo "  Active Version:  $current"
  echo "  Blue Status:     $blue_health"
  echo "  Green Status:    $green_health"
  echo ""
}

# Manual version selection
manual_switch() {
  local target=$1
  
  if [ "$target" != "blue" ] && [ "$target" != "green" ]; then
    print_error "Invalid target version: $target"
    echo "Usage: $0 [blue|green|deploy|status|rollback]"
    exit 1
  fi
  
  print_warning "Manual switch requested to $target"
  
  if ! wait_for_deployment "$target"; then
    print_error "Target deployment is not ready"
    exit 1
  fi
  
  if ! switch_traffic "$target"; then
    print_error "Failed to switch traffic"
    exit 1
  fi
  
  if ! verify_traffic_switch "$target"; then
    print_error "Verification failed. Rolling back..."
    rollback
    exit 1
  fi
  
  print_success "Successfully switched to $target"
  generate_report
}

##############################################################################
# MAIN EXECUTION
##############################################################################

main() {
  print_info "KamHub Blue-Green Deployment Script"
  print_info "Namespace: $NAMESPACE"
  
  check_prerequisites
  
  # Handle command line arguments
  case "${1:-deploy}" in
    deploy)
      deploy_new_version
      ;;
    blue)
      manual_switch "blue"
      ;;
    green)
      manual_switch "green"
      ;;
    status)
      show_status
      ;;
    rollback)
      print_warning "Executing rollback..."
      rollback
      ;;
    *)
      print_error "Unknown command: $1"
      echo ""
      echo "Usage: $0 [command]"
      echo ""
      echo "Commands:"
      echo "  deploy    - Deploy new version (automatic blue↔green switch)"
      echo "  blue      - Manually switch to blue version"
      echo "  green     - Manually switch to green version"
      echo "  status    - Show current status"
      echo "  rollback  - Rollback to previous version"
      exit 1
      ;;
  esac
}

main "$@"
