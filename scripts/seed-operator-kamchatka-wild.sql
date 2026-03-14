-- Seed: Камчатка Дикая → partners
-- Оператор экотуров: медведи, дикая природа, вертолётные туры
-- Использование: psql $DATABASE_URL -f scripts/seed-operator-kamchatka-wild.sql

INSERT INTO partners (
  name, category, description, short_description, slug,
  contact, legal_info, operator_info,
  hero_image, gallery, services, features, faq, season_info, reviews_data, contacts, location,
  rating, review_count, is_verified, is_public, status
) VALUES (
  'Камчатка Дикая',
  'operator',
  'Экотуры и наблюдение за дикой природой на Камчатке. Медведи на Курильском озере, вертолётные экскурсии, морские прогулки с касатками и сивучами. Бережный экотуризм без нарушения дикой природы. Аккредитованы Кроноцким заповедником.',
  'Экотуры: медведи на Курильском озере, вертолёты, касатки. Аккредитованы Кроноцким заповедником.',
  'kamchatka-wild',

  '{"phone": "+79147750023", "phone2": "+74152200145", "email": "wild@kamchatka-wild.ru", "telegram": "@kamchatka_wild"}'::jsonb,

  '{"companyName": "ООО «Камчатка Дикая»", "inn": "4100054892", "ogrn": "1224100001053", "address": "683000, г. Петропавловск-Камчатский, ул. Ленинградская, 89, офис 4"}'::jsonb,

  '{"tourRegistryNumber": "РТО 008917", "hasFinancialGuarantee": true, "accreditations": ["Кроноцкий заповедник", "Южно-Камчатский федеральный заказник"]}'::jsonb,

  '/images/activities/helicopter.jpg',

  '["/images/activities/helicopter.jpg","/images/gallery/aurora.jpg","/images/gallery/bay-sunset.jpg","/images/activities/sea.jpg","/images/gallery/stela.jpg","/images/gallery/sunset-clouds.jpg"]'::jsonb,

  '[
    {"title":"Медведи на Курильском озере","desc":"Поездка на Курильское озеро — ключевое место нереста нерки и наблюдения за бурыми медведями. До 50 медведей одновременно на берегу. Вылет вертолётом.","prices":{"summer":"от 45 000 руб"},"includes":["Вертолёт Ми-8","Егерь-сопровождающий","Питание","Страховка"]},
    {"title":"Долина гейзеров с вертолёта","desc":"Объект ЮНЕСКО. 40 крупных гейзеров и более 200 выходов пара. Горячие источники, каньоны и уникальные термофилы. Единственный способ добраться — вертолёт.","prices":{"summer":"от 38 000 руб"},"includes":["Вертолёт Ми-8","Гид","Термальная ванна","Пикник на природе"]},
    {"title":"Морской тур: касатки и сивучи","desc":"Катамаран по Авачинской бухте и в Тихий океан. Касатки, косатки, морские выдры, сивуч. Мыс Кекурный с лежбищем 400+ сивучей. 6 часов на воде.","prices":{"summer":"от 8 500 руб"},"includes":["Катамаран на 12 чел","Гид-натуралист","Горячий чай","Дождевики"]}
  ]'::jsonb,

  '[
    {"icon":"Bird","title":"Аккредитованный экотуризм","desc":"Работаем по разрешениям Кроноцкого заповедника и Южно-Камчатского заказника."},
    {"icon":"Shield","title":"Безопасность с дикими животными","desc":"Наши гиды — бывшие инспекторы заповедника. Соблюдаем дистанцию 50+ метров."},
    {"icon":"Mountain","title":"Вертолёты Ми-8","desc":"Единственный способ попасть в Долину гейзеров и Курильское озеро — с нами."},
    {"icon":"Waves","title":"Морские экскурсии","desc":"Собственный катамаран для морских туров вдоль Авачинской бухты."},
    {"icon":"Compass","title":"Редкие маршруты","desc":"Толбачик, Карымское озеро, вулкан Горелый с видом на кальдеру — маршруты не для всех."},
    {"icon":"Star","title":"Рейтинг 4.9","desc":"89 восторженных отзывов — самый высокий рейтинг среди операторов Камчатки."}
  ]'::jsonb,

  '[
    {"q":"Можно ли получить гарантию встречи с медведями?","a":"100% гарантии нет — это дикие животные. Но Курильское озеро в период нереста (июль — август) — лучшее место в России для встречи с медведями. За 7 лет работы наши гости видели медведей в 98% поездок."},
    {"q":"Насколько безопасно?","a":"Очень безопасно при соблюдении правил. Наши гиды — бывшие инспекторы заповедника. Вы никогда не подходите ближе 50 метров без специального сопровождения. За всю историю компании — ни одного инцидента."},
    {"q":"Когда сезон для экотуров?","a":"Основной сезон: июль — сентябрь. Медведи на озере: июль — август (нерест). Касатки в бухте: июнь — октябрь. Северное сияние (бонус): сентябрь — октябрь."},
    {"q":"Можно ли с детьми?","a":"Морской тур — от 6 лет. Наземные экотуры — от 10 лет. Вертолётные туры на Курильское озеро — от 12 лет. Предупреждайте при бронировании."}
  ]'::jsonb,

  '[
    {"months":"Июль — Август","fish":"Пик сезона медведей на Курильском озере (нерест нерки)","season":"Лето"},
    {"months":"Июнь — Октябрь","fish":"Морские туры с касатками и сивучами в Авачинской бухте","season":"Лето"},
    {"months":"Август — Сентябрь","fish":"Вертолётные экскурсии в Долину гейзеров — без снега","season":"Осень"},
    {"months":"Сентябрь — Октябрь","fish":"Осенние цвета тундры, медведи готовятся к зимовке, первые снега","season":"Осень"}
  ]'::jsonb,

  '[
    {"name":"Иван Громов","date":"Август 2025","text":"Курильское озеро — это что-то нереальное. Мы стояли в 70 метрах от 12 медведей, которые ловили рыбу прямо у нас на глазах. Гиды профессионалы — держат дистанцию, рассказывают всё о медведях. Лучший опыт в моей жизни.","source":"Tripadvisor","verified":true},
    {"name":"Светлана","date":"Июль 2025","text":"Взяла морской тур с касатками. Вышли из бухты — и через час у нас был целый косяк косаток, прыгавших прямо у борта. Гид-натуралист объяснял поведение каждого животного. Незабываемо!","source":"Google Maps","verified":true},
    {"name":"Семья из Мюнхена","date":"Сентябрь 2025","text":"We took 3 tours with Kamchatka Wild. Bears at Kurilskoye Lake, Valley of Geysers, and boat with orcas. Every single tour exceeded our expectations. This is what wildlife tourism should be.","source":"Booking.com","verified":true}
  ]'::jsonb,

  '[
    {"name":"Наталья Звягинцева","phone":"+79147750023","role":"Менеджер по турам","address":"г. Петропавловск-Камчатский, ул. Ленинградская, 89"},
    {"name":"Диспетчер вертолётных туров","phone":"+74152200145","role":"Вертолётные программы"}
  ]'::jsonb,

  '{"lat": 53.0444, "lng": 158.6483, "address": "г. Петропавловск-Камчатский, ул. Ленинградская, 89"}'::jsonb,

  4.9,
  89,
  TRUE,
  TRUE,
  'active'
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  hero_image = EXCLUDED.hero_image,
  gallery = EXCLUDED.gallery,
  services = EXCLUDED.services,
  features = EXCLUDED.features,
  faq = EXCLUDED.faq,
  season_info = EXCLUDED.season_info,
  reviews_data = EXCLUDED.reviews_data,
  contacts = EXCLUDED.contacts,
  location = EXCLUDED.location,
  rating = EXCLUDED.rating,
  review_count = EXCLUDED.review_count,
  is_verified = EXCLUDED.is_verified,
  is_public = EXCLUDED.is_public,
  status = EXCLUDED.status;

SELECT id, name, slug, is_public, is_verified FROM partners WHERE slug = 'kamchatka-wild';
