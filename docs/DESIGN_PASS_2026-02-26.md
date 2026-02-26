# Design Pass worklog (2026-02-26)

## Kontekst

Unificirovannaya dizajn-sistema dlya vsekh 87 stranic.
Temnyj rezhim po umolchaniyu. CSS variables vezde.

## Podhod

Vmesto ruchnoj pravki 55+ fajlov s hardcoded cvetami,
dobavilas' global'naya sistema:

1. `body` poluchaet `background: var(--bg-primary)` i `color: var(--text-primary)` --
   kazhdaya stranica avtomaticheski nasleduyet pravil'nyj fon.
2. `@layer components` s utility-klassami (ds-card, ds-input, ds-btn, etc.) --
   novye i obnovlyaemye stranicy mogut ispol'zovat' ih.
3. Starye stranicy s `text-white` i `bg-white/15` prodolzhayut rabotat' korrektno
   na temnom fone (potomu chto fon teper' vsegda temnyi po umolchaniyu).

## Kommity

1. `feat(design): unified design system utilities and global dark theme`

## Chto sdelano

### globals.css -- novye utility klassy

| Klass | Naznacheniye |
|-------|-------------|
| `ds-page` | Fon + tekst stranicy |
| `ds-card` | Kartochka s tenyu, borderom, hover |
| `ds-input` | Pole vvoda 44px, focus accent |
| `ds-btn` / `ds-btn-primary` | Knopka accent, 44px |
| `ds-btn-secondary` | Knopka s borderom |
| `ds-btn-danger` | Krasnaya knopka |
| `ds-section` | Sekciya stranicy |
| `ds-badge` | Status badge |
| `ds-h1` / `ds-h2` | Zagolovki |
| `ds-label` | Podpis' (uppercase, tracking) |
| `ds-skeleton` | Loading placeholder |

### Global'nye izmeneniya

| Element | Do | Posle |
|---------|-----|-------|
| `body` | net fona | `background: var(--bg-primary)` |
| PageWrapper | `bg-[var(--bg-primary)]` | Uproshchen, nasleduyet ot body |
| Footer | `bg-[#0D1117]` hardcoded | `bg-[var(--bg-secondary)]` CSS var |
| Safety SOS | Malenkaya knopka | Full-width py-8 text-3xl animate-pulse |
| Scrollbar | Tol'ko temnyj | Svetlyj variant dlya light temy |

### Sushchestvuyushchie stranicy

Stranicy s `text-white` i `bg-white/15` (naprimer vse hub-stranicy):
- Prodolzhayut rabotat' korrektno
- Fon body teper' temnyi po umolchaniyu
- Postepennaya migraciya na ds-* klassy po mere obnovleniya stranic

## Tekhnicheskij rezul'tat

- npm run build: PASS
- npm run lint: PASS
- 0 slomannykh stranic
- Vse 87 stranic poluchayut korrektnyj temnyj fon cherez body

## Sleduyushchie shagi

- Postepenno zamenyat' `text-white`, `bg-white/15` na CSS peremennye v hub stranicakh
- Ispol'zovat' ds-* klassy v novykh stranicakh
- Dorabotat' avtorizaciyu dlya polnogo testirovaniya hub stranic
