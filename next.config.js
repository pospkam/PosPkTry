/** @type {import('next').NextConfig} */
const nextConfig = {
  // Включить React Strict Mode
  reactStrictMode: true,
  
  // Игнорировать ошибки TypeScript и ESLint при сборке
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Оптимизация изображений
  images: {
    domains: [
      's3.twcstorage.ru',
      'kamhub.ru',
      'www.kamhub.ru',
      'localhost',
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1 год
  },

  // CDN и статические файлы
  assetPrefix: process.env.NODE_ENV === 'production' 
    ? process.env.CDN_URL 
    : undefined,

  // Заголовки для безопасности и кеширования
  async headers() {
    return [
      // Cache для статических файлов
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Security headers
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.coverr.co https://unpkg.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://api.openweathermap.org https://api.groq.com",
              "media-src 'self' https://cdn.coverr.co",
              "frame-src 'self'",
            ].join('; '),
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
        ],
      },
    ];
  },

  // Игнорировать ESLint и TypeScript ошибки при сборке
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // Сжатие
  compress: true,

  // Webpack конфигурация
  webpack: (config, { isServer }) => {
    // Игнорировать предупреждения о размере бандла для определенных пакетов
    config.externals = config.externals || [];
    
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },

  // Переменные окружения для клиента
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    NEXT_PUBLIC_CDN_URL: process.env.NEXT_PUBLIC_CDN_URL || '',
  },

  // Experimental features
  experimental: {
    // Оптимизация пакетов
    optimizePackageImports: ['@/components', '@/lib'],
  },

  // Production optimizations
  ...(process.env.NODE_ENV === 'production' && {
    // Удаление console.log в production
    compiler: {
      removeConsole: {
        exclude: ['error', 'warn'],
      },
    },
  }),
};


module.exports = nextConfig;
