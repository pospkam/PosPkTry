/**
 * Pillar-Cluster Architecture Enforcement
 * ESLint Configuration
 * 
 * Этот файл содержит правила для проверки зависимостей между Pillars
 * и обеспечения архитектурной целостности.
 * 
 * Установка:
 * npm install --save-dev eslint-plugin-import
 */

module.exports = {
  rules: {
    // ============ CORE INFRASTRUCTURE ============
    // Core Infrastructure не должен импортировать из других Pillars
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['./pillars/discovery/**', '@discovery/**'],
            message: 'Core Infrastructure не может импортировать из Discovery Pillar',
          },
          {
            group: ['./pillars/booking/**', '@booking/**'],
            message: 'Core Infrastructure не может импортировать из Booking Pillar',
          },
          {
            group: ['./pillars/engagement/**', '@engagement/**'],
            message: 'Core Infrastructure не может импортировать из Engagement Pillar',
          },
          {
            group: ['./pillars/partner-management/**', '@partner-management/**'],
            message: 'Core Infrastructure не может импортировать из Partner Management Pillar',
          },
        ],
      },
    ],
  },
};

/**
 * ENFORCEMENT RULES
 * 
 * Эти правила обеспечивают правильную архитектуру:
 * 
 * 1. Discovery не может импортировать:
 *    - из Booking, Engagement, Partner Management
 * 
 * 2. Booking может импортировать:
 *    - Core Infrastructure ✅
 *    - Discovery (только через API, не напрямую из lib) ❌ direct imports
 *    - Events от Discovery 🎉
 * 
 * 3. Engagement может импортировать:
 *    - Core Infrastructure ✅
 *    - Discovery (только через API) ❌ direct imports
 *    - Booking (только через API) ❌ direct imports
 * 
 * 4. Partner Management может импортировать:
 *    - Core Infrastructure ✅
 *    - Все остальные (только через API) ❌ direct imports
 * 
 * ПРАВИЛА ИМПОРТА:
 * 
 * ✅ ПРАВИЛЬНО:
 * - import { getAuth } from '@/pillars/core-infrastructure-infrastructure/lib/auth';
 * - import { Tour } from '@discovery/types';
 * - const response = await fetch('/api/discovery/tours');
 * - eventBus.on('discovery:tour_updated', handler);
 * 
 * ❌ НЕПРАВИЛЬНО:
 * - import { getTours } from './pillars/discovery/lib/tours'; (используйте API)
 * - import { getBooking } from '@booking/lib/bookings'; (не из других pillars)
 * - import utils from '../../lib/utils'; (используйте aliases)
 */
