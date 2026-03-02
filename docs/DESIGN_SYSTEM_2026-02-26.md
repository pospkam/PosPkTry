# Design System Foundation worklog (2026-02-26)

## Kontekst

Cel: sozdat edinuyu dizajn-sistemu kotoraya avtomaticheski primenyaetsya
ko vsem 91 stranice cherez obshchie komponenty i CSS-peremennye.
Ne peredizajnivat otdel'nye stranicy -- postroit fundament.

Vetka: `cursor/development-environment-setup-cd18`

---

## Kommity

1. `feat(design): add CSS variables for dark/light theme system`
2. `feat(design): create ThemeToggle with Lucide icons and unified ThemeContext`
3. `feat(design): add layout components (Header, Footer, MobileNav, PageWrapper)`
4. `feat(design): add core UI components (DSButton, DSCard, DSInput, DSBadge)`
5. `feat(design): integrate ThemeScript, Header, Footer, MobileNav, PageWrapper into root layout`
6. `feat(design): add HubSidebar and update all 6 hub dashboard layouts with CSS variables`

---

## Izmeneniya po shagam

### Shag 1: CSS Variables (globals.css)

- Dobavleny 28 CSS peremennyh dlya temnoy i svetloy tem
- Temy upravljayutsya cherez `data-theme="dark"|"light"` na `<html>`
- Fallback: bez data-theme primenyaetsya temnaya tema
- Peremennye: --bg-primary, --bg-secondary, --bg-card, --bg-hover,
  --text-primary, --text-secondary, --text-muted,
  --accent, --accent-hover, --accent-muted,
  --success, --warning, --danger, --salmon,
  --border, --border-strong,
  --shadow-sm, --shadow-md, --shadow-lg,
  --radius-sm, --radius-md, --radius-lg, --radius-xl

### Shag 2: ThemeToggle

- `components/ui/ThemeToggle.tsx` -- Lucide ikonki Sun/Moon
- `contexts/ThemeContext.tsx` -- obnovlen: stavit i `data-theme` atribut i `dark` klass
- localStorage klyuch: `kh-theme`
- Touch target: min-h-[44px] min-w-[44px]

### Shag 3: Layout Components

- `components/layout/Header.tsx` -- sticky top-0, backdrop-blur,
  logo + nav (desktop) + SOS + ThemeToggle + hamburger (mobile)
- `components/layout/Footer.tsx` -- 4 kolonki (O platforme/Tury/Operatoram/Kontakty),
  copyright, social links
- `components/layout/MobileNav.tsx` -- fixed bottom, 5 tabov,
  aktivnyy tab text-[var(--accent)]
- `components/layout/PageWrapper.tsx` -- bg-primary, text-primary,
  min-h-screen, pb-16 na mobile dlya MobileNav

### Shag 4: Core UI Components

- `components/ui/DSButton.tsx` -- 4 varianta: primary/secondary/danger/ghost
- `components/ui/DSCard.tsx` -- bg-card, border, shadow, hover-effekty
- `components/ui/DSInput.tsx` -- s label, focus:accent, forwardRef
- `components/ui/DSBadge.tsx` -- 4 varianta: pending/success/danger/info

### Shag 5: Root Layout (app/layout.tsx)

- Dobavlen ThemeScript (inline script) -- chitaet localStorage do rendera React,
  ustanavlivaet data-theme i dark klass, predotvrashchaet FOUC
- Oborachivanie v PageWrapper + Header + Footer + MobileNav
- data-theme="dark" po umolchaniyu na <html>

### Shag 6: Hub Dashboard Layouts

- Sozdan `components/layout/HubSidebar.tsx` -- bokovaya navigaciya s aktivnym sostoyaniem
- Sozdan `components/layout/HubLayout.tsx` -- sidebar + kontent
- Obnovleny 7 layoutov:
  - app/hub/tourist/layout.tsx
  - app/hub/operator/layout.tsx
  - app/hub/guide/layout.tsx
  - app/hub/transfer-operator/layout.tsx
  - app/hub/agent/layout.tsx
  - app/hub/admin/layout.tsx (novyy)
- Desktop: sidebar sleva (w-60, bg-secondary, border-r)
- Mobile: gorizontal'nyy scroll-bar naverkhu
- Aktivnyy punkt: accent-muted bg + accent text + border-r-2

---

## Tekhnicheskiy rezul'tat

- `JWT_SECRET=dummy-secret npm run build` -- PASS
- `npm run lint` -- PASS (tol'ko pre-existing warnings)
- Vse CSS cherez var() -- ni odnogo hardcoded hex v novykh komponentakh
- Touch targets min-h-[44px] vezde
- Net `any` tipov
- Lucide React ikonki vezde, nikakikh emodji

---

## Ob'yom izmeneniy

| Fayl | Deystvie |
|------|----------|
| app/globals.css | CSS Variables (dark + light) |
| contexts/ThemeContext.tsx | data-theme + dark class sync |
| components/ui/ThemeToggle.tsx | Novyy (Lucide Sun/Moon) |
| components/layout/Header.tsx | Novyy |
| components/layout/Footer.tsx | Novyy |
| components/layout/MobileNav.tsx | Novyy |
| components/layout/PageWrapper.tsx | Novyy |
| components/layout/HubSidebar.tsx | Novyy |
| components/layout/HubLayout.tsx | Novyy |
| components/ui/DSButton.tsx | Novyy |
| components/ui/DSCard.tsx | Novyy |
| components/ui/DSInput.tsx | Novyy |
| components/ui/DSBadge.tsx | Novyy |
| app/layout.tsx | ThemeScript + wrappers |
| app/hub/tourist/layout.tsx | HubLayout |
| app/hub/operator/layout.tsx | HubLayout |
| app/hub/guide/layout.tsx | HubLayout |
| app/hub/transfer-operator/layout.tsx | HubLayout |
| app/hub/agent/layout.tsx | HubLayout |
| app/hub/admin/layout.tsx | Novyy + HubLayout |
| docs/DESIGN_SYSTEM_2026-02-26.md | Otchyot |

---

## Tekushchiy status

- Dizajn-sistema gotova kak fundament
- Temnaya/svetlaya tema rabotayut (data-theme + Tailwind dark)
- Header/Footer/MobileNav primenyayutsya globalno cherez root layout
- Hub-dashboardy poluchili sidebar navigaciyu
- Core UI komponenty gotovy k ispol'zovaniyu

## Sleduyushchie shagi

- Shag 2: Primeneniye dizajn-sistemy k homepage i klyuchevym stranicam
- Migraciya sushchestvuyushchikh komponentov na DS-komponenty (DSButton, DSCard, etc.)
- Udaleniye staroy ThemeToggle.tsx i ThemeToggle.css
