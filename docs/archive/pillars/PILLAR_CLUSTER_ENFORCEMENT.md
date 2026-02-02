# Pillar-Cluster Architecture: Enforcement & Linting

## Overview

This guide explains how to enforce pillar-cluster architecture boundaries using ESLint, custom rules, and code organization patterns.

---

## 1. ESLint Configuration

### Base Configuration (`.eslintrc.json`)

Add these rules to enforce architecture boundaries:

```json
{
  "extends": ["next/core-web-vitals"],
  "rules": {
    "no-restricted-imports": [
      "error",
      {
        "patterns": [
          {
            "group": ["@/components/admin/**", "@/components/operator/**"],
            "message": "Partner Management components should not be imported in Discovery pillar"
          },
          {
            "group": ["@/lib/payments/**", "@/lib/loyalty/**"],
            "message": "Do not import booking/engagement utilities in discovery. Use API endpoints instead."
          },
          {
            "group": ["@/types/admin", "@/types/operator", "@/types/agent"],
            "message": "Partner types should only be used in Partner Management pillar"
          }
        ]
      }
    ],
    "import/no-restricted-paths": [
      "error",
      {
        "zones": [
          {
            "target": "./app/tours/**",
            "from": "./app/admin/**",
            "message": "Tours page (Discovery) should not depend on Admin page (Partner Mgmt)"
          },
          {
            "target": "./app/admin/**",
            "from": "./app/tours/**",
            "message": "Admin page (Partner Mgmt) should not depend on Tours page (Discovery)"
          },
          {
            "target": "./components/search/**",
            "from": "./components/operator/**",
            "message": "Search components (Discovery) should not import Operator components (Partner)"
          },
          {
            "target": "./lib/ai/**",
            "from": "./app/admin/**",
            "message": "Core infrastructure should be independent"
          }
        ]
      }
    ]
  }
}
```

---

## 2. Path Aliases by Pillar

### `tsconfig.json` Aliases

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"],
      
      // Core Infrastructure
      "@/core/**": ["./lib/auth/*", "./lib/database/*", "./lib/cache*", "./middleware*"],
      "@/auth/**": ["./lib/auth/*"],
      "@/db/**": ["./lib/database/*"],
      
      // Discovery Pillar
      "@/discovery/**": ["./app/tours/*", "./app/accommodations/*", "./app/cars/*", "./app/gear/*", "./lib/weather/*", "./lib/maps/*"],
      "@/discovery/search": ["./lib/ai/*"],
      "@/discovery/tours": ["./app/tours/*"],
      "@/discovery/accommodations": ["./app/accommodations/*"],
      
      // Booking Pillar
      "@/booking/**": ["./app/api/bookings/*", "./lib/payments/*", "./components/booking/*"],
      "@/booking/payments": ["./lib/payments/*"],
      
      // Engagement Pillar
      "@/engagement/**": ["./app/api/reviews/*", "./lib/loyalty/*", "./components/reviews/*"],
      "@/engagement/loyalty": ["./lib/loyalty/*"],
      
      // Partner Management Pillar
      "@/partner/**": ["./components/admin/*", "./components/operator/*", "./components/agent/*", "./types/admin*", "./types/operator*", "./types/agent*"],
      "@/partner/admin": ["./components/admin/*"],
      "@/partner/operator": ["./components/operator/*"],
      "@/partner/agent": ["./components/agent/*"]
    }
  }
}
```

---

## 3. Directory-Specific ESLint Rules

Create separate ESLint configuration files per pillar:

### `.eslintrc.discovery.js`
```javascript
module.exports = {
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@/partner/**'],
            message: 'Discovery pillar cannot import from Partner Management'
          },
          {
            group: ['@/lib/payments/**'],
            message: 'Use /api/bookings endpoint instead of direct payment lib import'
          },
          {
            group: ['@/lib/loyalty/**'],
            message: 'Use /api/loyalty endpoint instead of direct loyalty lib import'
          },
          {
            group: ['@/components/operator/**'],
            message: 'Discovery should not import operator-specific components'
          }
        ]
      }
    ]
  }
}
```

### `.eslintrc.booking.js`
```javascript
module.exports = {
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@/partner/**'],
            message: 'Booking pillar cannot import from Partner Management'
          },
          {
            group: ['@/engagement/**'],
            message: 'Use webhooks/events for Booking-Engagement communication'
          }
        ]
      }
    ]
  }
}
```

### `.eslintrc.engagement.js`
```javascript
module.exports = {
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@/partner/**'],
            message: 'Engagement pillar cannot import from Partner Management'
          }
        ]
      }
    ]
  }
}
```

### `.eslintrc.partner.js`
```javascript
module.exports = {
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          // Partner can import from Core and depend on others
          // But with specific allowed patterns
        ]
      }
    ]
  }
}
```

---

## 4. Custom ESLint Plugin for Pillar Validation

Create a custom plugin to enforce pillar boundaries:

### `eslint-plugin-pillar-architecture.js`

```javascript
module.exports = {
  rules: {
    'enforce-pillar-boundaries': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Enforce pillar-cluster architecture boundaries',
          category: 'Architecture'
        },
        messages: {
          invalidImport: 'Invalid import: {{ source }} is not accessible from {{ currentPillar }}',
          noCircularDeps: 'Circular dependency detected between {{ pillar1 }} and {{ pillar2 }}'
        }
      },
      create(context) {
        const filename = context.getFilename();
        const currentPillar = detectPillar(filename);

        return {
          ImportDeclaration(node) {
            const importedPath = node.source.value;
            const importedPillar = detectPillar(importedPath);

            // Check if import is allowed
            if (!isImportAllowed(currentPillar, importedPillar)) {
              context.report({
                node,
                messageId: 'invalidImport',
                data: {
                  source: importedPath,
                  currentPillar
                }
              });
            }
          }
        };
      }
    }
  }
};

function detectPillar(filePath) {
  if (filePath.includes('admin') || filePath.includes('operator') || filePath.includes('agent')) {
    return 'partner';
  } else if (filePath.includes('booking') || filePath.includes('payments') || filePath.includes('cart')) {
    return 'booking';
  } else if (filePath.includes('reviews') || filePath.includes('loyalty') || filePath.includes('chat')) {
    return 'engagement';
  } else if (filePath.includes('tours') || filePath.includes('accommodations') || filePath.includes('search')) {
    return 'discovery';
  } else if (filePath.includes('auth') || filePath.includes('database') || filePath.includes('middleware')) {
    return 'core';
  }
  return 'unknown';
}

function isImportAllowed(fromPillar, toPillar) {
  // Define allowed dependencies
  const allowedDeps = {
    discovery: ['core'],
    booking: ['core', 'discovery'], // Can read discovery data (read-only)
    engagement: ['core', 'booking', 'discovery'], // Can read from booking/discovery
    partner: ['core', 'booking', 'discovery', 'engagement'], // Can read all
    core: [] // Core depends on nothing
  };

  return allowedDeps[fromPillar]?.includes(toPillar) ?? false;
}
```

Add to `.eslintrc.json`:
```json
{
  "plugins": ["pillar-architecture"],
  "rules": {
    "pillar-architecture/enforce-pillar-boundaries": "error"
  }
}
```

---

## 5. Pre-Commit Hooks

### `.husky/pre-commit`

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run pillar-boundary linting
echo "🏗️  Checking pillar architecture boundaries..."
npx eslint --config .eslintrc.json 'app/**/*.{ts,tsx}' 'lib/**/*.{ts,tsx}' 'components/**/*.{tsx}'

# Check for forbidden imports
echo "🚫 Checking for forbidden imports..."
npx eslint --rule 'no-restricted-imports: [error, { "paths": [...] }]' .

# Run tests
echo "🧪 Running tests..."
npm test -- --bail --passWithNoTests

exit 0
```

### Install Husky

```bash
npm install husky --save-dev
npx husky install
npx husky add .husky/pre-commit "npm run lint:architecture"
```

---

## 6. NPM Scripts for Validation

### `package.json`

```json
{
  "scripts": {
    "lint:architecture": "eslint . --config .eslintrc.json --rule 'no-restricted-imports: error'",
    "lint:discovery": "eslint 'app/tours/**' 'app/accommodations/**' 'app/search/**' --config .eslintrc.discovery.js",
    "lint:booking": "eslint 'app/api/bookings/**' 'app/cart/**' --config .eslintrc.booking.js",
    "lint:engagement": "eslint 'app/api/reviews/**' 'app/api/loyalty/**' --config .eslintrc.engagement.js",
    "lint:partner": "eslint 'app/admin/**' 'app/partner/**' 'components/admin/**' --config .eslintrc.partner.js",
    "lint:all-pillars": "npm run lint:discovery && npm run lint:booking && npm run lint:engagement && npm run lint:partner",
    "validate-architecture": "node scripts/validate-architecture.js",
    "check-deps": "depcheck && npm run validate-architecture"
  }
}
```

---

## 7. Architecture Validation Script

Create `scripts/validate-architecture.js`:

```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const PILLAR_RULES = {
  discovery: {
    canImport: ['core'],
    cannotImport: ['partner', 'booking', 'engagement']
  },
  booking: {
    canImport: ['core', 'discovery'],
    cannotImport: ['partner', 'engagement']
  },
  engagement: {
    canImport: ['core', 'booking', 'discovery'],
    cannotImport: ['partner']
  },
  partner: {
    canImport: ['core', 'booking', 'discovery', 'engagement'],
    cannotImport: []
  },
  core: {
    canImport: [],
    cannotImport: ['discovery', 'booking', 'engagement', 'partner']
  }
};

function getPillarFromPath(filePath) {
  if (filePath.includes('admin') || filePath.includes('operator') || filePath.includes('agent')) {
    return 'partner';
  } else if (filePath.includes('booking') || filePath.includes('payments') || filePath.includes('cart')) {
    return 'booking';
  } else if (filePath.includes('reviews') || filePath.includes('loyalty') || filePath.includes('chat')) {
    return 'engagement';
  } else if (filePath.includes('tours') || filePath.includes('accommodations') || filePath.includes('search')) {
    return 'discovery';
  } else if (filePath.includes('auth') || filePath.includes('database') || filePath.includes('middleware')) {
    return 'core';
  }
  return null;
}

function extractImportPath(line) {
  const match = line.match(/from\s+['"](@\/.*?)['"]/);
  return match ? match[1] : null;
}

function validateFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const currentPillar = getPillarFromPath(filePath);
  
  if (!currentPillar) return [];

  const violations = [];
  
  lines.forEach((line, lineNum) => {
    if (!line.includes('import ')) return;
    
    const importPath = extractImportPath(line);
    if (!importPath) return;

    const importedPillar = getPillarFromPath(importPath);
    if (!importedPillar) return;

    const rules = PILLAR_RULES[currentPillar];
    if (!rules.canImport.includes(importedPillar)) {
      violations.push({
        file: filePath,
        line: lineNum + 1,
        message: `${currentPillar} cannot import from ${importedPillar}`,
        import: importPath
      });
    }
  });

  return violations;
}

function main() {
  const rootDir = path.join(__dirname, '..');
  const sourceFiles = [
    ...findFiles(path.join(rootDir, 'app'), /\.(ts|tsx)$/),
    ...findFiles(path.join(rootDir, 'lib'), /\.(ts|tsx)$/),
    ...findFiles(path.join(rootDir, 'components'), /\.(tsx)$/)
  ];

  let totalViolations = 0;

  sourceFiles.forEach(file => {
    const violations = validateFile(file);
    if (violations.length > 0) {
      console.error(`\n❌ ${file}`);
      violations.forEach(v => {
        console.error(`   Line ${v.line}: ${v.message}`);
        console.error(`   Import: ${v.import}`);
      });
      totalViolations += violations.length;
    }
  });

  if (totalViolations > 0) {
    console.error(`\n\n🚨 Found ${totalViolations} architecture violations`);
    process.exit(1);
  } else {
    console.log('\n✅ All pillar boundaries are valid!');
    process.exit(0);
  }
}

function findFiles(dir, pattern) {
  const files = [];
  if (!fs.existsSync(dir)) return files;

  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...findFiles(fullPath, pattern));
    } else if (pattern.test(file)) {
      files.push(fullPath);
    }
  });

  return files;
}

main();
```

Run with:
```bash
npm run validate-architecture
```

---

## 8. GitHub Actions Workflow

Create `.github/workflows/architecture-check.yml`:

```yaml
name: Architecture Validation

on:
  pull_request:
    paths:
      - 'app/**'
      - 'lib/**'
      - 'components/**'
      - 'types/**'

jobs:
  validate-architecture:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: 🏗️  Validate Pillar Architecture
        run: npm run validate-architecture

      - name: 🔍 Lint All Pillars
        run: npm run lint:all-pillars

      - name: 🚫 Check Forbidden Imports
        run: npx eslint . --rule 'no-restricted-imports: error'

      - name: 📊 Generate Architecture Report
        if: failure()
        run: node scripts/validate-architecture.js --report
```

---

## 9. IDE Configuration

### VS Code Settings (`.vscode/settings.json`)

```json
{
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "files.exclude": {
    "**/node_modules": true,
    "**/.next": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/.next": true
  }
}
```

### VS Code Extensions (`.vscode/extensions.json`)

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-playwright.playwright",
    "ms-vscode.makefile-tools"
  ]
}
```

---

## 10. TypeScript Strict Mode

### Enhanced `tsconfig.json`

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "baseUrl": ".",
    "paths": {
      "@/core/*": ["lib/auth/*", "lib/database/*", "middleware*"],
      "@/discovery/*": ["app/tours/*", "app/accommodations/*"],
      "@/booking/*": ["app/api/bookings/*", "lib/payments/*"],
      "@/engagement/*": ["app/api/reviews/*", "lib/loyalty/*"],
      "@/partner/*": ["components/admin/*", "components/operator/*"]
    }
  },
  "include": ["app/**/*", "lib/**/*", "components/**/*"],
  "exclude": ["node_modules", ".next", "dist"]
}
```

---

## 11. Documentation File: `ARCHITECTURE_VIOLATIONS.md`

Track and document any intentional violations:

```markdown
# Architecture Violations Log

## Intentional Violations

| Location | Violation | Reason | Approved By | Date |
|----------|-----------|--------|-------------|------|
| `app/booking/hooks/useDiscovery.ts` | Booking imports Discovery | Needed for real-time availability | @lead-dev | 2024-01-15 |
| `lib/payments/notify.ts` | Payments imports Engagement | Post-payment engagement | @lead-dev | 2024-01-16 |

## Anti-Patterns to Avoid

- ❌ Circular imports between pillars
- ❌ Sharing React Context across pillars
- ❌ Direct database queries between pillars (use APIs)
- ❌ Hardcoding pillar-specific logic in Core Infra

```

---

## 12. Monitoring & Metrics

Create `scripts/architecture-metrics.js`:

```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function countLines(file) {
  const content = fs.readFileSync(file, 'utf-8');
  return content.split('\n').length;
}

function calculatePillarMetrics() {
  const pillars = {
    discovery: 'app/tours/**,app/accommodations/**,app/search/**',
    booking: 'app/api/bookings/**,app/cart/**',
    engagement: 'app/api/reviews/**,app/api/loyalty/**',
    partner: 'app/admin/**,components/admin/**,components/operator/**',
    core: 'lib/auth/**,lib/database/**,middleware*'
  };

  console.log('\n📊 Architecture Metrics\n');
  console.log('Pillar         | LOC    | Files | Complexity');
  console.log('---------------|--------|-------|------------');

  Object.entries(pillars).forEach(([name, pattern]) => {
    // Count files and LOC
    let totalLOC = 0;
    let fileCount = 0;
    
    // Implementation would traverse and count
    console.log(`${name.padEnd(14)} | ${totalLOC.toString().padEnd(6)} | ${fileCount} | Medium`);
  });
}

calculatePillarMetrics();
```

---

## 13. Implementation Checklist

- [ ] Add ESLint configuration to project
- [ ] Configure path aliases in `tsconfig.json`
- [ ] Set up pre-commit hooks with Husky
- [ ] Create validation script and add to CI/CD
- [ ] Document all intentional violations
- [ ] Train team on architecture rules
- [ ] Add architecture validation to PR checklist
- [ ] Generate metrics dashboard
- [ ] Set up IDE extensions
- [ ] Create onboarding guide for new developers

---

## 14. Quick Reference: What You Can Import

```typescript
// ✅ ALLOWED

// In Discovery component
import { getTourDetails } from '@/lib/ai/search'     // Core + same pillar
import { User } from '@/types'                      // Core types OK

// In Booking component
import { getTourDetails } from '@/api/tours'        // Read discovery via API
import { processPayment } from '@/lib/payments'     // Same pillar

// In Partner component
import { getBookingDetails } from '@/api/bookings'  // Read other pillars via API
import { getOperatorMetrics } from '@/lib'          // Same pillar

// ❌ NOT ALLOWED

// In Discovery component
import { processPayment } from '@/lib/payments'     // ❌ Booking pillar
import { AdminDashboard } from '@/components/admin' // ❌ Partner pillar

// In Core Infrastructure
import { tourSearch } from '@/lib/tours'            // ❌ Any pillar

// Circular between pillars
// Booking imports from Discovery and vice versa    // ❌ Both directions
```

---

**This enforcement system ensures the pillar-cluster architecture remains clean and maintainable as the codebase grows.**
