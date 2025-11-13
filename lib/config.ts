// Конфигурация приложения Kamchatour Hub

export const config = {
  // Основные настройки
  app: {
    name: 'Kamchatour Hub',
    version: '1.0.0',
    description: 'Современная туристическая платформа для Камчатского края',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    environment: process.env.NODE_ENV || 'development',
    debug: process.env.NODE_ENV === 'development',
  },

  // Настройки базы данных
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/kamchatour',
    ssl: process.env.DATABASE_SSL === 'true',
    maxConnections: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '20'),
    connectionTimeout: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '2000'),
    idleTimeout: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '30000'),
  },

  // Настройки AI
  ai: {
    timeweb: {
      primaryAgent: {
        id: process.env.TIMEWEB_AI_AGENT_ID || '3933ea81-05e2-470e-80de-80dc67c1101f',
        url: 'https://agent.timeweb.cloud/api/v1/cloud-ai/agents/3933ea81-05e2-470e-80de-80dc67c1101f/v1',
        name: 'Основной AI агент',
      },
      secondaryAgent: {
        id: '14289',
        url: 'https://agent.timeweb.cloud/api/v1/cloud-ai/agents/14289/v1',
        name: 'Вторичный AI агент',
      },
      timeout: 30000,
      maxTokens: parseInt(process.env.AI_MAX_TOKENS || '4000'),
      knowledgeBase: {
        enabled: true,
        updateEndpoint: 'https://api.timeweb.cloud/v1/cloud-ai/knowledge-base',
        maxDocuments: 100,
        chunkSize: 1000,
      },
    },
    groq: {
      apiKey: process.env.GROQ_API_KEY || '',
      baseUrl: 'https://api.groq.com/openai/v1',
      model: 'llama-3.1-70b-versatile',
      maxTokens: parseInt(process.env.AI_MAX_TOKENS || '4000'),
      temperature: 0.7,
      timeout: 30000,
    },
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      baseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-chat',
      maxTokens: parseInt(process.env.AI_MAX_TOKENS || '4000'),
      temperature: 0.7,
      timeout: 30000,
    },
    openrouter: {
      apiKey: process.env.OPENROUTER_API_KEY || '',
      baseUrl: 'https://openrouter.ai/api/v1',
      model: 'meta-llama/llama-3.1-70b-instruct',
      maxTokens: parseInt(process.env.AI_MAX_TOKENS || '4000'),
      temperature: 0.7,
      timeout: 30000,
    },
    dailyBudget: parseFloat(process.env.AI_DAILY_BUDGET_USD || '10.0'),
  },

  // Настройки аутентификации
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
    passwordMinLength: 8,
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 минут
  },

  // Настройки файлов
  files: {
    maxSize: parseInt(process.env.FILE_MAX_SIZE || '10485760'), // 10MB
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
      'text/plain',
    ],
    uploadPath: process.env.FILE_UPLOAD_PATH || '/uploads',
    cdnUrl: process.env.CDN_URL || '',
  },

  // Настройки карт
  maps: {
    yandex: {
      apiKey: process.env.YANDEX_MAPS_API_KEY || '',
      baseUrl: 'https://api-maps.yandex.ru/2.1',
    },
    openstreetmap: {
      baseUrl: 'https://nominatim.openstreetmap.org',
      userAgent: 'Kamchatour Hub/1.0',
    },
  },

  // Настройки погоды
  weather: {
    openMeteo: {
      baseUrl: 'https://api.open-meteo.com/v1',
      timeout: 10000,
    },
    openWeatherMap: {
      apiKey: process.env.OPENWEATHERMAP_API_KEY || '',
      baseUrl: 'https://api.openweathermap.org/data/2.5',
      timeout: 10000,
    },
    weatherApi: {
      apiKey: process.env.WEATHERAPI_KEY || '',
      baseUrl: 'https://api.weatherapi.com/v1',
      timeout: 10000,
    },
    yandex: {
      apiKey: process.env.YANDEX_WEATHER_API_KEY || '',
      baseUrl: 'https://api.weather.yandex.ru/v2',
      timeout: 10000,
    },
    cacheTimeout: 30 * 60 * 1000, // 30 минут
    defaultProvider: 'yandex', // 'openMeteo' | 'openWeatherMap' | 'weatherApi' | 'yandex' - Используем Yandex для максимальной точности на Камчатке
  },

  // Настройки платежей
  payments: {
    yandex: {
      shopId: process.env.YANDEX_PAYMENT_SHOP_ID || '',
      secretKey: process.env.YANDEX_PAYMENT_SECRET_KEY || '',
      baseUrl: 'https://api.yookassa.ru/v3',
    },
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY || '',
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    },
  },

  // Настройки уведомлений
  notifications: {
    email: {
      smtp: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || '',
        },
      },
      from: process.env.EMAIL_FROM || 'noreply@kamchatour.ru',
    },
    sms: {
      smsRu: {
        apiId: process.env.SMS_RU_API_ID || '',
        baseUrl: 'https://sms.ru/sms/send',
      },
    },
    telegram: {
      botToken: process.env.TELEGRAM_BOT_TOKEN || '',
      chatId: process.env.TELEGRAM_CHAT_ID || '',
    },
  },

  // Настройки кэширования
  cache: {
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      password: process.env.REDIS_PASSWORD || '',
      db: parseInt(process.env.REDIS_DB || '0'),
    },
    defaultTTL: 3600, // 1 час
    maxTTL: 86400, // 24 часа
  },

  // Настройки мониторинга
  monitoring: {
    sentry: {
      dsn: process.env.SENTRY_DSN || '',
      environment: process.env.NODE_ENV || 'development',
    },
    prometheus: {
      enabled: process.env.PROMETHEUS_ENABLED === 'true',
      port: parseInt(process.env.PROMETHEUS_PORT || '9090'),
    },
  },

  // Настройки безопасности
  security: {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
      credentials: true,
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 минут
      max: 100, // максимум 100 запросов с одного IP
    },
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https://api.groq.com", "https://api.deepseek.com"],
        },
      },
    },
  },

  // Настройки разработки
  development: {
    hotReload: process.env.NODE_ENV === 'development',
    mockData: process.env.MOCK_DATA === 'true',
    verboseLogging: process.env.VERBOSE_LOGGING === 'true',
  },

  // Настройки продакшена
  production: {
    compression: true,
    minify: true,
    sourceMaps: false,
    analytics: {
      googleAnalytics: process.env.GOOGLE_ANALYTICS_ID || '',
      yandexMetrika: process.env.YANDEX_METRIKA_ID || '',
    },
  },
};

// Валидация конфигурации
export function validateConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Проверяем обязательные переменные окружения
  if (!config.database.url) {
    errors.push('DATABASE_URL is required');
  }

  if (!config.auth.jwtSecret || config.auth.jwtSecret === 'your-secret-key') {
    errors.push('JWT_SECRET must be set to a secure value');
  }

  if (config.app.environment === 'production') {
    if (!config.ai.groq.apiKey) {
      errors.push('GROQ_API_KEY is required in production');
    }
    
    if (!config.maps.yandex.apiKey) {
      errors.push('YANDEX_MAPS_API_KEY is required in production');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Получение конфигурации для клиента (без секретов)
export function getClientConfig() {
  return {
    app: {
      name: config.app.name,
      version: config.app.version,
      environment: config.app.environment,
    },
    maps: {
      yandex: {
        apiKey: config.maps.yandex.apiKey,
      },
    },
    payments: {
      stripe: {
        publishableKey: config.payments.stripe.publishableKey,
      },
    },
    monitoring: {
      sentry: {
        dsn: config.monitoring.sentry.dsn,
        environment: config.monitoring.sentry.environment,
      },
    },
  };
}