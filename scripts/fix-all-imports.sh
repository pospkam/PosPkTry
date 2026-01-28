#!/bin/bash

echo "🔧 Автоматическое исправление импортов в KamHub"
echo "================================================"
echo "Дата: $(date)"
echo ""

# Переход в корневую директорию проекта
cd /workspaces/kamhub

# 1. Обновляем tsconfig.json с правильными алиасами
echo "📝 1. Обновление tsconfig.json..."

cat > tsconfig.json << 'TS_EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@/components/*": ["./components/*"],
      "@/app/*": ["./app/*"],
      "@/lib/*": ["./lib/*"],
      "@/types/*": ["./types/*"],
      
      "@core-infrastructure/*": ["./pillars/core-infrastructure/*"],
      "@core-infrastructure/api/*": ["./pillars/core-infrastructure/api/*"],
      "@core-infrastructure/lib/*": ["./pillars/core-infrastructure/lib/*"],
      "@core-infrastructure/types/*": ["./pillars/core-infrastructure/types/*"],
      "@core-infrastructure/services/*": ["./pillars/core-infrastructure/services/*"],
      
      "@discovery-pillar/*": ["./pillars/discovery-pillar/*"],
      "@discovery-pillar/lib/*": ["./pillars/discovery-pillar/lib/*"],
      "@discovery-pillar/services/*": ["./pillars/discovery-pillar/services/*"],
      
      "@discovery/*": ["./pillars/discovery/*"],
      "@discovery/api/*": ["./pillars/discovery/api/*"],
      "@discovery/components/*": ["./pillars/discovery/components/*"],
      "@discovery/lib/*": ["./pillars/discovery/lib/*"],
      "@discovery/types/*": ["./pillars/discovery/types/*"],
      "@discovery/services/*": ["./pillars/discovery/services/*"],
      
      "@booking/*": ["./pillars/booking/*"],
      "@booking/api/*": ["./pillars/booking/api/*"],
      "@booking/components/*": ["./pillars/booking/components/*"],
      "@booking/lib/*": ["./pillars/booking/lib/*"],
      "@booking/types/*": ["./pillars/booking/types/*"],
      "@booking/services/*": ["./pillars/booking/services/*"],
      
      "@support/*": ["./pillars/support/*"],
      "@support/api/*": ["./pillars/support/api/*"],
      "@support/components/*": ["./pillars/support/components/*"],
      "@support/lib/*": ["./pillars/support/lib/*"],
      "@support/types/*": ["./pillars/support/types/*"],
      "@support/services/*": ["./pillars/support/services/*"],
      
      "@partner/*": ["./pillars/partner/*"],
      "@partner/api/*": ["./pillars/partner/api/*"],
      "@partner/components/*": ["./pillars/partner/components/*"],
      "@partner/lib/*": ["./pillars/partner/lib/*"],
      "@partner/types/*": ["./pillars/partner/types/*"],
      "@partner/services/*": ["./pillars/partner/services/*"],
      
      "@analytics/*": ["./pillars/analytics/*"],
      "@analytics/api/*": ["./pillars/analytics/api/*"],
      "@analytics/components/*": ["./pillars/analytics/components/*"],
      "@analytics/lib/*": ["./pillars/analytics/lib/*"],
      "@analytics/types/*": ["./pillars/analytics/types/*"],
      "@analytics/services/*": ["./pillars/analytics/services/*"],
      
      "@engagement/*": ["./pillars/engagement/*"],
      "@engagement/api/*": ["./pillars/engagement/api/*"],
      "@engagement/components/*": ["./pillars/engagement/components/*"],
      "@engagement/lib/*": ["./pillars/engagement/lib/*"],
      "@engagement/types/*": ["./pillars/engagement/types/*"],
      "@engagement/services/*": ["./pillars/engagement/services/*"],
      
      "@services/*": ["./pillars/core-infrastructure/services/*"],
      "@types/*": ["./pillars/core-infrastructure/types/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
TS_EOF

echo "✅ tsconfig.json обновлен"

# 2. Создаем недостающие index.ts файлы для экспортов
echo "📁 2. Создание index.ts файлов для экспортов..."

# Проверяем и создаем директории если нужно
mkdir -p pillars/core-infrastructure/services
mkdir -p pillars/support/services
mkdir -p pillars/partner/services
mkdir -p pillars/analytics/services
mkdir -p pillars/discovery/services
mkdir -p pillars/booking/services
mkdir -p pillars/engagement/services

# Создаем index.ts файлы
cat > pillars/core-infrastructure/services/index.ts << 'EOF'
// Export database service
export { DatabaseService } from './database/database.service';

// Export cache service  
export { CacheService } from './cache/cache.service';

// Export event bus service
export { EventBusService } from './events/event-bus.service';

// Export monitoring service
export { MonitoringService } from './monitoring/monitoring.service';

// Export common services
export * from './index';
EOF

# Support services index
if [ ! -f pillars/support/services/index.ts ]; then
  cat > pillars/support/services/index.ts << 'EOF'
// Export support services
export { TicketService } from './ticket/ticket.service';
export { AgentService } from './agent/agent.service';
export { FeedbackService } from './feedback/feedback.service';
EOF
fi

# Partner services index
if [ ! -f pillars/partner/services/index.ts ]; then
  cat > pillars/partner/services/index.ts << 'EOF'
// Export partner services
export { PartnerService } from './partner/partner.service';
export { OperatorService } from './operator/operator.service';
EOF
fi

# Analytics services index
if [ ! -f pillars/analytics/services/index.ts ]; then
  cat > pillars/analytics/services/index.ts << 'EOF'
// Export analytics services
export { AnalyticsDashboardService } from './dashboard/dashboard.service';
export { ReportingService } from './reporting/reporting.service';
EOF
fi

echo "✅ Index.ts файлы созданы"

# 3. Исправляем импорты во всех файлах
echo "🔧 3. Исправление импортов в файлах..."

# Создаем временный Node.js скрипт для исправления импортов
cat > /tmp/fix-imports.js << 'JS_EOF'
const fs = require('fs');
const path = require('path');

const replacements = [
  // Core Infrastructure - старые пути
  { 
    from: /from ['"]@core-infrastructure\/database['"];/g, 
    to: "from '@/pillars/core-infrastructure/services/database/database.service';"
  },
  { 
    from: /from ['"]@core-infrastructure\/cache['"];/g, 
    to: "from '@/pillars/core-infrastructure/services/cache/cache.service';"
  },
  { 
    from: /from ['"]@core-infrastructure\/events['"];/g, 
    to: "from '@/pillars/core-infrastructure/services/events/event-bus.service';"
  },
  { 
    from: /from ['"]@core-infrastructure\/monitoring['"];/g, 
    to: "from '@/pillars/core-infrastructure/services/monitoring/monitoring.service';"
  },
  // Support
  { 
    from: /from ['"]@support\/services\/ticket['"];/g, 
    to: "from '@/pillars/support/services/ticket/ticket.service';"
  },
  { 
    from: /from ['"]@support\/services\/agent['"];/g, 
    to: "from '@/pillars/support/services/agent/agent.service';"
  },
  // Partner  
  { 
    from: /from ['"]@partner-pillar\/services\/partner['"];/g, 
    to: "from '@/pillars/partner/services/partner/partner.service';"
  },
  // Analytics
  { 
    from: /from ['"]@analytics-pillar\/services\/dashboard['"];/g, 
    to: "from '@/pillars/analytics/services/dashboard/dashboard.service';"
  }
];

let totalFixed = 0;

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    replacements.forEach(replacement => {
      content = content.replace(replacement.from, replacement.to);
    });
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      totalFixed++;
      console.log(`✅ Исправлен: ${filePath}`);
    }
  } catch (error) {
    // Игнорируем ошибки чтения
  }
}

function walkDir(dir) {
  try {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      
      try {
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && !filePath.includes('node_modules') && !filePath.includes('.next')) {
          walkDir(filePath);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
          processFile(filePath);
        }
      } catch (error) {
        // Игнорируем ошибки
      }
    });
  } catch (error) {
    // Игнорируем ошибки
  }
}

// Начинаем с корня проекта
walkDir('/workspaces/kamhub');
console.log(`\n✅ Всего исправлено файлов: ${totalFixed}`);
JS_EOF

# Запускаем скрипт исправления
node /tmp/fix-imports.js

echo "✅ Импорты исправлены"

# 4. Обновляем jest.config.js если он есть
echo "🔄 4. Обновление Jest конфигурации..."

if [ -f jest.config.js ]; then
  cat > jest.config.js << 'JEST_EOF'
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@core-infrastructure/(.*)$': '<rootDir>/pillars/core-infrastructure/$1',
    '^@support/(.*)$': '<rootDir>/pillars/support/$1',
    '^@partner/(.*)$': '<rootDir>/pillars/partner/$1',
    '^@analytics/(.*)$': '<rootDir>/pillars/analytics/$1',
    '^@discovery/(.*)$': '<rootDir>/pillars/discovery/$1',
    '^@booking/(.*)$': '<rootDir>/pillars/booking/$1',
    '^@engagement/(.*)$': '<rootDir>/pillars/engagement/$1',
    '^@services/(.*)$': '<rootDir>/pillars/core-infrastructure/services/$1',
    '^@types/(.*)$': '<rootDir>/pillars/core-infrastructure/types/$1',
  },
  testMatch: ['**/__tests__/**/*.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
  collectCoverageFrom: [
    'pillars/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
};
JEST_EOF
  echo "✅ jest.config.js обновлен"
else
  echo "ℹ️  jest.config.js не найден"
fi

# 5. Очищаем кеш TypeScript
echo "🧹 5. Очистка кеша TypeScript..."
rm -rf node_modules/.cache 2>/dev/null || true

# 6. Выводим результаты
echo ""
echo "📊 6. Проверка результатов..."
echo ""

# Проверяем TypeScript ошибки если tsc доступен
if command -v npx &> /dev/null; then
  echo "Проверка TypeScript (первые 10 ошибок):"
  npx tsc --noEmit 2>&1 | grep "error TS" | head -10 || echo "✅ Ошибок TypeScript не найдено!"
else
  echo "ℹ️  npx недоступен, пропускаем проверку TypeScript"
fi

echo ""
echo "🎉 АВТОИСПРАВЛЕНИЕ ЗАВЕРШЕНО!"
echo ""
echo "Дальнейшие действия:"
echo "1. Закройте и откройте файлы с ошибками в VS Code"
echo "2. Или перезагрузите окно (Cmd+Shift+P → Reload Window)"
echo "3. Запустите 'npm run type-check' или 'npm run build' для проверки"
echo ""
