// Timeweb Cloud Configuration
// Создайте этот файл как .env на сервере

module.exports = {
  // DATABASE - Timeweb PostgreSQL
  DATABASE_URL: 'postgresql://gen_user:q;3U+PY7XCz@Br@51e6e5ca5d967b8e81fc9b75.twc1.net:5432/default_db?sslmode=verify-full',
  DATABASE_SSL: true,
  DATABASE_HOST: '51e6e5ca5d967b8e81fc9b75.twc1.net',
  DATABASE_PORT: 5432,
  DATABASE_NAME: 'default_db',
  DATABASE_USER: 'gen_user',
  DATABASE_PASSWORD: 'q;3U+PY7XCz@Br',

  // ALTERNATIVE DATABASE URL (with public IP)
  DATABASE_URL_PUBLIC: 'postgresql://gen_user:q;3U+PY7XCz@Br@45.8.96.120:5432/default_db',

  // TIMEWEB API
  TIMEWEB_API_TOKEN: 'eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCIsImtpZCI6IjFrYnhacFJNQGJSI0tSbE1xS1lqIn0.eyJ1c2VyIjoicGE0MjIxMDgiLCJ0eXBlIjoiYXBpX2tleSIsImFwaV9rZXlfaWQiOiI0MmZmZTY1MC02OWI4LTRmZmQtYTFkOC02OWRkMjMwM2QyY2MiLCJpYXQiOjE3NjE3ODUzNDl9.SFHpwgy9kr-EH2CwN6K1REkOl7KCpiUnMk5ivTRljEaWl8iE-B-BMjaJxaFhpdB2dqcb33ky2oyfwxkU1Sszrbo-8UINnFO5SothY4P6WC8kSSHxFlLI2i0xGCa3YzgyYZ1Wgn2a0jf__ZcyZi7ZsaJkuold9NAeeGCCrAUbdVsr39-fLDL_EKh0iekq_tuO59f_BCmg7Poe7xKlmNYzu2hy3GnfNp3ueKW52H6kFkGwibixS3tWKCHkPpyTAjRztWKCnDZOOG6xDk4sSiPPMlZOEfFzzkpKkizQ9CykBC06SXwmT2uPRR2NyZJIY-PZd4AVZ34H1jXQ-NGquRPi_aYiywt3LtOVDRarpVErBdk6I0qO0Yf33zICvMN-yFpXuY_oSlE8v3C-02XHnYLsMXcHTsUB4ISkJrhglBkv-hTzuiQxwAEZp0eHOEq8YNz6qOLU3RcaNgg0DWGXMDrMzObYx2NknrZUCMbRFftIU-C1Ilo8Ayy98MwI3J77X62p',
  TIMEWEB_SERVER_ID: '1735784',

  // TIMEWEB AI AGENTS
  TIMEWEB_AI_AGENT_ID: '3933ea81-05e2-470e-80de-80dc67c1101f',
  TIMEWEB_AI_AGENT_URL: 'https://agent.timeweb.cloud/api/v1/cloud-ai/agents/3933ea81-05e2-470e-80de-80dc67c1101f/v1',

  // S3 STORAGE (TIMEWEB)
  S3_ENDPOINT: 'https://s3.twcstorage.ru',
  S3_BUCKET: 'd9542536-676ee691-7f59-46bb-bf0e-ab64230eec50',
  S3_ACCESS_KEY: 'F2CP4X3X17GVQ1YH5I5D',
  S3_SECRET_KEY: '72iAsYR4QQCIdaDI9e9AzXnzVvvP8bvPELmrBVzX',
  S3_REGION: 'ru-1',

  // SWIFT STORAGE (TIMEWEB)
  SWIFT_ENDPOINT: 'https://swift.twcstorage.ru',
  SWIFT_ACCESS_KEY: 'pa422108:swift',
  SWIFT_SECRET_KEY: 'D7Chc5DqTHtC5pQhEHaQVrkoBOZzanUHGaujCvOw',
  SWIFT_REGION: 'ru-1',

  // APPLICATION
  NODE_ENV: 'production',
  NEXT_PUBLIC_API_URL: 'https://kamhub.ru',
  PORT: 3000,

  // AUTHENTICATION
  JWT_SECRET: 'KamHub_Super_Secret_Key_2025_Production_XYZ123',
  JWT_EXPIRES_IN: '7d',

  // MONITORING
  PROMETHEUS_NODE_EXPORTER: 'http://192.168.0.4:9100',
  PROMETHEUS_POSTGRES_EXPORTER: 'http://192.168.0.4:9308'
};


