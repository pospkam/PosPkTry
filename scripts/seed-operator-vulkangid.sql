-- Seed: Вулкан Гид → partners
-- Оператор вулканических треккинг-туров на Камчатке
-- Использование: psql $DATABASE_URL -f scripts/seed-operator-vulkangid.sql

INSERT INTO partners (
  name, category, description, short_description, slug,
  contact, legal_info, operator_info,
  hero_image, gallery, services, features, faq, season_info, reviews_data, contacts, location,
  rating, review_count, is_verified, is_public, status
) VALUES (
  'Вулкан Гид',
  'operator',
  'Профессиональные восхождения на вулканы Камчатки и треккинг-туры. Авачинский, Мутновский, Вилючинский, Горелый — всё год. Опытные сертифицированные гиды, полное снаряжение, безопасность на высоте. Более 2000 туристов с 2015 года.',
  'Восхождения на вулканы и треккинг туры. Авачинский, Мутновский, Горелый. Маршруты от 1 до 7 дней.',
  'vulkan-gid',

  '{"phone": "+79147710001", "email": "info@vulkan-gid.ru", "website": "vulkan-gid.ru", "telegram": "@vulkangid"}'::jsonb,

  '{"companyName": "ИП Соколов Виктор Алексеевич", "inn": "410115003201", "address": "683013, г. Петропавловск-Камчатский, пр. Победы, 43/1", "license": "Реестр туроператоров РТО 009142"}'::jsonb,

  '{"tourRegistryNumber": "РТО 009142", "hasFinancialGuarantee": true, "insurance": "Альфастрахование, полис №28731410"}'::jsonb,

  '/images/bento/mutnovsky.jpg',

  '["/images/bento/mutnovsky.jpg","/images/gallery/aurora.jpg","/images/gallery/camp-sunset.jpg","/images/activities/volcanoes.jpg","/images/gallery/bay-sunset.jpg","/images/gallery/road-winter.jpg"]'::jsonb,

  '[
    {"title":"Авачинский за один день","desc":"Классическое восхождение на «домашний вулкан» Камчатки. Высота 2741 м, средний уровень сложности. Выход на кратер с видом на Тихий океан.","prices":{"winter":"от 4 500 руб","summer":"от 3 500 руб"},"includes":["Трансфер из П-К","Гид-инструктор","Чай на вершине","Страховка"]},
    {"title":"Мутновский и Горелый — 2 дня","desc":"Два действующих вулкана за один поход. Фумарольное поле Мутновского, лавовые поля Горелого, геотермальные источники. Ночёвка в лагере.","prices":{"summer":"от 8 500 руб"},"includes":["Ночёвка в палатках","Питание 3 раза","Гид-инструктор","Снаряжение","Трансфер"]},
    {"title":"Вилючинский по снегу","desc":"Зимнее восхождение на Вилючинский вулкан с видом на Авачинскую бухту. Для любителей зимних приключений. Ски-тур по свежему снегу.","prices":{"winter":"от 5 500 руб"},"includes":["Снаряжение для снега","Гид","Горячий обед","Фотосессия"]}
  ]'::jsonb,

  '[
    {"icon":"Shield","title":"Сертифицированные гиды","desc":"Все гиды — инструкторы МЧС и туризма с допуском к высокогорным маршрутам."},
    {"icon":"Mountain","title":"2000+ туристов","desc":"С 2015 года провели более 2000 туристов на 12 вулканов Камчатки."},
    {"icon":"Compass","title":"Все уровни сложности","desc":"Маршруты для новичков (Авачинский), сложные (Ключевская) и зимние восхождения."},
    {"icon":"Calendar","title":"Круглый год","desc":"Летние треккинги и зимние снежные восхождения и ски-туры."},
    {"icon":"Users","title":"До 12 человек в группе","desc":"Небольшие группы для комфорта и безопасности каждого участника."},
    {"icon":"Star","title":"Рейтинг 4.8","desc":"156 отзывов от туристов на Tripadvisor, Яндекс.Картах и туристических форумах."}
  ]'::jsonb,

  '[
    {"q":"Нужна ли физическая подготовка?","a":"Для Авачинского — минимальная. Нужно уметь ходить 8–10 часов. Для Мутновского и Горелого — умеренная. Для зимних восхождений — опыт длительных походов обязателен."},
    {"q":"Что взять с собой?","a":"Треккинговые ботинки, тёплые слои, дождевик. Всё специальное снаряжение (каски, кошки при необходимости) мы предоставляем."},
    {"q":"Когда лучший сезон?","a":"Июль — сентябрь — основной сезон. Снег сходит в июне. Зимние туры: январь — март."},
    {"q":"Берёте ли детей?","a":"Авачинский — от 12 лет со взрослым. Другие вулканы — от 16 лет. Оцениваем индивидуально."}
  ]'::jsonb,

  '[
    {"months":"Июль — Август","fish":"Пик треккинг-сезона, все маршруты открыты","season":"Лето"},
    {"months":"Сентябрь","fish":"Золотой сезон — осенние краски, без туристических толп","season":"Осень"},
    {"months":"Январь — Март","fish":"Зимние восхождения и ски-туры по вулканическим склонам","season":"Зима"},
    {"months":"Июнь","fish":"Начало сезона, снег на верхних участках, прохладно","season":"Весна"}
  ]'::jsonb,

  '[
    {"name":"Алексей","date":"Август 2025","text":"Восхождение на Авачинский — незабываемо. Гид Виктор знает каждый камень. Вышли в 4 утра, к обеду были на кратере. Вид на Охотское море и Авачинскую бухту — словами не описать.","source":"Tripadvisor","verified":true},
    {"name":"Марина и Дима","date":"Июль 2025","text":"Брали 2-дневный тур на Мутновский и Горелый. Организация на высшем уровне, питание вкусное, гид профессиональный. Особенно впечатлило фумарольное поле — как на другой планете.","source":"Яндекс.Карты","verified":true},
    {"name":"Семья Петровых","date":"Сентябрь 2025","text":"Синтетические впечатления! Взяли с собой 13-летнего сына на Авачинский. Гид адаптировал темп, мальчик дошёл до вершины. Теперь мечтает снова на Камчатку.","source":"Google Maps","verified":false}
  ]'::jsonb,

  '[
    {"name":"Виктор Соколов","phone":"+79147710001","role":"Директор, главный гид","address":"г. Петропавловск-Камчатский, пр. Победы, 43/1"}
  ]'::jsonb,

  '{"lat": 53.2595, "lng": 158.8308, "address": "Авачинский перевал, подъезд к вулканам"}'::jsonb,

  4.8,
  156,
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

SELECT id, name, slug, is_public, is_verified FROM partners WHERE slug = 'vulkan-gid';
