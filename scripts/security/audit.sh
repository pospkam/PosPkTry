#!/bin/bash

# ========================================
# 🔒 KamHub Security Audit Script
# ========================================

set -e

echo "🔒 Running Security Audit for KamHub"
echo "======================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
pass() {
    echo -e "${GREEN}✅ $1${NC}"
    ((PASSED++))
}

fail() {
    echo -e "${RED}❌ $1${NC}"
    ((FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARNINGS++))
}

section() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    echo ""
}

# 1. Check npm audit
section "1. Checking for Dependencies Vulnerabilities"
if npm audit --audit-level=high 2>/dev/null; then
    pass "No high-level vulnerabilities found"
else
    warn "Some vulnerabilities detected in dependencies (check details above)"
fi

# 2. Check for outdated packages
section "2. Checking for Outdated Packages"
OUTDATED=$(npm outdated || echo "")
if [ -z "$OUTDATED" ]; then
    pass "All packages are up to date"
else
    warn "Some packages are outdated. Run 'npm update' to fix"
fi

# 3. Check environment variables
section "3. Checking Environment Variables Configuration"
if [ -f ".env.example" ]; then
    pass ".env.example file exists"
    
    REQUIRED_VARS=("DATABASE_URL" "REDIS_URL" "JWT_SECRET" "ENCRYPTION_KEY")
    for var in "${REQUIRED_VARS[@]}"; do
        if grep -q "$var" .env.example; then
            pass "$var is documented in .env.example"
        else
            fail "$var is missing from .env.example"
        fi
    done
else
    fail ".env.example file not found"
fi

# 4. Check for secrets in code
section "4. Checking for Hardcoded Secrets"
SECRET_PATTERNS=(
    "password.*=.*['\"]"
    "token.*=.*['\"]"
    "secret.*=.*['\"]"
    "api.key.*=.*['\"]"
)

FOUND_SECRETS=0
for pattern in "${SECRET_PATTERNS[@]}"; do
    if grep -r --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" \
        -i "$pattern" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.next 2>/dev/null; then
        warn "Potential hardcoded secret found matching pattern: $pattern"
        ((FOUND_SECRETS++))
    fi
done

if [ "$FOUND_SECRETS" -eq 0 ]; then
    pass "No obvious hardcoded secrets found"
fi

# 5. Check file permissions
section "5. Checking File Permissions"
if [ -f ".env.local" ] || [ -f ".env" ]; then
    if [ -f ".env.local" ]; then
        PERM=$(stat -c %a .env.local 2>/dev/null || stat -f %A .env.local 2>/dev/null)
        if [[ "$PERM" =~ ^[67]00$ ]]; then
            pass ".env.local has restricted permissions ($PERM)"
        else
            warn ".env.local might be too permissive (current: $PERM)"
        fi
    fi
fi

# 6. Check for sensitive files in git
section "6. Checking for Sensitive Files in Git"
SENSITIVE_FILES=(".env" ".env.local" ".env.*.local" "*.key" "*.pem" ".ssh/*")
FOUND_SENSITIVE=0

for pattern in "${SENSITIVE_FILES[@]}"; do
    if git ls-files --error-unmatch "$pattern" 2>/dev/null | grep -q .; then
        fail "Sensitive file '$pattern' is tracked in git!"
        ((FOUND_SENSITIVE++))
    fi
done

if [ "$FOUND_SENSITIVE" -eq 0 ]; then
    pass "No sensitive files found in git tracking"
fi

# 7. Check CORS configuration
section "7. Checking CORS Configuration"
if grep -r "cors\|CORS" app/ lib/ pages/api/ 2>/dev/null | head -1 > /dev/null; then
    pass "CORS configuration found in codebase"
    
    # Check for wildcard origins
    if grep -r "\*" app/ lib/ pages/api/ 2>/dev/null | grep -i "origin\|cors" > /dev/null; then
        warn "Potential wildcard CORS origin detected - ensure this is intentional for development only"
    else
        pass "CORS origins appear to be properly restricted"
    fi
else
    warn "CORS configuration not obviously present"
fi

# 8. Check SQL injection protection
section "8. Checking SQL Injection Protections"
if grep -r "pg\|postgres\|sql\|query" package.json 2>/dev/null | grep -q "."; then
    pass "Database dependencies found"
    
    # Check for parameterized queries
    if grep -r "\$" lib/ pillars/ 2>/dev/null | grep -i "query\|sql" | head -1 > /dev/null; then
        pass "Parameterized queries appear to be in use"
    else
        warn "Could not confirm parameterized query usage - review code manually"
    fi
else
    warn "Database dependencies not clearly identified"
fi

# 9. Check authentication
section "9. Checking Authentication Implementation"
if grep -r "jwt\|token\|auth" package.json 2>/dev/null | grep -q "."; then
    pass "Authentication dependencies found"
    
    if grep -r "Bearer\|JWT" middleware.ts pages/api/ 2>/dev/null | head -1 > /dev/null; then
        pass "JWT/Bearer token implementation found"
    else
        warn "Could not confirm JWT implementation - review auth middleware"
    fi
else
    fail "Authentication dependencies not found in package.json"
fi

# 10. Check rate limiting
section "10. Checking Rate Limiting"
if grep -r "rate.?limit\|rateLimit" package.json middleware.ts 2>/dev/null | grep -q "."; then
    pass "Rate limiting appears to be implemented"
else
    warn "Rate limiting configuration not obviously present - consider adding it"
fi

# 11. Check logging
section "11. Checking Security Logging"
if [ -d "logs" ] || [ -d "monitoring" ] || grep -r "logger\|winston\|pino" package.json 2>/dev/null; then
    pass "Logging infrastructure found"
else
    warn "Logging infrastructure not obviously present"
fi

# 12. Check HTTPS/TLS
section "12. Checking HTTPS/TLS Configuration"
if grep -r "https\|tls\|ssl" next.config.js 2>/dev/null | head -1 > /dev/null; then
    pass "HTTPS/TLS configuration found"
else
    warn "HTTPS/TLS configuration not obviously present in config"
fi

# 13. Check security headers
section "13. Checking Security Headers"
SECURITY_HEADERS=(
    "X-Content-Type-Options: nosniff"
    "X-Frame-Options"
    "X-XSS-Protection"
    "Strict-Transport-Security"
    "Content-Security-Policy"
)

for header in "${SECURITY_HEADERS[@]}"; do
    if grep -r "$header" middleware.ts lib/ pages/ 2>/dev/null | head -1 > /dev/null; then
        pass "Security header found: $header"
    else
        warn "Security header not obviously configured: $header"
    fi
done

# 14. Check input validation
section "14. Checking Input Validation"
if grep -r "zod\|joi\|yup\|validator" package.json 2>/dev/null | grep -q "."; then
    pass "Input validation library found"
else
    warn "Input validation library not found - ensure manual validation is in place"
fi

# Final Report
section "📊 Security Audit Summary"
TOTAL=$((PASSED + FAILED + WARNINGS))
echo "Total Checks: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
if [ "$FAILED" -gt 0 ]; then
    echo -e "${RED}Failed: $FAILED${NC}"
fi
if [ "$WARNINGS" -gt 0 ]; then
    echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
fi

echo ""
if [ "$FAILED" -eq 0 ]; then
    echo -e "${GREEN}✅ Security audit passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Security audit found critical issues. Please review above.${NC}"
    exit 1
fi
