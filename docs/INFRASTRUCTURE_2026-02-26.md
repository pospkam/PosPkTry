# Infrastructure Improvements worklog (2026-02-26)

## Kontekst

Tri infrastrukturnyh uluchsheniya: SEO, offline-podderzhka, AI-utilita.

## Kommity

1. `feat(seo): robots.txt canonical tags and noindex headers`
2. `feat(offline): service worker with tour cache and offline page`
3. `feat(ai): fetchAsMarkdown utility with fallback and caching`

---

## Task 1: SEO / URL Architecture

### robots.txt
- `public/robots.txt`: Disallow /api/, /hub/, /auth/
- Allow: /, /tours, /search, /safety, /eco
- Sitemap: https://kamchatourhub.ru/sitemap.xml

### Canonical tags
- `app/page.tsx`: alternates.canonical = https://kamchatourhub.ru/
- `app/tours/page.tsx`: alternates.canonical = https://kamchatourhub.ru/tours
- /search, /safety, /eco -- stranicy ne sushchestvuyut (404), canonical dobavitsya pri sozdanii

### noindex headers
- `next.config.js`: dobavleny X-Robots-Tag: noindex,nofollow dlya:
  - /hub/:path*
  - /api/:path*

---

## Task 2: Service Worker (Offline Support)

### public/sw.js
- Cache name: `kamchatour-v1`
- Precache on install: /, /tours, /offline
- Static assets: cache-first (/_next/static/, .css, .js, .woff2)
- Tour pages (/tours/[id]): cache-first + LRU eviction (max 10)
- Offline fallback: esli stranica ne v keshe -- serve /offline
- Aktivaciya: udalenie staryh keshej

### app/offline/page.tsx + _OfflineClient.tsx
- Zagolovok: "Net podklyucheniya k internetu"
- Spisok keshirovannyh turov cherez Cache API
- Knopka "Obnovit' stranicu" -- window.location.reload()
- Styling: var(--bg-primary), var(--text-primary), Lucide WifiOff ikona

### Registraciya
- Inline script v app/layout.tsx: navigator.serviceWorker.register('/sw.js')
- Vypolnyaetsya na window load event

---

## Task 3: markdown.new utility

### lib/ai/fetchAsMarkdown.ts
- Strategiya: markdown.new pervym (5s timeout), fallback -- pryamoj fetch + stripHtml (8s timeout)
- Keshirovanie: unstable_cache s revalidate: 3600 (1 chas)
- stripHtml: udalyaet script, style, vse tegi, ostavlyaet tekst
- Re-eksportiruetsya iz /api/ai/booking-intake dlya obogashcheniya konteksta

---

## Tekhnicheskij rezul'tat

- npm run build: PASS (posle kazhdoj zadachi)
- npm run lint: PASS (net novyh oshibok)
- Net any tipov
- Lucide ikonki (WifiOff, RefreshCw, MapPin)
- CSS variables dlya offline stranicy
- Kommentarii biznes-logiki na russkom

## Ob'yom izmenenij

| Fajl | Dejstvie |
|------|----------|
| public/robots.txt | Novyj |
| app/page.tsx | Dobavlen canonical |
| app/tours/page.tsx | Dobavlen canonical |
| next.config.js | Dobavleny X-Robots-Tag headers |
| public/sw.js | Novyj |
| app/offline/page.tsx | Novyj |
| app/offline/_OfflineClient.tsx | Novyj |
| app/layout.tsx | Dobavlena registraciya SW |
| lib/ai/fetchAsMarkdown.ts | Novyj |
| app/api/ai/booking-intake/route.ts | Re-eksport fetchAsMarkdown |
