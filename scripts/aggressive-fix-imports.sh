#!/bin/bash

echo "🔧 Агрессивное исправление импортов KamHub"
echo "==========================================="
echo "Дата: $(date)"
echo ""

cd /workspaces/kamhub

# Создаем Node.js скрипт для замены импортов
cat > /tmp/aggressive-fix-imports.js << 'JS_EOF'
const fs = require('fs');
const path = require('path');

// Все замены импортов
const replacements = [
  // ===== ПОДДЕРЖКА =====
  // Старые @support-pillar заменяем на @support
  { 
    from: /from ['"]@support-pillar\/services([^'"]*)['"]/g, 
    to: "from '@/pillars/support/services$1'"
  },
  { 
    from: /from ['"]@support-pillar\/types([^'"]*)['"]/g, 
    to: "from '@/pillars/support/types$1'"
  },
  { 
    from: /from ['"]@support-pillar\/lib([^'"]*)['"]/g, 
    to: "from '@/pillars/support/lib$1'"
  },
  { 
    from: /from ['"]@support-pillar([^'"]*)['"]/g, 
    to: "from '@/pillars/support$1'"
  },
  
  // Поддержка с правильными путями
  { 
    from: /from ['"]@support\/services\/([^'"]+)['"]/g, 
    to: "from '@/pillars/support/services/$1'"
  },
  { 
    from: /from ['"]@support\/types\/([^'"]+)['"]/g, 
    to: "from '@/pillars/support/types/$1'"
  },

  // ===== БРОНИРОВАНИЕ =====
  { 
    from: /from ['"]@booking-pillar\/services([^'"]*)['"]/g, 
    to: "from '@/pillars/booking/services$1'"
  },
  { 
    from: /from ['"]@booking-pillar\/types([^'"]*)['"]/g, 
    to: "from '@/pillars/booking/types$1'"
  },
  { 
    from: /from ['"]@booking-pillar\/lib([^'"]*)['"]/g, 
    to: "from '@/pillars/booking/lib$1'"
  },
  { 
    from: /from ['"]@booking-pillar([^'"]*)['"]/g, 
    to: "from '@/pillars/booking$1'"
  },

  // ===== АНАЛИТИКА =====
  { 
    from: /from ['"]@analytics-pillar\/services([^'"]*)['"]/g, 
    to: "from '@/pillars/analytics/services$1'"
  },
  { 
    from: /from ['"]@analytics-pillar\/types([^'"]*)['"]/g, 
    to: "from '@/pillars/analytics/types$1'"
  },
  { 
    from: /from ['"]@analytics-pillar\/lib([^'"]*)['"]/g, 
    to: "from '@/pillars/analytics/lib$1'"
  },
  { 
    from: /from ['"]@analytics-pillar([^'"]*)['"]/g, 
    to: "from '@/pillars/analytics$1'"
  },

  // ===== ОТКРЫТИЕ =====
  { 
    from: /from ['"]@discovery-pillar\/services([^'"]*)['"]/g, 
    to: "from '@/pillars/discovery/services$1'"
  },
  { 
    from: /from ['"]@discovery-pillar\/types([^'"]*)['"]/g, 
    to: "from '@/pillars/discovery/types$1'"
  },
  { 
    from: /from ['"]@discovery-pillar\/lib([^'"]*)['"]/g, 
    to: "from '@/pillars/discovery/lib$1'"
  },
  { 
    from: /from ['"]@discovery-pillar([^'"]*)['"]/g, 
    to: "from '@/pillars/discovery$1'"
  },

  // ===== ПАРТНЕРЫ =====
  { 
    from: /from ['"]@partner-pillar\/services([^'"]*)['"]/g, 
    to: "from '@/pillars/partner/services$1'"
  },
  { 
    from: /from ['"]@partner-pillar\/types([^'"]*)['"]/g, 
    to: "from '@/pillars/partner/types$1'"
  },
  { 
    from: /from ['"]@partner-pillar\/lib([^'"]*)['"]/g, 
    to: "from '@/pillars/partner/lib$1'"
  },
  { 
    from: /from ['"]@partner-pillar([^'"]*)['"]/g, 
    to: "from '@/pillars/partner$1'"
  },

  // ===== ВОВЛЕЧЕНИЕ =====
  { 
    from: /from ['"]@engagement-pillar\/services([^'"]*)['"]/g, 
    to: "from '@/pillars/engagement/services$1'"
  },
  { 
    from: /from ['"]@engagement-pillar\/types([^'"]*)['"]/g, 
    to: "from '@/pillars/engagement/types$1'"
  },
  { 
    from: /from ['"]@engagement-pillar\/lib([^'"]*)['"]/g, 
    to: "from '@/pillars/engagement/lib$1'"
  },
  { 
    from: /from ['"]@engagement-pillar([^'"]*)['"]/g, 
    to: "from '@/pillars/engagement$1'"
  },

  // ===== CORE =====
  { 
    from: /from ['"]@core\/auth([^'"]*)['"]/g, 
    to: "from '@/pillars/core-infrastructure/services/auth$1'"
  },
  { 
    from: /from ['"]@core\/services([^'"]*)['"]/g, 
    to: "from '@/pillars/core-infrastructure/services$1'"
  },
  { 
    from: /from ['"]@core\/types([^'"]*)['"]/g, 
    to: "from '@/pillars/core-infrastructure/types$1'"
  },
  { 
    from: /from ['"]@core\/lib([^'"]*)['"]/g, 
    to: "from '@/pillars/core-infrastructure/lib$1'"
  },
  { 
    from: /from ['"]@core([^'"]*)['"]/g, 
    to: "from '@/pillars/core-infrastructure$1'"
  },

  // ===== ОТНОСИТЕЛЬНЫЕ ПУТИ =====
  // ../../../pillars/support-pillar -> @/pillars/support
  { 
    from: /from ['"]\.\.\/\.\.\/\.\.\/pillars\/support-pillar\/services\/([^'"]+)['"]/g, 
    to: "from '@/pillars/support/services/$1'"
  },
  { 
    from: /from ['"]\.\.\/\.\.\/\.\.\/pillars\/support-pillar\/([^'"]+)['"]/g, 
    to: "from '@/pillars/support/$1'"
  },
  { 
    from: /from ['"]\.\.\/\.\.\/\.\.\/pillars\/booking-pillar\/services\/([^'"]+)['"]/g, 
    to: "from '@/pillars/booking/services/$1'"
  },
  { 
    from: /from ['"]\.\.\/\.\.\/\.\.\/pillars\/booking-pillar\/([^'"]+)['"]/g, 
    to: "from '@/pillars/booking/$1'"
  },
  { 
    from: /from ['"]\.\.\/\.\.\/\.\.\/pillars\/analytics-pillar\/services\/([^'"]+)['"]/g, 
    to: "from '@/pillars/analytics/services/$1'"
  },
  { 
    from: /from ['"]\.\.\/\.\.\/\.\.\/pillars\/analytics-pillar\/([^'"]+)['"]/g, 
    to: "from '@/pillars/analytics/$1'"
  },
  { 
    from: /from ['"]\.\.\/\.\.\/\.\.\/lib\/validation\/([^'"]+)['"]/g, 
    to: "from '@/lib/validation/$1'"
  },

  // ===== ОБЩИЕ ПУТИ =====
  { 
    from: /from ['"]\.\.\/services\/([^'"]+)['"]/g, 
    to: "from '@/pillars/$PILLAR/services/$1'"
  },
];

let totalFixed = 0;

function getModulePillar(filePath) {
  // Определяем pillard по расположению файла
  if (filePath.includes('/pillars/support')) return 'support';
  if (filePath.includes('/pillars/booking')) return 'booking';
  if (filePath.includes('/pillars/analytics')) return 'analytics';
  if (filePath.includes('/pillars/discovery')) return 'discovery';
  if (filePath.includes('/pillars/partner')) return 'partner';
  if (filePath.includes('/pillars/engagement')) return 'engagement';
  if (filePath.includes('/pillars/core-infrastructure')) return 'core-infrastructure';
  if (filePath.includes('/app/api')) {
    const parts = filePath.split('/');
    const apiIdx = parts.indexOf('api');
    if (apiIdx + 1 < parts.length) {
      const section = parts[apiIdx + 1];
      if (section.includes('support')) return 'support';
      if (section.includes('booking')) return 'booking';
      if (section.includes('analytics')) return 'analytics';
      if (section.includes('discovery')) return 'discovery';
      if (section.includes('partner')) return 'partner';
      if (section.includes('engagement')) return 'engagement';
    }
  }
  return 'core-infrastructure';
}

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    const pillar = getModulePillar(filePath);
    
    replacements.forEach(replacement => {
      let pattern = replacement.from;
      let newStr = replacement.to.replace('$PILLAR', pillar);
      content = content.replace(pattern, newStr);
    });
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      totalFixed++;
      console.log(`✅ ${filePath}`);
    }
  } catch (error) {
    // Игнорируем ошибки
  }
}

function walkDir(dir) {
  try {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      
      try {
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && !filePath.includes('node_modules') && !filePath.includes('.next') && !filePath.includes('.git')) {
          walkDir(filePath);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
          processFile(filePath);
        }
      } catch (error) {
        // Игнорируем
      }
    });
  } catch (error) {
    // Игнорируем
  }
}

console.log('🔄 Исправляем все импорты...\n');
walkDir('/workspaces/kamhub');
console.log(`\n✅ Всего исправлено файлов: ${totalFixed}`);
JS_EOF

node /tmp/aggressive-fix-imports.js

echo ""
echo "📊 Проверка TypeScript..."
npx tsc --noEmit 2>&1 | grep -c "error TS" || echo "0 errors"
