# Deploy Checklist -- Timeweb Cloud Apps

## Pre-deploy

- [x] `npm run build` prohodit s `JWT_SECRET=dummy-secret`
- [x] `npm run lint` -- net novyh oshibok
- [x] `package.json` start command: `next start -p ${PORT:-3000}`
- [x] `next.config.js` output: `standalone`
- [x] Middleware: Upstash Redis opcionalnyj (ne padaet bez klyuchej)
- [x] Vse `localhost:3000` ssylki -- cherez `process.env` s fallback
- [x] `.env.local.example` -- obnovlen s [REQUIRED] pometkami
- [x] `robots.txt` -- v public/
- [x] Service Worker -- v public/sw.js

## Timeweb nastrojki

### Nastrojki sborki
```
Build command:  npm run build
Start command:  npm start
Node version:   20
```

### Obyazatelnye peremennye [REQUIRED]

| Peremennaya | Znacheniye | Kak poluchit' |
|-------------|-----------|---------------|
| `DATABASE_URL` | `postgresql://...@8ad609fcbfd2ad0bd069be47.twc1.net/...` | Uzhe est' v Timeweb DB |
| `DATABASE_SSL` | `true` | Vsegda true na Timeweb |
| `JWT_SECRET` | 64-hex stroka | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NEXTAUTH_SECRET` | 64-hex stroka | Ta zhe komanda |
| `NEXTAUTH_URL` | `https://tvoy-domen.ru` | Domen iz Timeweb |
| `NODE_ENV` | `production` | Vsegda production |
| `NEXT_PUBLIC_APP_URL` | `https://tvoy-domen.ru` | Tot zhe domen |

### Opcional'nye peremennye

| Peremennaya | Zachem |
|-------------|--------|
| `MINIMAX_API_KEY` | AI chat (provider 1) |
| `DEEPSEEK_API_KEY` | AI chat (provider 2) |
| `XAI_API_KEY` | AI chat (provider 3) |
| `YANDEX_MAPS_API_KEY` | Karty na stranicah turov |
| `YANDEX_WEATHER_API_KEY` | Pogoda |
| `UPSTASH_REDIS_REST_URL` | Rate-limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Rate-limiting |
| `SENTRY_DSN` | Monitoring oshibok |
| `CLOUDPAYMENTS_PUBLIC_ID` | Platezhi |
| `CLOUDPAYMENTS_API_SECRET` | Platezhi |

## Post-deploy proverka

Otkryt' v brauzere i proverit':

| URL | Ozhidanie |
|-----|-----------|
| `/` | Homepage s tyomnym hero |
| `/tours` | Katalog turov |
| `/tours/fishing` | 11 turov rybalki |
| `/search` | Stranica poiska |
| `/safety` | SOS, MCHS 112 |
| `/eco` | Eko-bally |
| `/auth/login` | Forma vhoda |
| `/hub/operator` | Redirect na login |
| `/api/tours` | JSON s turami |

## Chto mozhet slomat'sya

1. **Build padaet** -- obychno zabytaya peremennaya. Smotri logi.
2. **Baza ne konektitsya** -- prover' DATABASE_URL i DATABASE_SSL=true.
3. **API 401 na vsyo** -- prover' JWT_SECRET (dolzhen byt' odinakovy pri sborke i runtime).
4. **Belaya stranica** -- prover' NEXT_PUBLIC_APP_URL (dolzhen sovpadat' s domenom).
5. **Middleware crash** -- esli UPSTASH_REDIS ne zadany, rate-limiting prosto otkluchyon. Eto normalno.

## Avtodeploy

Posle pervogo deeploya -- kazhdyj `git push` v `main` avtomaticheski peresobiraet.
Zanimaet 2-4 minuty.
