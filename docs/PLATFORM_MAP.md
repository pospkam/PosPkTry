# Kamchatour Hub -- Polnaya karta platformy

> 87 stranic, 6 rolej, 208+ API endpoints.
> Kazhdaya stranica, kazhdaya ssylka, kazhdaya funkciya.

---

## Obshchaya struktura

Platforma sostoit iz:
- **Publichnye stranicy** -- dostupny vsem bez avtorizacii
- **Hub (lichnye kabinety)** -- po 1 na kazhdyyu rol', trebuyut JWT
- **API** -- backend endpointy dlya vsekh operacij
- **Globalnye komponenty** -- Header, Footer, MobileNav na kazhdoj stranice

---

## Globalnaya navigaciya

### Header (sticky, na vsekh stranicakh)
Raspolozheniye: verkhnyaya panel', vsegda vidna pri skrolle.

| Element | Dejstvie |
|---------|----------|
| Logo "Kamchatour Hub" | Ssylka na `/` (glavnaya) |
| Tury | Ssylka na `/tours` |
| Poisk | Ssylka na `/search` |
| Bezopasnost' | Ssylka na `/safety` |
| Ekologiya | Ssylka na `/eco` |
| AI | Ssylka na `/ai-assistant` |
| SOS (krasnaya knopka) | Ssylka na `/safety` |
| Tema (solntse/luna) | Pereklyuchenie temnoy/svetloj temy |
| Burger (mobile) | Otkryvaet mobilnoe menyu s temi zhe ssylkami + "Lichnyj kabinet" -> `/hub/tourist` |

### Footer (nizh kazhdoj stranicy)
4 kolonki:

| Kolonka | Ssylki |
|---------|--------|
| O platforme | `/about`, `/eco`, `/safety` |
| Tury | `/tours`, `/tours/fishing`, `/search` |
| Operatoram | `/partner/register`, `/hub/operator`, `/hub/guide` |
| Kontakty | tel:+79147822222, mailto:info@kamchatour.ru, `/legal/terms` |
| Niz | `/legal/privacy`, `/legal/terms` |

### Nizhnyaya navigaciya (mobile, 2 varianta)

**MobileNav (globalnaya, layout.tsx):**
Fiksirovannaya panel' vnizu na mobile (skryta na desktop).

| Tab | Ssylka |
|-----|--------|
| Glavnaya | `/` |
| Poisk | `/search` |
| Karta | `/map` |
| Tury | `/tours` |
| Profil' | `/profile` |

**HomeBottomNav (tol'ko na homepage):**
Plavayushchij pill -- te zhe 5 tabov.

---

## Publichnye stranicy

### `/` -- Glavnaya stranica

Tochka vhoda dlya vsekh pol'zovatelej.

**Sekcii sverhu vniz:**

1. **Hero-banner** -- temnyj vulkanicheskij gradient s zvezdnym polem
   - Zagolovok: "Otkrojte Kamchatku"
   - Poiskovaya stroka: "Kuda hotite poekhat'?" -> otpravlyaet na `/search?q=...`
   - Knopka "Najti tur" -> `/search`
   - Bystrye ssylki: Vulkany -> `/tours?category=volcanoes`, Rybalka -> `/tours?category=fishing`, Medvedi -> `/tours?category=bears`, Termy -> `/tours?category=thermal`

2. **Poiskovaya stroka** (vtoraya, mezhdu hero i kontentom)
   - "Poisk napravleniya..." -> `/search`

3. **Kategorii** (gorizontal'nyj scroll)
   - Vulkany -> `/tours?category=volcanoes`
   - Medvedi -> `/tours?category=bears`
   - Rybalka -> `/tours?category=fishing`
   - Termy -> `/tours?category=thermal`
   - Trekking -> `/tours?category=hiking`
   - Vertolyot -> `/tours?category=helicopter`
   - Rafting -> `/tours?category=rafting`

4. **ModernTourSearch** -- integrirovannyj poisk
   - Pole vvoda s debounce
   - Fil'try: Vulkany, Rybalka, Trekking, Medvedi, Gejzery, Termaly
   - Rasshirennye fil'try: slozhnost', cena ot/do, dlitel'nost'
   - AI-pomoshchnik poiska (modal)
   - Golosovoj vvod (esli brauzer podderzhivaet)
   - Rezul'taty: kartochki turov -> `/tours/[id]`

5. **Populyarnye tury** -- 4 kartochki v 2 kolonki
   - Vulkannyj Tur (15 000 rub) -> `/tours?category=volcanoes`
   - Medvezhij Tur (18 000 rub) -> `/tours?category=bears`
   - Terminal'nyj Tur (10 000 rub) -> `/tours?category=thermal`
   - Rybalka (12 000 rub) -> `/tours?category=fishing`

**API vyzovy:** `GET /api/tours?search=...`
**Plavayushchie elementy:** AI-knopka (pravy nizhij ugol) -> AI chat

---

### `/tours` -- Katalog turov

Spisok vsekh turov s fil'trami.

**Funkcional'nost':**
- Fil'try: poisk po nazvaniyu, aktivnost', slozhnost', cena
- Kartochki turov iz bazy dannyh
- Kazhdaya kartochka -> `/tours/[id]`

**API:** `GET /api/tours?search=&category=&difficulty=&priceMin=&priceMax=`

---

### `/tours/fishing` -- Kamchatskaya Rybalka

Stranica partnera "Kamchatskaya Rybalka" s 11 turami.

**Soderzhanie:**
- Logo i kontakty: +7 914-782-22-22, WhatsApp
- Fil'try: Vse tury, Odnodnevnye, Mnogodnevnye, Semejnye
- Poisk po nazvaniyu
- 11 kartochek turov s cenami (18 000 - 45 000 rub)
- Kazhdyj tur: nazvanie, opisanie, cena, rejting, sezon, vid ryb
- Knopki "Podrobnee" -> `/tours/fishing/[id]` i "Zabronirovat'"

---

### `/tours/[id]` -- Detali tura

Polnaya stranica odnogo tura.

**Sekcii:**
- Galereya foto
- Nazvanie, opisanie, cena
- Karta marshruta (Yandex Maps)
- Pogoda (3-dnevnyj prognoz)
- Profil' gida (rejting, otzyvy)
- Eko-metriki (CO2, eko-bally)
- Otzyvy turistov
- Knopka "Zabronirovat'"

**API:** `GET /api/tours/[id]`, `GET /api/weather?lat=&lon=`

---

### `/search` -- Poisk turov

Stranica poiska s ModernTourSearch komponentom.

**Funkcional'nost':**
- Tekstovyj poisk s debounce
- Fil'try po kategoriyam
- Rezul'taty iz API
- AI-pomoshchnik poiska

**API:** `GET /api/tours?search=...`

---

### `/safety` -- Bezopasnost'

Stranica bezopasnosti -- klyuchevaya dlya platformy.

**Sekcii:**
- **SOS blok** -- bol'shaya knopka "112 -- MChS" (zvonok)
- **Ekstrennye kontakty:** 112, 103, 101, +7 914-782-22-22
- **Pravila bezopasnosti na Kamchatke:**
  - Soobshchajte marshrut MChS
  - Ne priblizhaytes' k medvedyam
  - Sledite za pogodoj
  - Zapas edy i teplyh veshchej
  - Ne hodite na vulkany bez gida
- Ssylka "Podrobnee" -> `/hub/safety`

---

### `/eco` -- Ekologiya

Stranica eko-ballov.

**Sekcii:**
- Statistika: 10 000 derevyev (cel'), 50 tonn CO2
- Kak zarabotat' bally:
  - Ostavit' otzyv: +50
  - Zagruzit' foto tura: +30
  - Gruppovoj transfer: +20
  - Otkaz ot vertolyota: +40
  - Uchastie v uborke: +100
  - Mnogodnevnyj tur: +60
- Obmen: 100 ballov = derevo, 500 ballov = skidka 10%

---

### `/ai-assistant` -- AI Pomoshchnik

Chat s AI pro Kamchatku.

**Funkcional'nost':**
- Pole vvoda soobshcheniya
- Istoriya dialoga (user/assistant)
- Otpravka cherez `POST /api/ai/chat`
- Fallback esli AI nedostupen: "Zvonite 112"

---

### `/auth/login` -- Vhod

Forma avtorizacii.

**Polya:** email, parol'
**Deystviya:** Vojti, ssylka na registraciyu

---

### `/auth/register` -- Registraciya

Multi-step forma registracii (3 shaga).

**Shag 1:** Osnovnaya informaciya (nazvanie kompanii, email, telefon, parol')
**Shag 2:** Dopolnitel'naya info
**Shag 3:** Podtverzhdeniye

Takzhe est' `/auth/register/operator` -- registraciya operatora.

---

### `/offline` -- Offline stranica

Pokazyvayetsya kogda net interneta (Service Worker).

**Soderzhanie:**
- Ikonka WifiOff
- "Net podklyucheniya k internetu"
- Spisok keshirovannyh turov iz Cache API
- Knopka "Obnovit' stranicu"

---

### `/map` -- Karta Kamchatki

Interaktivnaya karta s markerami turov (Yandex Maps).
Trebuyetsya YANDEX_MAPS_API_KEY.

---

### `/shop` -- Magazin suvenirov
### `/gear` -- Arenda snaryazheniya
### `/cars` -- Arenda avtomobilej

Dopolnitel'nye servisy platformy.

---

### `/partner/register` -- Registraciya partnera

Forma dlya novyh operatorov/gidov.

### `/partner/dashboard` -- Dashboard partnera

Obshchij dashboard dlya partnerov.

---

### `/legal/*` -- Yuridicheskie stranicy

| Route | Soderzhanie |
|-------|-------------|
| `/legal/terms` | Usloviya ispol'zovaniya |
| `/legal/privacy` | Politika konfidencial'nosti |
| `/legal/offer` | Publichnaya oferta |
| `/legal/commission` | Komissionnye usloviya |

---

## Hub: Turist (`/hub/tourist`)

**Trebuyetsya rol':** tourist ili admin
**Sidebar navigaciya:**

| Ssylka | Nazvanie |
|--------|----------|
| `/hub/tourist` | Obzor |
| `/hub/tourist/bookings` | Bronirovaniya |
| `/hub/tourist/bookings/new` | Novoye bronirovaniye |
| `/hub/tours` | Tury |
| `/eco` | Eko-bally |

### Stranicy:

**`/hub/tourist`** -- Dashboard
- Privetstvie s imenem
- Bystraya statistika: aktivnye broni, wishlist, eko-bally
- Poslednie bronirovaniya

**`/hub/tourist/bookings`** -- Moi bronirovaniya
- Spisok vsekh bronirovanij
- Fil'tr po statusu: vse/aktivnye/zavershennye/otmenennye
- Kazhdoe: nazvanie tura, data, cena, status, kontakt operatora
- Knopka otmeny dlya predstoyashchih

**`/hub/tourist/bookings/new`** -- Novoye bronirovaniye
- Vybor tura, dat, kolichestva chelovek
- API: `POST /api/bookings`

**`/hub/tourist/wishlist`** -- Izbrannye tury
- Setka sohrannyh turov
- Knopka "Zabronirovat'" na kazhdoj kartochke
- Knopka udaleniya iz izbrannogo
- API: `GET /api/tourist/wishlist`

**`/hub/tourist/reviews`** -- Moi otzyvy
- Spisok otzyvov s rejtingom (zvezdami)
- Redaktirovaniye/udaleniye svoih otzyvov
- API: `GET /api/tourist/reviews`

**`/hub/tourist/eco-points`** -- Eko-bally
- Obshchij balans (bol'shoe chislo)
- Progress bar do sleduyushchego urovnya
- Istoriya zarabotannyh ballov
- Sovety kak zarabotat' bol'she

**`/hub/tourist/profile`** -- Profil'
- Redaktirovaniye imeni, email, telefona
- Smena parolya (staryj/novyj/podtverzhdeniye)
- API: `GET/PATCH /api/tourist/profile`

**`/hub/tourist/notifications`** -- Uvedomleniya
- Spisok uvedomlenij
- Fil'tr: vse/neprocitannye
- Knopka "Prochitat' vse"
- API: `GET /api/tourist/notifications`

---

## Hub: Operator (`/hub/operator`)

**Trebuyetsya rol':** operator ili admin
**Sidebar navigaciya:**

| Ssylka | Nazvanie |
|--------|----------|
| `/hub/operator` | Obzor |
| `/hub/operator/tours` | Tury |
| `/hub/operator/bookings` | Bronirovaniya |
| `/hub/operator/clients` | Klienty |
| `/hub/operator/finance` | Finansy |
| `/hub/operator/calendar` | Kalendar' |
| `/hub/operator/integrations` | Integracii |

### Stranicy:

**`/hub/operator`** -- Dashboard
- Klyuchevye pokazateli (KPI): tury, broni, vyruchka, rejting
- Panel' registracii grupp v MChS (MchsRegistrationPanel)
- Grafiki vyruchki i bronirovanij
- Top-5 turov
- Predstoyashchie tury
- Poslednie bronirovaniya

**`/hub/operator/tours`** -- Upravlenie turami
- Spisok turov operatora s fil'trami
- Sortirovka po date, cene, rejtingu
- Poisk po nazvaniyu
- API: `GET /api/operator/tours`

**`/hub/operator/tours/new`** -- Sozdanie tura
- Forma sozdaniya novogo tura
- API: `POST /api/operator/tours`

**`/hub/operator/tours/[id]`** -- Redaktirovaniye tura
- Forma redaktirovaniya sushchestvuyushchego tura

**`/hub/operator/bookings`** -- Bronirovaniya
- Spisok bronirovanij s paginaciej
- Fil'try po statusu, datu
- API: `GET /api/operator/bookings`

**`/hub/operator/clients`** -- Klienty
- Spisok klientov: imya, email, telefon, kol-vo bronirovanij, summa
- Poisk, fil'tr po statusu (active/inactive/vip)

**`/hub/operator/finance`** -- Finansy
- Vyruchka, komissii, vyplaty

**`/hub/operator/calendar`** -- Kalendar'
- Kalendar' turov i bronirovanij

**`/hub/operator/guides`** -- Gidy
- Spisok gidov: imya, rejting, spetsializacii, status
- Vklyuchit'/otklyuchit' gida

**`/hub/operator/analytics`** -- Analitika
- Vyruchka po mesyacam (stolbchataya diagramma)
- KPI: obshchaya vyruchka, bronirovaniya, konversiya
- Top tury po vyruchke

**`/hub/operator/notifications`** -- Uvedomleniya
- Tipy: novoye bronirovaniye, otmena, otzyv, zapros na perebros
- Fil'tr: vse/neprocitannye
- "Prochitat' vse"

**`/hub/operator/transfers`** -- Perebros bronirovanij
- Iskhodyashchie predlozheniya perebrosov
- Vkhodyashchie zaprosy s knopkami Prinyat'/Otklopit'
- Forma sozdaniya: booking_id, operator-poluchatel', komissiya %, soobshchenie
- API: `GET/POST /api/operator/transfer-booking`, `PATCH .../[id]/accept`, `PATCH .../[id]/reject`

**`/hub/operator/booking-intake`** -- AI Priem zayavok
- Chat-interfejs dlya testirovaniya AI-agenta
- Spisok AI-obrabotannyh zayavok
- Otmetit' kak obrabotannoye
- API: `POST /api/ai/booking-intake`
- Provajdery: MiniMax -> DeepSeek -> x.ai (fallback)

**`/hub/operator/transfer`** -- Upravleniye transferami
**`/hub/operator/reports`** -- Otchety
**`/hub/operator/integrations`** -- Integracii

---

## Hub: Gid (`/hub/guide`)

**Trebuyetsya rol':** guide ili admin
**Sidebar:**

| Ssylka | Nazvanie |
|--------|----------|
| `/hub/guide` | Obzor |
| `/hub/guide/schedule` | Raspisaniye |
| `/hub/guide/groups` | Gruppy |
| `/hub/guide/earnings` | Zarabotok |

### Stranicy:

**`/hub/guide`** -- Dashboard
- Raspisaniye na segodnya
- Aktivnye gruppy
- Zarabotok za mesyac
- Srednij rejting

**`/hub/guide/schedule`** -- Raspisaniye
- Nedel'nyj kalendar'
- Kazhdyj den': nazvanie tura, vremya, razmer gruppy

**`/hub/guide/groups`** -- Gruppy
- Aktivnye gruppy: tur, daty, kol-vo turistov, operator
- Rasshiryaemyj spisok uchastnikov

**`/hub/guide/earnings`** -- Zarabotok
- Itogo za mesyac / za vsyo vremya
- Razbiyka po turam
- Istoriya vyplat

**`/hub/guide/profile`** -- Profil' gida
- Redaktirovat' imya, bio, spetsializacii, yazyki
- Kontakty: telefon, email

**`/hub/guide/reviews`** -- Otzyvy o gide
- Poluchennye otzyvy ot turistov
- Srednij rejting (bol'shoe chislo + zvezdy)
- Fil'tr po rejtingu: Vse, 5, 4, 3, 2, 1

---

## Hub: Transfer-operator (`/hub/transfer-operator`)

**Trebuyetsya rol':** transfer_operator, transfer ili admin
**Sidebar:**

| Ssylka | Nazvanie |
|--------|----------|
| `/hub/transfer-operator` | Obzor |
| `/hub/transfer-operator/vehicles` | Avtopark |
| `/hub/transfer-operator/drivers` | Voditeli |
| `/hub/transfer` | Marshruty |

### Stranicy:

**`/hub/transfer-operator`** -- Dashboard
- Aktivnye mashiny, segodnyashnie transfery, mesyachnaya vyruchka

**`/hub/transfer-operator/vehicles`** -- Avtopark
- Spisok mashin: tip, vmestimost', status, voditel'
- Forma dobavleniya mashiny

**`/hub/transfer-operator/drivers`** -- Voditeli
- Spisok voditelej: imya, telefon, licenziya, mashina
- Forma dobavleniya voditelya

**`/hub/transfer-operator/routes`** -- Marshruty
- Spisok marshrutov: otkuda, kuda, rasstoyaniye, vremya, cena
- Forma dobavleniya marshruta
- Demo: Elizovo-Petropavlovsk (32km, 3000 rub), Petropavlovsk-Paratunka (65km, 5000 rub)

**`/hub/transfer-operator/bookings`** -- Bronirovaniya transferov
- Spisok bronirovanij transferov
- Fil'tr po statusu: ozhidaet/podtverzhden/zavershen/otmenen
- Knopki podtverdit'/otmenit' dlya ozhidayushchih

---

## Hub: Agent (`/hub/agent`)

**Trebuyetsya rol':** agent ili admin
**Sidebar:**

| Ssylka | Nazvanie |
|--------|----------|
| `/hub/agent` | Obzor |
| `/hub/agent/clients` | Klienty |
| `/hub/agent/vouchers` | Vauchery |
| `/hub/agent/commissions` | Komissii |

### Stranicy:

**`/hub/agent`** -- Dashboard
- Obshchee kolichestvo klientov
- Aktivnye vauchery
- Komissiya za mesyac
- Lenta aktivnosti

**`/hub/agent/clients`** -- Klienty
- Spisok klientov: imya, email, bronirovaniya, summa
- Poisk po imeni/email
- Modal s istoriej bronirovanij klienta

**`/hub/agent/vouchers`** -- Vauchery
- Spisok vaucherov: kod, skidka, srok, ispol'zovaniya
- Forma sozdaniya novogo vauchera
- Aktivirovat'/deaktivirovat'

**`/hub/agent/commissions`** -- Komissii
- Istoriya komissij: bronirovaniye, tur, summa, data, status
- Itogo za mesyac / za vsyo vremya
- Knopka zaprosa vyplaty

**`/hub/agent/stats`** -- Statistika
- Komissii po mesyacam (stolbchataya diagramma)
- Uderzhaniye klientov (%)
- Top tury po bronirovaniyam
- Povtornye klienty

**`/hub/agent/bookings`** -- Bronirovaniya agenta

---

## Hub: Admin (`/hub/admin`)

**Trebuyetsya rol':** admin
**Sidebar:**

| Ssylka | Nazvanie |
|--------|----------|
| `/hub/admin` | Obzor |
| `/hub/admin/users` | Pol'zovateli |
| `/hub/admin/content/tours` | Moderaciya turov |
| `/hub/admin/content/reviews` | Otzyvy |
| `/hub/admin/content/partners` | Partnery |
| `/hub/admin/finance` | Finansy |

### Stranicy:

**`/hub/admin`** -- Dashboard
- Statistika platformy
- Grafiki

**`/hub/admin/users`** -- Pol'zovateli
- Spisok vsekh pol'zovatelej
- Upravleniye rolyami

**`/hub/admin/content/tours`** -- Moderaciya turov
- Vse tury platformy
- Odobrenie/otkloneniye

**`/hub/admin/content/reviews`** -- Otzyvy
- Vse otzyvy
- Moderaciya

**`/hub/admin/content/partners`** -- Partnery
- Verifikaciya partnerov

**`/hub/admin/finance`** -- Finansy platformy
- Obshchaya vyruchka, komissii, vyplaty

**`/hub/admin/settings`** -- Nastrojki
- Nastrojki platformy, email-shablony

**`/hub/admin/operators`** -- Operatory
- Spisok vsekh operatorov: nazvanie, status, tury, vyruchka
- Aktivirovat'/zablokirovat'

**`/hub/admin/bookings`** -- Vse bronirovaniya
- Tablitsa vsekh bronirovanij platformy
- Poisk po turu/turistu
- Fil'tr po statusu
- Eksport v CSV

**`/hub/admin/moderation`** -- Moderaciya
- Ochered' otzyvov na proverku
- Odobrit'/otklopit' kazhdyj otzyv
- Pometka podozritel'nogo kontenta (flag)

---

## API Endpoints (osnovnye)

### Publichnye
| Method | Endpoint | Opisaniye |
|--------|----------|-----------|
| GET | `/api/tours` | Spisok turov s fil'trami |
| GET | `/api/tours/[id]` | Detali tura |
| GET | `/api/weather?lat=&lon=` | Pogoda (proxy Yandex/OpenMeteo) |
| POST | `/api/auth/login` | Avtorizaciya |
| POST | `/api/auth/register` | Registraciya |

### Trebuyut avtorizacii
| Method | Endpoint | Opisaniye |
|--------|----------|-----------|
| GET | `/api/auth/me` | Tekushchij pol'zovatel' |
| GET | `/api/operator/tours` | Tury operatora |
| POST | `/api/operator/tours` | Sozdat' tur |
| GET | `/api/operator/bookings` | Bronirovaniya operatora |
| POST | `/api/operator/mchs/register` | Registraciya gruppy v MChS |
| GET | `/api/operator/mchs/register` | Spisok registracij MChS |
| GET | `/api/operator/mchs/[id]` | Detali registracii MChS |
| GET | `/api/operator/transfer-booking` | Perebros bronirovanij |
| POST | `/api/operator/transfer-booking` | Sozdat' perebros |
| PATCH | `/api/operator/transfer-booking/[id]/accept` | Prinyat' perebros |
| PATCH | `/api/operator/transfer-booking/[id]/reject` | Otklopit' perebros |
| POST | `/api/ai/booking-intake` | AI priyom zayavok |
| POST | `/api/ai/chat` | AI chat |

---

## Dopolnitel'nye stranicy

| Route | Opisaniye |
|-------|-----------|
| `/api-docs` | Swagger UI dokumentaciya API |
| `/admin/login` | Otdel'nyj vhod dlya adminov |
| `/admin/settings` | Nastrojki admin-paneli |
| `/hub/stay` | Razmeshcheniye |
| `/hub/stay-provider` | Provajder razmeshcheniya |
| `/hub/souvenirs` | Suveniry |
| `/hub/gear` | Snaryazheniye |
| `/hub/gear-provider` | Provajder snaryazheniya |
| `/hub/cars` | Arenda avto |
| `/hub/tours` | Tury (hub versiya) |
| `/hub/transfer` | Transfer marshruty |
| `/hub/safety` | Bezopasnost' (hub versiya) |

---

## Temy

Platforma podderzhivaet 2 temy: temnuyu (defolt) i svetluyu.

- Pereklyuchatel' v Header (ikonka solntse/luna)
- Sokhranenyaetsya v localStorage['kh-theme']
- CSS peremennye: `var(--bg-primary)`, `var(--text-primary)`, `var(--accent)`, etc.
- data-theme="dark" ili data-theme="light" na `<html>`

---

## Service Worker

Fayl: `public/sw.js`
Kesh: `kamchatour-v1`

- Predvaritel'no keshiruet: `/`, `/tours`, `/offline`
- Staticheskie assety: cache-first
- Stranicy turov `/tours/[id]`: keshiruet poslednie 10 (LRU)
- Offline fallback: `/offline`

---

## Bezopasnost'

- JWT avtorizaciya na vsekh `/hub/*` i `/api/*` (krome publichnykh)
- Middleware redirectit neautorizovannykh na `/auth/login`
- Rate-limiting cherez Upstash Redis (opcional'no)
- Zod validaciya na vsekh API endpointakh
- Parametrizovannyj SQL ($1, $2) -- nikogda konkatenaciya
- CSP headers na vsekh stranicakh
- X-Robots-Tag: noindex na `/hub/*` i `/api/*`

---

> Obnovleno: 2026-02-26
> Stranic: 87 | API: 208+ | Rolej: 6
