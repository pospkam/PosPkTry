import { z } from 'zod';

/**
 * Centralized environment variable validation.
 *
 * Required vars will cause a startup error if missing.
 * Optional vars fall back to sensible defaults or empty strings.
 *
 * Usage:
 *   import { env } from '@/lib/env';
 *   const dbUrl = env.DATABASE_URL;
 */

const envSchema = z.object({
  // ── Core / Application ────────────────────────────────────────────
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.string().optional().default('3000'),
  NEXT_PUBLIC_APP_URL: z.string().optional().default('https://tourhab.ru'),
  NEXT_PUBLIC_API_URL: z.string().optional().default(''),

  // ── Database (PostgreSQL) ─────────────────────────────────────────
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_SSL: z.string().optional().default('false'),
  DATABASE_MAX_CONNECTIONS: z.string().optional().default('20'),
  DATABASE_CONNECTION_TIMEOUT: z.string().optional().default('2000'),
  DATABASE_IDLE_TIMEOUT: z.string().optional().default('30000'),

  // ── Auth (JWT) ────────────────────────────────────────────────────
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_EXPIRES_IN: z.string().optional().default('7d'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().optional().default('30d'),

  // ── Timeweb Cloud ─────────────────────────────────────────────────
  TIMEWEB_TOKEN: z.string().optional().default(''),
  TIMEWEB_TOKEN1: z.string().optional().default(''),
  TIMEWEB_API_TOKEN: z.string().optional().default(''),
  TIMEWEB_AI_KB_ID: z.string().optional().default(''),

  // ── AI Providers ──────────────────────────────────────────────────
  DEEPSEEK_API_KEY: z.string().optional().default(''),
  MINIMAX_API_KEY: z.string().optional().default(''),
  XAI_API_KEY: z.string().optional().default(''),
  OPENROUTER_API_KEY: z.string().optional().default(''),
  OPENROUTER_MANAGEMENT_KEY: z.string().optional().default(''), // for balance check via /api/v1/credits
  ANTHROPIC_API_KEY: z.string().optional().default(''),
  AI_MAX_TOKENS: z.string().optional().default('800'),
  AI_DAILY_BUDGET_USD: z.string().optional().default('10.0'),

  // ── Telegram ──────────────────────────────────────────────────────
  // @KuzmichKam_bot — public bot (AI chat, booking buttons, channel posts)
  TELEGRAM_BOT_TOKEN:            z.string().optional().default(''),
  TELEGRAM_CHAT_ID:              z.string().optional().default(''), // admin group chat
  TELEGRAM_FISHING_CHAT_ID:      z.string().optional().default(''), // operator auth chat
  TELEGRAM_WEBHOOK_SECRET:       z.string().optional().default(''),
  TELEGRAM_CHANNEL_ID:           z.string().optional().default(''), // public channel
  TELEGRAM_LEADS_CHAT_ID:        z.string().optional().default(''), // diagnostic only
  // @tourhab_bot — owner-only admin bot (digest, SOS, board initiatives)
  TELEGRAM_ADMIN_BOT_TOKEN:      z.string().optional().default(''),
  TELEGRAM_OWNER_ID:             z.string().optional().default(''), // numeric Telegram user ID
  TELEGRAM_ADMIN_CHAT_ID:        z.string().optional().default(''), // SOS alerts
  // Login Widget — set bot @username only after /setdomain tourhab.ru in BotFather
  NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: z.string().optional().default(''),

  // ── Email (SMTP) ──────────────────────────────────────────────────
  SMTP_HOST: z.string().optional().default('smtp.gmail.com'),
  SMTP_PORT: z.string().optional().default('587'),
  SMTP_SECURE: z.string().optional().default('false'),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  SMTP_FROM: z.string().optional().default(''),
  EMAIL_FROM: z.string().optional().default('noreply@tourhab.ru'),

  // ── SMS ───────────────────────────────────────────────────────────
  SMS_RU_API_KEY: z.string().optional().default(''),

  // ── Payments ──────────────────────────────────────────────────────
  CLOUDPAYMENTS_API_SECRET: z.string().optional().default(''),
  NEXT_PUBLIC_CLOUDPAYMENTS_PUBLIC_ID: z.string().optional().default(''),
  YANDEX_PAYMENT_SHOP_ID: z.string().optional().default(''),
  YANDEX_PAYMENT_SECRET_KEY: z.string().optional().default(''),
  STRIPE_SECRET_KEY: z.string().optional().default(''),
  STRIPE_PUBLISHABLE_KEY: z.string().optional().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(''),
  PLATFORM_COMMISSION_RATE: z.string().optional().default('0.15'),

  // ── Maps / Geocoding ──────────────────────────────────────────────
  NEXT_PUBLIC_YANDEX_MAPS_API_KEY: z.string().optional().default(''),
  YANDEX_MAPS_API_KEY: z.string().optional().default(''),

  // ── Weather ───────────────────────────────────────────────────────
  OPENWEATHERMAP_API_KEY: z.string().optional().default(''),
  WEATHERAPI_KEY: z.string().optional().default(''),
  YANDEX_WEATHER_API_KEY: z.string().optional().default(''),

  // ── File Storage / S3 ─────────────────────────────────────────────
  FILE_MAX_SIZE: z.string().optional().default('10485760'),
  FILE_UPLOAD_PATH: z.string().optional().default('/uploads'),
  CDN_URL: z.string().optional().default(''),
  S3_ACCESS_KEY: z.string().optional().default(''),
  S3_SECRET_KEY: z.string().optional().default(''),
  S3_ENDPOINT: z.string().optional().default('https://s3.twcstorage.ru'),
  S3_BUCKET: z.string().optional().default(''),
  S3_REGION: z.string().optional().default('ru-1'),

  // ── Redis ─────────────────────────────────────────────────────────
  REDIS_URL: z.string().optional().default(''),
  REDIS_PASSWORD: z.string().optional().default(''),
  REDIS_DB: z.string().optional().default('0'),
  UPSTASH_REDIS_REST_URL: z.string().optional().default(''),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional().default(''),

  // ── Partners ──────────────────────────────────────────────────────
  KAMCHATKA_FISHING_API_KEY: z.string().optional().default(''),
  KAMCHATKA_FISHING_API_SECRET: z.string().optional().default(''),

  // ── Safety (MCHS) ────────────────────────────────────────────────
  MCHS_API_URL: z.string().optional().default(''),
  MCHS_API_TOKEN: z.string().optional().default(''),

  // ── External Services ─────────────────────────────────────────────
  CRON_SECRET: z.string().optional().default(''),          // protects /api/cron/* endpoints
  CREWAI_API_URL: z.string().optional().default('http://localhost:8001'),
  WEBHOOK_SECRET: z.string().optional().default(''),
  KNOWLEDGE_BASE_SOURCE_URLS: z.string().optional().default(''),
  MARKDOWN_NEW_ENDPOINT: z.string().optional().default(''),

  // ── Monitoring ────────────────────────────────────────────────────
  PROMETHEUS_ENABLED: z.string().optional().default('false'),
  PROMETHEUS_PORT: z.string().optional().default('9090'),

  // ── CORS ──────────────────────────────────────────────────────────
  CORS_ORIGIN: z.string().optional().default('http://localhost:3000'),

  // ── Analytics / SEO ───────────────────────────────────────────────
  GOOGLE_ANALYTICS_ID: z.string().optional().default(''),
  YANDEX_METRIKA_ID: z.string().optional().default(''),
  NEXT_PUBLIC_YANDEX_METRIKA_ID: z.string().optional().default(''),
  GOOGLE_SITE_VERIFICATION: z.string().optional().default(''),
  YANDEX_VERIFICATION: z.string().optional().default(''),

  // ── Development Flags ─────────────────────────────────────────────
  MOCK_DATA: z.string().optional().default('false'),
  VERBOSE_LOGGING: z.string().optional().default('false'),
});

export type Env = z.infer<typeof envSchema>;

let _cached: Env | null = null;

/**
 * Lazily validates and returns environment variables.
 * First call parses process.env; subsequent calls return cached result.
 * Throws with clear diagnostics if required vars are missing.
 */
export function getEnv(): Env {
  if (_cached) return _cached;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.format();
    const missing: string[] = [];

    for (const [key, value] of Object.entries(formatted)) {
      if (key === '_errors') continue;
      const fieldErrors = value as { _errors?: string[] };
      if (fieldErrors._errors && fieldErrors._errors.length > 0) {
        missing.push(`  ${key}: ${fieldErrors._errors.join(', ')}`);
      }
    }

    throw new Error(
      [
        '',
        '=== Environment Validation Failed ===',
        '',
        'The following environment variables have issues:',
        ...missing,
        '',
        'Check your .env.local file or deployment environment.',
        '=====================================',
        '',
      ].join('\n')
    );

    throw new Error(
      `Missing or invalid environment variables: ${missing.map((m) => m.trim()).join('; ')}`
    );
  }

  _cached = result.data;
  return _cached;
}

/** @deprecated Use getEnv() for lazy validation. This re-export kept for backward compat. */
export const envSchema_ = envSchema;
