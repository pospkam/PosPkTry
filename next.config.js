/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  // Игнорировать ESLint во время сборки
  eslint: {
    ignoreDuringBuilds: true,
  },

  // unoptimized: убирает sharp/@img (~33MB) из standalone — критично для Timeweb лимита 50MB
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },

  // Исключить dev-пакеты из standalone (экономит ~45MB)
  experimental: {
    outputFileTracingExcludes: {
      '*': [
        'node_modules/typescript/**',
        'node_modules/caniuse-lite/**',
        'node_modules/@swc/core/**',
        'node_modules/sharp/**',
        'node_modules/@img/**',
      ],
    },
  },

  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '',
  },

  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    return config;
  },
}

module.exports = nextConfig