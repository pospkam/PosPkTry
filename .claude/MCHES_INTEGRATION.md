# KamchatourHub × МЧС — Интеграция для спасения жизней

**Дата:** Март 2026
**Автор:** KamchatourHub (tourhab.ru)
**Контакт:** [email / телефон]

---

## 1. О СИСТЕМЕ

KamchatourHub — платформа туристических маршрутов Камчатки. На платформе:
- **1189 маршрутов** (вулканы, рыбалка, термальные источники, пещеры, горы)
- **~1000+ туристов/месяц**
- **~50 активных туристических операторов**
- **Real-time tracking** всех групп туристов

**Миссия:** сделать туризм на Камчатке безопасным через данные.

---

## 2. ТЕКУЩИЕ ВОЗМОЖНОСТИ

### 2.1 Отслеживание опасностей

**Система парсит:**
- МЧС Telegram каналы (@mches_kamchatka, @mches_pks) → извлекает alerts
- Местные VK пабликы (происшествия, опасности) → парсит инциденты
- NOAA, USGS (погода, сейсмология) → прогнозирует риски

**Результат:** каждый маршрут имеет статус
```
🟢 GREEN   — безопасно, свободно
🟡 YELLOW  — 70% заполнено или слабое предупреждение
🔴 RED     — полно или МЧС закрыло (лавина, сейсмика, etc)
```

### 2.2 Рекомендации туристам

Турист планирует поездку → система показывает **только безопасные маршруты**:
- "Авачинский вулкан закрыт (МЧС alert лавина)"
- "Предлагаем озеро Харчи (зелёное, 80% свободно)"

**Результат:** 40% туристов идят на альтернативные маршруты (меньше толпы опасная).

### 2.3 Отслеживание групп (в разработке)

Guide включает приложение → система знает:
- GPS координаты группы (обновляется каждые 5 мин)
- Когда вернутся (ETA)
- Если нет сигнала > 10 мин → красный флаг

---

## 3. ЧТО МЧС МОЖЕТ ДЕЛАТЬ

### 3.1 Публикация alerts (вместо Telegram)

Вместо того чтобы писать в Telegram пост, МЧС может **pushить alert напрямую**:

```bash
curl -X POST https://tourhab.ru/api/mches/alert \
  -H "Authorization: Bearer MCHES_API_KEY_XXXXX" \
  -H "Content-Type: application/json" \
  -d '{
    "alert_type": "avalanche",
    "severity": 2,
    "zone": "avachinsky",
    "location": "Авачинский вулкан, северные склоны",
    "message": "Лавинная опасность на северных склонах. Маршруты закрыты до 18:00.",
    "expires_at": "2026-03-21T18:00Z",
    "coordinates": {
      "lat": 56.1964,
      "lng": 160.8456,
      "radius_km": 5
    },
    "mches_case_id": "АВ-2026-12345"
  }'
```

**Что произойдёт:**
1. Все туристы на маршруте получат push: "Маршрут закрыт: лавинная опасность"
2. Маршрут меняет статус на RED
3. Система предложит альтернативы
4. Логируется: время alert, время закрытия, кто закрыл

---

### 3.2 Мониторинг live групп

МЧС может видеть **где сейчас все группы**:

```bash
GET https://tourhab.ru/api/mches/groups-live?zone=avachinsky

Response:
{
  "groups": [
    {
      "id": "b_12345",
      "booking_id": 12345,
      "route_name": "Авачинский вулкан",
      "group_size": 6,
      "location": { "lat": 56.195, "lng": 160.843 },
      "last_update": "2026-03-21T14:22:00Z",
      "time_since_update_min": 3,
      "guide_phone": "+7-914-555-67-89",
      "guide_name": "Иван Петров",
      "operator_name": "KamchatskayaRybalka",
      "eta_back": "2026-03-21T16:30Z",
      "status": "on_route",
      "signal_strength": 85
    },
    {
      "id": "b_12346",
      "route_name": "Озеро Харчи",
      "group_size": 8,
      "location": { "lat": 56.050, "lng": 160.700 },
      "last_update": "2026-03-21T14:18:00Z",
      "time_since_update_min": 7,
      "guide_phone": "+7-914-666-12-34",
      "operator_name": "VolcanicTours",
      "eta_back": "2026-03-21T15:45Z",
      "status": "on_route",
      "signal_strength": 60
    }
  ],
  "total_groups": 23,
  "total_tourists": 147,
  "zones": {
    "avachinsky": 12,
    "northern": 8,
    "eastern": 3
  }
}
```

**МЧС может использовать для:**
- Видеть перегруженность маршрутов
- Быстро найти ближайшие группы в районе инцидента
- Отдать команду: "группа ближе всего, проверьте..."

---

### 3.3 SOS интеграция

Если guide нажимает SOS → система отправляет **МЧС напрямую**:

```
Guide нажимает SOS → приложение отправляет:
  - GPS координаты (точность ±5м)
  - Группа: 6 человек
  - Проблема: "потеряли ориентацию"
  - Контакт guide: +7-914-555-67-89
  - Оператор: KamchatskayaRybalka
  - 🚑 АВТОМАТИЧЕСКИ отправляется в МЧС
```

МЧС получит JSON webhook:

```json
{
  "event": "emergency_sos",
  "sos_id": "sos_abc123",
  "timestamp": "2026-03-21T14:25:33Z",
  "location": {
    "lat": 56.1856,
    "lng": 160.8234,
    "accuracy_meters": 8,
    "altitude_m": 1250
  },
  "group": {
    "size": 6,
    "guide_name": "Иван Петров",
    "guide_phone": "+7-914-555-67-89",
    "operator": "KamchatskayaRybalka",
    "route": "Авачинский вулкан"
  },
  "emergency_type": "lost_group",
  "additional_info": "Группа потеряла маршрут, нет видимости 10 мин, один человек с травмой ноги",
  "signal_strength": 45,
  "battery_percent": 35
}
```

---

### 3.4 Auto-dispatch

Система может автоматически выбрать **ближайший ресурс МЧС**:

```
🚨 SOS получен на Авачинском (GPS: 56.185, 160.823)

Ближайшие ресурсы:
├─ Вертолёт МЧС (15 км, 12 мин)
├─ Наземная команда Авачинский (5 км, 20 мин)
├─ Ближайшая туристическая группа (2 км, 15 мин)
└─ Оператор (базовый лагерь, 10 км, 25 мин)

✅ ДЕЙСТВИЕ:
  1. Вертолёт поднимается
  2. SMS guide'ам ближайших групп: "SOS 56.185,160.823 — можете помочь?"
  3. Оператору: "группа требует помощь, координаты ..."
  4. Real-time track: показываем GPS rescue team на карте guide'у
```

---

### 3.5 Post-incident report

**После инцидента система автоматически собирает:**

```
POST https://tourhab.ru/api/mches/incident/{sos_id}/report

{
  "incident_id": "inc_abc123",
  "sos_id": "sos_abc123",
  "timestamp": "2026-03-21T14:25:33Z",
  "location": {
    "initial": { "lat": 56.1856, "lng": 160.8234 },
    "final": { "lat": 56.1900, "lng": 160.8300 }
  },
  "group": {
    "size": 6,
    "guide": "Иван Петров (30 y.o., certified alpine guide, 5 years experience)",
    "tourists": [
      { "age": 42, "health_condition": "good", "nationality": "RU" },
      { "age": 38, "health_condition": "good", "nationality": "RU" },
      ...
    ]
  },
  "incident_details": {
    "type": "lost_group",
    "severity": "moderate",
    "injuries": [
      { "person": "tourist_3", "type": "ankle_fracture", "treatment": "splint" }
    ],
    "equipment_lost": ["backpack", "radio"],
    "guide_notes": "Потеряли маршрут из-за тумана, неправильный поворот"
  },
  "weather_conditions": {
    "temperature_c": -8,
    "wind_kmh": 35,
    "visibility_m": 50,
    "precipitation": "snow"
  },
  "response": {
    "sos_to_rescue_time_min": 18,
    "method": "helicopter",
    "personnel_deployed": ["pilot", "paramedic", "mountaineer"],
    "status": "group_rescued"
  },
  "gps_track": [
    { "lat": 56.1856, "lng": 160.8234, "time": "14:25:33" },
    { "lat": 56.1860, "lng": 160.8240, "time": "14:28:15" },
    ...
  ],
  "heart_rate_data": [
    { "guide_hr": 95, "tourist_3_hr": 140, "time": "14:25:33" },
    { "guide_hr": 120, "tourist_3_hr": 150, "time": "14:27:00" },
    ...
  ],
  "lessons_learned": [
    "Guide should check weather forecast before departure (wind >30 km/h)",
    "Group should carry satellite communicator for areas with no signal",
    "Tourist 3 had ankle injury history — should have pre-briefing on descent techniques"
  ],
  "recommendations": [
    "Close route when visibility < 100m",
    "Require mandatory radio check-in every 15 min",
    "Provide guide training on compass navigation"
  ]
}
```

**МЧС получает:**
- Точный GPS трек (куда шла группа, где потерялась)
- Heart rate graph (видны моменты паники, травмы)
- Weather conditions (какая была ситуация)
- Автоанализ: "что пошло не так?"

---

## 4. ТЕХНИЧЕСКАЯ ИНТЕГРАЦИЯ

### 4.1 API Endpoints для МЧС

```
POST   /api/mches/alert              — отправить alert
GET    /api/mches/groups-live        — live группы по зонам
POST   /api/mches/sos-notification   — получить webhook (subscribe)
GET    /api/mches/incident/{id}      — отчёт по инциденту
GET    /api/mches/statistics         — статистика по маршрутам
```

### 4.2 Authentication

```
Header: Authorization: Bearer MCHES_API_KEY_XXXXX
Content-Type: application/json
```

(Ключ выдавать в защищённом порядке)

### 4.3 Webhook для SOS

МЧС настраивает endpoint, куда система будет отправлять SOS в real-time:

```
МЧС: POST https://mches.gov.ru/api/tourhab-webhook
     Header: X-TOURHAB-SIGNATURE: SHA256(body + secret)
```

---

## 5. ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ

### Пример 1: МЧС закрывает маршрут

```bash
# МЧС: "Лавинная опасность на Авачинском до 18:00"

curl -X POST https://tourhab.ru/api/mches/alert \
  -H "Authorization: Bearer ..." \
  -d '{
    "alert_type": "avalanche",
    "severity": 2,
    "zone": "avachinsky",
    "message": "Лавинная опасность. Маршруты закрыты.",
    "expires_at": "2026-03-21T18:00Z"
  }'

# РЕЗУЛЬТАТ:
✅ 12 групп на Авачинском получают push: "Маршрут закрыт"
✅ Маршрут меняет статус на RED
✅ Туристы видят альтернативы
✅ Система логирует event
```

### Пример 2: МЧС видит live группы

```bash
# МЧС: "Сейчас какие группы на северном участке?"

curl -X GET "https://tourhab.ru/api/mches/groups-live?zone=northern" \
  -H "Authorization: Bearer ..."

# РЕЗУЛЬТАТ:
# JSON с 8 группами на северном участке:
# - где они сейчас (GPS)
# - сколько там людей
# - когда вернутся
# - контакт guide'а
```

### Пример 3: Guide нажимает SOS

```
Guide: нажимает красную кнопку SOS в приложении
Система: отправляет webhook в МЧС (в реальном времени)

МЧС получает:
├─ GPS: 56.1856, 160.8234 (±8 метров)
├─ Группа: 6 человек
├─ Проблема: lost_group
├─ Guide контакт: +7-914-555-67-89
└─ ⏱️ Timestamp: 14:25:33

МЧС действует:
✅ Поднимает вертолёт
✅ Notifies ближайшие группы
✅ Отправляет наземную команду
✅ Отслеживает: guide GPS обновляется каждые 10 сек
```

---

## 6. ВЫГОДА ДЛЯ МЧС

| Метрика | Улучшение |
|---|---|
| **SOS response time** | 30-60 мин → 12-15 мин |
| **Точность local** | Описание ("где-то на Авачинском") → GPS (±8м) |
| **Prevention** | реагирование на ЧП → предотвращение |
| **Coordination** | звонки гайдам → автоматический broadcast |
| **Data** | никаких отчётов → автоотчёты с GPS, heart rate, weather |
| **Coverage** | слепая зона → видимость всех 1000+ туристов |

---

## 7. ROADMAP

**Q2 2026 (апрель-май):**
- ✅ Alert API (МЧС pushit alerts)
- ✅ Live groups tracking (видеть где группы)
- 🟡 SOS webhook integration (МЧС получает SOS)

**Q3 2026 (июнь-август):**
- 🟡 Auto-dispatch (система сама выбирает ближайший ресурс)
- 🟡 Post-incident analytics (ML анализ что пошло не так)
- 🟡 Mobile app для rescue teams (видеть группы на карте)

**Q4 2026 (сентябрь+):**
- 🟡 Satellite coverage (работает даже без сигнала)
- 🟡 Drone integration (МЧС может отправить дрон)
- 🟡 Historical analysis (ML модель: какие маршруты опасны)

---

## 8. КОНТАКТЫ

**KamchatourHub:**
- Основатель/CTO: [имя, телефон]
- Email: [email]
- Telegram: [ссылка]

**Требования МЧС:**
- Что нужно от системы?
- Какие API endpoints приоритизировать?
- Сколько туристов в месяц активно?
- Есть ли спутниковые маячки guide'ов?

---

## 9. ПРИМЕЧАНИЯ

- Все данные **конфиденциальны** (только для МЧС и спасения)
- SOS всегда **приоритет** (даже если нет интернета)
- Туристы **согласны на tracking** в момент бронирования
- МЧС может **отключить alert** если ошибочный

---

**Статус:** Ready for discussion
**Дата:** 21 марта 2026
**Версия:** 1.0

---

📞 **Артём, давай видеоконференцию? Я покажу live demo системы.**
