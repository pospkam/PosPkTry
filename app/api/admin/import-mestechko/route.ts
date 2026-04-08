/**
 * GET /api/admin/import-mestechko?secret=...
 * Одноразовый импорт туров с mestechkokam.ru в БД.
 * Создаёт партнёра "Местечко Камчатка" и 20 туров с фото.
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import { hashPassword } from '@/lib/auth/password';

export const dynamic = 'force-dynamic';

const BASE = 'https://mestechkokam.ru/wp-content/uploads';

const INCLUDED_DEFAULT = JSON.stringify(['Услуги гида', 'Экскурсионная программа', 'Обед', 'Сбор за посещение заповедника']);
const WHAT_TO_BRING    = JSON.stringify(['Солнечные очки', 'Рюкзак', 'Фотоаппарат', 'Удобная обувь', 'Ветровка']);
const INCLUDED_HELI    = JSON.stringify(['Трансфер в аэропорт', 'Вертолётный перелёт', 'Услуги гида', 'Сборы заповедника', 'Обед']);
const INCLUDED_SNOW    = JSON.stringify(['Трансфер из отеля', 'Необходимое снаряжение', 'Питание', 'Страховка']);
const INCLUDED_FISH    = JSON.stringify(['Проживание на базе', '3-разовое питание + ланч', 'Аренда моторной лодки', 'Гид-рыбак', 'Разрешение на вылов', 'Баня', 'Трансфер до базы', 'Страховка']);

const TOURS = [
  // ── ДЖИП / АВТОМОБИЛЬНЫЕ ─────────────────────────────────────────────────
  {
    title: 'Вулкан Горелый. Тайна кратера',
    short_description: 'Восхождение на вулкан Горелый с лунными пейзажами и кратерными озёрами',
    description: 'Экспедиция на вулкан Горелый — лунные пейзажи, фантастические пики и кратеры. Ранний выезд, живописная дорога через природные зоны, 3-часовое восхождение к вершине. Один из самых доступных активных вулканов Камчатки. Скидка 10% для детей до 10 лет.',
    activity_type: 'trekking',
    location_name: 'Вулкан Горелый',
    base_price: 15000,
    duration_hours: 10,
    difficulty: 'medium',
    max_participants: 12,
    season_start: '2026-06-01',
    season_end: '2026-10-31',
    included: INCLUDED_DEFAULT,
    what_to_bring: WHAT_TO_BRING,
    photos: [
      `${BASE}/2023/04/gorel-1.jpg`,
      `${BASE}/2023/04/gorel-2.jpg`,
      `${BASE}/2023/04/gorel-3.jpg`,
      `${BASE}/2023/04/gorel-4.jpg`,
      `${BASE}/2023/04/gorel-5.jpg`,
      `${BASE}/2023/04/gorel-6.jpg`,
    ],
  },
  {
    title: 'Озеро Толмачёво',
    short_description: 'Джип-тур к живописному горному озеру с видами на вулканы Опала и Большая Ипелька',
    description: 'Путешествие к озеру Толмачёво на внедорожниках через вулканические ландшафты. Смотровые площадки на вулканы Большая Ипелька и Опала, кратерное озеро-маар «Медвежий кубок». Нетронутая природа и уникальные фотовозможности. Скидка 10% для детей до 10 лет.',
    activity_type: 'jeep',
    location_name: 'Озеро Толмачёво',
    base_price: 14000,
    duration_hours: 10,
    difficulty: 'easy',
    max_participants: 10,
    season_start: '2026-06-01',
    season_end: '2026-10-31',
    included: INCLUDED_DEFAULT,
    what_to_bring: WHAT_TO_BRING,
    photos: [
      `${BASE}/2023/04/tolm1.jpg`,
      `${BASE}/2023/04/tolm2.jpg`,
      `${BASE}/2023/04/tolmob.jpg`,
    ],
  },
  {
    title: 'Халактырский пляж',
    short_description: 'Чёрный вулканический пляж Тихого океана — уникальный природный феномен',
    description: 'Экскурсия на знаменитый Халактырский пляж с чёрным вулканическим песком. Прогулка вдоль Тихого океана, свежий морской воздух, панорамные виды на океан и вулканы. Подходит для всей семьи.',
    activity_type: 'jeep',
    location_name: 'Халактырский пляж',
    base_price: 7000,
    duration_hours: 5,
    difficulty: 'easy',
    max_participants: 12,
    season_start: '2026-05-01',
    season_end: '2026-10-31',
    included: INCLUDED_DEFAULT,
    what_to_bring: WHAT_TO_BRING,
    photos: [
      `${BASE}/2023/04/halack-01.jpg`,
      `${BASE}/2023/04/halack-02.jpg`,
      `${BASE}/2023/04/halack-03.jpg`,
      `${BASE}/2023/04/halack-04.jpg`,
      `${BASE}/2023/04/halack-05.jpg`,
      `${BASE}/2023/04/halack-06.jpg`,
    ],
  },
  {
    title: 'Толбачик Standard',
    short_description: 'Многодневная джип-экспедиция к знаменитому активному вулкану Толбачик',
    description: 'Джип-экспедиция к вулкану Толбачик — одному из известнейших активных вулканов России. «Язык лавы», вулканические ландшафты, Северный прорыв 1975 года, «Спираль желаний», лавовые пещеры, ночёвка в «Мёртвом лесу» с наблюдением звёздного неба. Сезон: середина июля — начало октября.',
    activity_type: 'jeep',
    location_name: 'Вулкан Толбачик',
    base_price: 115000,
    duration_hours: 48,
    duration_type: 'multi_day',
    multi_day_count: 3,
    difficulty: 'hard',
    max_participants: 8,
    season_start: '2026-07-15',
    season_end: '2026-10-05',
    included: INCLUDED_DEFAULT,
    what_to_bring: WHAT_TO_BRING,
    photos: [
      `${BASE}/2023/04/tolbachik-01.jpg`,
      `${BASE}/2023/04/tolbachik-02.jpg`,
      `${BASE}/2023/04/tolbachik-03.jpg`,
      `${BASE}/2023/04/tolbachik-04.jpg`,
      `${BASE}/2023/04/tolbachik-06.jpg`,
      `${BASE}/2023/04/tolbachik-07.jpg`,
      `${BASE}/2023/02/tolb1.jpg`,
      `${BASE}/2023/02/tolb2.jpg`,
      `${BASE}/2023/02/tolb3.jpg`,
      `${BASE}/2023/02/tolb4.jpg`,
      `${BASE}/2023/02/tolb5.jpg`,
      `${BASE}/2023/03/spiral.jpg`,
    ],
  },
  {
    title: 'Авачинский перевал',
    short_description: 'Джип-тур с восхождением на гору Верблюд и видами на два вулкана',
    description: 'Приключенческий джип-тур через русло Сухой речки к Авачинскому перевалу. Восхождение на гору Верблюд с панорамными видами на вулканы Авачинский и Корякский, Тихий океан, города Петропавловск-Камчатский и Елизово. Берингийские суслики. Скидка 10% для детей до 10 лет.',
    activity_type: 'jeep',
    location_name: 'Авачинский перевал',
    base_price: 11000,
    duration_hours: 8,
    difficulty: 'medium',
    max_participants: 10,
    season_start: '2026-06-01',
    season_end: '2026-10-31',
    included: INCLUDED_DEFAULT,
    what_to_bring: WHAT_TO_BRING,
    photos: [
      `${BASE}/2023/04/avachinski1.jpg`,
      `${BASE}/2023/04/avachinski2.jpg`,
      `${BASE}/2023/04/avach-01.jpg`,
      `${BASE}/2023/04/avach-02.jpg`,
      `${BASE}/2023/04/avach-03.jpg`,
      `${BASE}/2023/04/avach-04.jpg`,
    ],
  },
  {
    title: 'Мыс Маячный',
    short_description: 'Экскурсия к Тихому океану и старинному Петропавловскому маяку на внедорожниках',
    description: 'Автомобильная экскурсия к мысу Маячный на специально подготовленных внедорожниках. Бухты Большая, Средняя и Малая Лагерные, смотровая площадка с видом на Авачинскую бухту и вулкан Вилючинский, береговая линия Тихого океана, старинный Петропавловский маяк и скалы Три Брата. Скидка 10% для детей до 10 лет.',
    activity_type: 'jeep',
    location_name: 'Мыс Маячный',
    base_price: 10000,
    duration_hours: 8,
    difficulty: 'easy',
    max_participants: 12,
    season_start: '2026-05-01',
    season_end: '2026-11-30',
    included: INCLUDED_DEFAULT,
    what_to_bring: WHAT_TO_BRING,
    photos: [
      `${BASE}/2023/04/mayach-01.jpg`,
      `${BASE}/2023/04/mayach-02.jpg`,
      `${BASE}/2023/04/mayach-03.jpg`,
      `${BASE}/2023/04/mayach-04.jpg`,
      `${BASE}/2023/04/mayach-05.jpg`,
      `${BASE}/2023/04/mayach-06.jpg`,
    ],
  },
  {
    title: 'Горный массив Вачкажец. Флора и фауна',
    short_description: 'Джип-тур к уникальному горному массиву с горным озером, водопадами и термальными источниками',
    description: 'Автомобильная экскурсия по южному горному массиву Камчатки. Редкая дикая природа: камчатские медведи, эндемичные растения. Озеро Тахколоч, горные смотровые площадки, водопады, термальные источники. Пешие прогулки по тайге. Скидка 10% для детей до 10 лет.',
    activity_type: 'trekking',
    location_name: 'Горный массив Вачкажец',
    base_price: 15000,
    duration_hours: 10,
    difficulty: 'medium',
    max_participants: 10,
    season_start: '2026-06-01',
    season_end: '2026-10-31',
    included: INCLUDED_DEFAULT,
    what_to_bring: WHAT_TO_BRING,
    photos: [
      `${BASE}/2023/04/vach-01.jpg`,
      `${BASE}/2023/04/vach-02.jpg`,
      `${BASE}/2023/04/vach-03.jpg`,
      `${BASE}/2023/04/vach-04.jpg`,
      `${BASE}/2023/04/vach-05.jpg`,
      `${BASE}/2023/04/vach-06.jpg`,
      `${BASE}/2023/04/vach-07.jpg`,
      `${BASE}/2023/04/vach-08.jpg`,
      `${BASE}/2023/04/vach-09.jpg`,
    ],
  },
  {
    title: 'Дачные геотермальные источники (Малая Долина Гейзеров)',
    short_description: 'Джип-тур к кипящим источникам, паровым jets и грязевым котлам у вулкана Мутновский',
    description: 'Джип-тур к Малой Долине Гейзеров на северном склоне вулкана Мутновский. Кипящие источники, паровые струи, грязевые котлы и вулканические конусы на высоте более 1000 м. 40-минутный пеший переход к геотермальной площадке. Водопад Спокойный, купание в горячих источниках. Сезон: июнь — октябрь. Скидка 10% для детей до 10 лет.',
    activity_type: 'jeep',
    location_name: 'Вулкан Мутновский',
    base_price: 14000,
    duration_hours: 10,
    difficulty: 'medium',
    max_participants: 10,
    season_start: '2026-06-01',
    season_end: '2026-10-31',
    included: INCLUDED_DEFAULT,
    what_to_bring: WHAT_TO_BRING,
    photos: [
      `${BASE}/2023/04/dach-01.jpg`,
      `${BASE}/2023/04/dach-02.jpg`,
      `${BASE}/2023/04/dach-03.jpg`,
      `${BASE}/2023/04/dach-04.jpg`,
      `${BASE}/2023/04/dach-05.jpg`,
      `${BASE}/2023/04/dach-06.jpg`,
      `${BASE}/2023/04/dach-07.jpg`,
      `${BASE}/2023/04/dach-08.jpg`,
      `${BASE}/2023/04/dach-09.jpg`,
    ],
  },

  // ── ВЕРТОЛЁТНЫЕ ──────────────────────────────────────────────────────────
  {
    title: 'Долина гейзеров и вулкан Толбачик (вертолёт)',
    short_description: 'Вертолётный тур к Долине гейзеров и лавовым полям Толбачика за один день',
    description: 'Уникальный комбинированный вертолётный маршрут. Долина гейзеров — единственная в Евразии, более 200 термальных источников и около 90 гейзеров. Затем — вулкан Толбачик: воздушные виды лавовых потоков и кратеров. Налёт ~5 часов, всего ~8 часов.',
    activity_type: 'helicopter',
    location_name: 'Долина гейзеров, вулкан Толбачик',
    base_price: 170000,
    duration_hours: 8,
    difficulty: 'easy',
    max_participants: 8,
    weather_dependent: true,
    season_start: '2026-06-01',
    season_end: '2026-10-31',
    included: INCLUDED_HELI,
    what_to_bring: WHAT_TO_BRING,
    photos: [
      `${BASE}/2023/02/milk1.jpg`,
      `${BASE}/2023/02/milk2.jpg`,
      `${BASE}/2023/03/tolbach.jpg`,
      `${BASE}/2023/03/spiral.jpg`,
      `${BASE}/2023/02/tolb1.jpg`,
      `${BASE}/2023/02/tolb4.jpg`,
      `${BASE}/2023/02/tolb5.jpg`,
    ],
  },
  {
    title: 'Озеро Курильское и медведи',
    short_description: 'Вертолётный тур к крупнейшему нерестовому озеру Евразии — наблюдение за медведями',
    description: 'Вертолётный перелёт к озеру Курильское — одному из крупнейших нерестовых озёр Евразии. Наблюдение за бурыми медведями в дикой природе. Облёт вулканов Горелый и Вилючинский, катание на моторной лодке по озеру, посадка в кальдере вулкана Ксудач, отдых в бухте Лиственничная. Вылет 10:00 из аэропорта Елизово.',
    activity_type: 'helicopter',
    location_name: 'Озеро Курильское',
    base_price: 105000,
    duration_hours: 8,
    difficulty: 'easy',
    max_participants: 8,
    weather_dependent: true,
    season_start: '2026-07-01',
    season_end: '2026-10-15',
    included: JSON.stringify(['Трансфер (по запросу)', 'Вертолётный перелёт', 'Сборы заповедника', 'Услуги гида', 'Катание на лодке', 'Обед/бранч']),
    what_to_bring: WHAT_TO_BRING,
    photos: [
      `${BASE}/2023/04/kur.jpg`,
      `${BASE}/2023/04/kur4.jpg`,
      `${BASE}/2023/04/kur5.jpg`,
      `${BASE}/2023/04/kur6.jpg`,
      `${BASE}/2023/04/morsk.jpg`,
      `${BASE}/2023/04/morsk2.jpg`,
      `${BASE}/2023/04/ob3.jpg`,
    ],
  },
  {
    title: 'Долина гейзеров — вылет из Елизово',
    short_description: 'Вертолётный тур в Долину гейзеров с купанием в Налычевских источниках',
    description: 'Вертолётный тур в Долину гейзеров — более 200 термальных источников и около 60 гейзеров, бьющих на десятки метров. Перелёты над вулканами Карымский и Малый Семячик, кальдера Узон, купание в горячих источниках Налычевской долины. Сезон: июнь — сентябрь.',
    activity_type: 'helicopter',
    location_name: 'Долина гейзеров',
    base_price: 105000,
    duration_hours: 8,
    difficulty: 'easy',
    max_participants: 8,
    weather_dependent: true,
    season_start: '2026-06-01',
    season_end: '2026-09-30',
    included: INCLUDED_HELI,
    what_to_bring: WHAT_TO_BRING,
    photos: [
      `${BASE}/2023/02/milk1.jpg`,
      `${BASE}/2023/02/milk2.jpg`,
      `${BASE}/2023/04/kur4.jpg`,
      `${BASE}/2023/03/spiral.jpg`,
    ],
  },
  {
    title: 'Вертолётная экскурсия к вулкану Толбачик',
    short_description: 'Перелёт к Ключевской группе вулканов — Северный прорыв, Спираль желаний, Мёртвый лес',
    description: 'Уникальный маршрут на север Камчатки к Ключевской группе вулканов. Северный прорыв 1975 года, «Спираль желаний», лавовый поток 2012-2013 года, «Мёртвый лес», облёт вулкана Толбачик. Налёт 4,5 часа, полная продолжительность ~7 часов. Вылет 10:00 из аэропорта Елизово.',
    activity_type: 'helicopter',
    location_name: 'Вулкан Толбачик',
    base_price: 165000,
    duration_hours: 7,
    difficulty: 'easy',
    max_participants: 8,
    weather_dependent: true,
    season_start: '2026-06-01',
    season_end: '2026-10-31',
    included: INCLUDED_HELI,
    what_to_bring: WHAT_TO_BRING,
    photos: [
      `${BASE}/revslider/video-media/tol_22.jpeg`,
      `${BASE}/2023/03/trans.jpg`,
      `${BASE}/2023/03/vyl.jpg`,
      `${BASE}/2023/03/spiral.jpg`,
      `${BASE}/2023/02/tolb1.jpg`,
      `${BASE}/2023/02/tolb4.jpg`,
      `${BASE}/2023/02/tolb5.jpg`,
      `${BASE}/2023/03/vozv-1.jpg`,
    ],
  },
  {
    title: 'Облёт вулканов Вилючинский, Мутновский и Горелый',
    short_description: 'Вертолётный облёт трёх вулканов с обедом на перевале Вилючинский',
    description: 'Воздушный тур над тремя потрясающими вулканами: Вилючинский (2173 м) с правильным конусом и геотермальными особенностями, Горелый — с кратерными озёрами бирюзового цвета, Мутновский (2322 м) — фумарольные поля и паровые струи. Посадка на Вилючинском перевале для обеда. Вылет 10:00 из Елизово, ~4 часа.',
    activity_type: 'helicopter',
    location_name: 'Вилючинский, Мутновский, Горелый',
    base_price: 60000,
    duration_hours: 4,
    difficulty: 'easy',
    max_participants: 8,
    weather_dependent: true,
    season_start: '2026-01-01',
    season_end: '2026-12-31',
    included: INCLUDED_HELI,
    what_to_bring: WHAT_TO_BRING,
    photos: [
      `${BASE}/2023/04/gorel-1.jpg`,
      `${BASE}/2023/04/avach-01.jpg`,
      `${BASE}/2023/04/avach-02.jpg`,
    ],
  },
  {
    title: 'Облёт Корякский и Авачинский с купанием в Налычевских источниках',
    short_description: 'Вертолётный тур над двумя главными вулканами Петропавловска и купание в горячих источниках',
    description: 'Адреналин и расслабление в одном туре. Авачинский вулкан (2741 м) с активным кратером, конический Корякский (3456 м). После — купание в диких горячих источниках Налычевской долины. Налёт 1,1 часа, полная длительность 3,5 часа. Вылет 10:00 из Елизово. Работает круглый год.',
    activity_type: 'helicopter',
    location_name: 'Корякский, Авачинский, Налычевские источники',
    base_price: 55000,
    duration_hours: 3.5,
    difficulty: 'easy',
    max_participants: 8,
    weather_dependent: true,
    season_start: '2026-01-01',
    season_end: '2026-12-31',
    included: INCLUDED_HELI,
    what_to_bring: WHAT_TO_BRING,
    photos: [
      `${BASE}/2023/04/avachinski1.jpg`,
      `${BASE}/2023/04/avachinski2.jpg`,
      `${BASE}/2023/04/avach-01.jpg`,
    ],
  },

  // ── МОРСКИЕ ──────────────────────────────────────────────────────────────
  {
    title: 'Остров Старичков',
    short_description: 'Морская прогулка на яхте — птичьи базары, нерпы и сивучи у острова Старичков',
    description: 'Морское путешествие к острову Старичков. 44 гнездовые колонии 10 видов морских птиц, нерпы ларга и островные тюлени. Маршрут: бухта Тихая → остров Бабушкин камень → мыс Станицкий → скалы Три Брата → остров Старичков → мыс Опасный.',
    activity_type: 'sea',
    location_name: 'Остров Старичков, Авачинская бухта',
    base_price: 12000,
    duration_hours: 6,
    difficulty: 'easy',
    max_participants: 15,
    season_start: '2026-05-01',
    season_end: '2026-10-31',
    included: INCLUDED_DEFAULT,
    what_to_bring: WHAT_TO_BRING,
    photos: [
      `${BASE}/2023/04/star-1.jpg`,
      `${BASE}/2023/04/starich-1.jpg`,
      `${BASE}/2023/04/starich-2.jpg`,
      `${BASE}/2023/04/starich-3.jpg`,
      `${BASE}/2023/04/starich-4.jpg`,
      `${BASE}/2023/04/buhrus-03.jpg`,
    ],
  },
  {
    title: 'Бухта Русская',
    short_description: 'Круиз на яхте — сивучи на мысе Кекурный, косатки, киты и птичьи лежбища',
    description: 'Круиз на комфортабельной яхте вдоль побережья Камчатки. Скалистая гряда мыса Кекурного с сивучами, птичьи лежбища с тысячами морских птиц, наблюдение за косатками и китами. Маршрут: бухта Тихая → Бабушкин камень → мыс Станицкий → Три Брата → остров Старичков → мыс Кекурный.',
    activity_type: 'sea',
    location_name: 'Бухта Русская',
    base_price: 20000,
    duration_hours: 8,
    difficulty: 'easy',
    max_participants: 12,
    season_start: '2026-06-01',
    season_end: '2026-10-31',
    included: INCLUDED_DEFAULT,
    what_to_bring: WHAT_TO_BRING,
    photos: [
      `${BASE}/2023/04/buhrus-01.jpg`,
      `${BASE}/2023/04/buhrus-02.jpg`,
      `${BASE}/2023/04/buhrus-03.jpg`,
      `${BASE}/2023/04/starich-1.jpg`,
    ],
  },

  // ── СНЕГОХОДНЫЕ ──────────────────────────────────────────────────────────
  {
    title: 'Снегоходная экскурсия на Авачинский перевал',
    short_description: 'Зимнее приключение на снегоходах к подножию вулканов Авачинский и Корякский',
    description: 'Путешествие на снегоходах к подножию Авачинского (2741 м) и Корякского (3456 м). Маршрут вдоль снежного русла Сухой речки, виды вулканических пиков, ледников и горных хребтов. Трансфер из отеля включён. Возможно самостоятельное управление снегоходом.',
    activity_type: 'snowmobile',
    location_name: 'Авачинский перевал',
    base_price: 10000,
    duration_hours: 5,
    difficulty: 'medium',
    max_participants: 10,
    season_start: '2026-12-01',
    season_end: '2026-04-30',
    included: INCLUDED_SNOW,
    what_to_bring: JSON.stringify(['Тёплая одежда', 'Термобельё', 'Шлем (выдаётся)', 'Перчатки', 'Очки']),
    photos: [
      `${BASE}/2025/01/img38.jpg`,
      `${BASE}/2025/01/img28.jpg`,
      `${BASE}/2025/01/img22.jpg`,
      `${BASE}/2025/01/img37.jpg`,
    ],
  },
  {
    title: 'Снегоходная экскурсия на Мыс Маячный',
    short_description: 'Зимний снегоходный маршрут к Тихому океану с видами на вулканы',
    description: 'Зимнее приключение на снегоходах к мысу Маячный — там снежные ландшафты встречают Тихий океан. Панорамные виды на вулканы, горные хребты и прибрежные скалы. Трансфер из отеля включён. Страховка включена.',
    activity_type: 'snowmobile',
    location_name: 'Мыс Маячный',
    base_price: 10000,
    duration_hours: 5,
    difficulty: 'easy',
    max_participants: 10,
    season_start: '2026-12-01',
    season_end: '2026-04-30',
    included: INCLUDED_SNOW,
    what_to_bring: JSON.stringify(['Тёплая одежда', 'Термобельё', 'Шлем (выдаётся)', 'Перчатки', 'Очки']),
    photos: [
      `${BASE}/2025/01/img42.jpg`,
      `${BASE}/2025/01/img50.jpg`,
      `${BASE}/2025/01/img51.jpg`,
      `${BASE}/2025/01/img52.jpg`,
    ],
  },

  // ── РЫБАЛКА ──────────────────────────────────────────────────────────────
  {
    title: 'Рыбалка на Камчатке',
    short_description: 'Спортивная рыбалка на реке Ушатина в 200 км от Петропавловска — лосось, форель, голец',
    description: 'Спортивная рыбалка на базе «УТЁС» на реке Ушатина в 200 км от Петропавловска-Камчатского. База вмещает до 15 гостей. Рекомендуемый срок — 6 дней. Виды рыб: арктический голец, хариус, мальма, радужная форель, кета, кижуч, горбуша, чавыча, сима. Сезон зависит от вида рыбы: апрель — ноябрь.',
    activity_type: 'fishing',
    location_name: 'Река Ушатина, база Утёс',
    base_price: 80000,
    duration_hours: 144,
    duration_type: 'multi_day',
    multi_day_count: 6,
    difficulty: 'easy',
    max_participants: 15,
    season_start: '2026-04-20',
    season_end: '2026-11-20',
    included: INCLUDED_FISH,
    what_to_bring: JSON.stringify(['Рыболовные снасти', 'Вейдерсы', 'Тёплая одежда', 'Непромокаемая куртка', 'Средство от комаров']),
    photos: [
      `${BASE}/2024/03/r1.jpg`,
      `${BASE}/2024/03/r2.jpg`,
      `${BASE}/2024/03/r3.jpg`,
      `${BASE}/2024/03/r4.jpg`,
      `${BASE}/2024/03/r5.jpg`,
      `${BASE}/2024/03/r6.jpg`,
      `${BASE}/2024/03/r7.jpg`,
      `${BASE}/2024/03/r8.jpg`,
    ],
  },

  // ── ХЕЛИ-СКИ ─────────────────────────────────────────────────────────────
  {
    title: 'Хели-ски на Камчатке',
    short_description: 'Фрирайд на нетронутых вулканических склонах с заброской вертолётом — лучший пудровый снег',
    description: 'Хели-ски на Камчатке — одно из лучших мест в мире для фрирайда. Вертолёт доставляет на нетронутые вершины вулканов, откуда открываются потрясающие спуски по пудровому снегу. 6-13 спусков в день в зависимости от группы. Налёт 4-6 часов/день. Лавинный инструктаж и практика. Сезон: февраль — май.',
    activity_type: 'helicopter',
    location_name: 'Вулканы Камчатки',
    base_price: 250000,
    duration_hours: 48,
    duration_type: 'multi_day',
    multi_day_count: 5,
    difficulty: 'extreme',
    max_participants: 12,
    weather_dependent: true,
    season_start: '2026-02-01',
    season_end: '2026-05-31',
    included: JSON.stringify(['Вертолёт (Ми-8)', 'Гид с сертификатом первой помощи', 'Проживание', 'Лавинный инструктаж', 'Опционально: аренда снаряжения']),
    what_to_bring: JSON.stringify(['Горные лыжи или сноуборд', 'Лавинный рюкзак', 'Бипер', 'Зонд', 'Лопата', 'Шлем', 'Очки', 'Термобельё']),
    photos: [
      `${BASE}/2025/01/img22.jpg`,
      `${BASE}/2025/01/img28.jpg`,
      `${BASE}/2025/01/img37.jpg`,
      `${BASE}/2025/01/img38.jpg`,
    ],
  },
];

export async function GET(req: NextRequest) {
  const secret = new URL(req.url).searchParams.get('secret');
  const expected = process.env.CRON_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Создаём или находим партнёра
    const partnerRes = await client.query(
      `INSERT INTO partners (name, contacts)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [
        'Местечко Камчатка',
        JSON.stringify({
          phone:   '+7 914 998 19 80',
          email:   'mestechko41@mail.ru',
          website: 'https://mestechkokam.ru',
        }),
      ]
    );

    let operatorId: string;
    if (partnerRes.rows.length > 0) {
      operatorId = partnerRes.rows[0].id as string;
    } else {
      const existing = await client.query(
        `SELECT id FROM partners WHERE name = 'Местечко Камчатка' LIMIT 1`
      );
      operatorId = existing.rows[0].id as string;
    }

    // 1b. Создаём или находим пользователя-оператора
    const OPERATOR_EMAIL = 'mestechko41@mail.ru';
    const existingUser = await client.query(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      [OPERATOR_EMAIL]
    );

    let userId: string;
    if (existingUser.rows.length > 0) {
      userId = existingUser.rows[0].id as string;
    } else {
      const pwHash = await hashPassword('1234567890');
      const newUser = await client.query(
        `INSERT INTO users (email, name, role, password_hash, preferences)
         VALUES ($1, $2, 'operator', $3, $4::jsonb)
         RETURNING id`,
        [
          OPERATOR_EMAIL,
          'Местечко Камчатка',
          pwHash,
          JSON.stringify({ force_password_change: true }),
        ]
      );
      userId = newUser.rows[0].id as string;
    }

    // Привязываем партнёра к пользователю
    await client.query(
      `UPDATE partners SET user_id = $1 WHERE id = $2`,
      [userId, operatorId]
    );

    // 2. Вставляем туры
    let inserted = 0;
    const insertedTitles: string[] = [];

    for (const t of TOURS) {
      const slug = t.title
        .toLowerCase()
        .replace(/[^а-яёa-z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .slice(0, 80)
        + '-mestechko';

      await client.query(
        `INSERT INTO operator_tours (
           operator_id, title, short_description, description,
           activity_type, location_name, location_type,
           base_price, currency,
           max_participants, min_participants,
           duration_hours, duration_type, multi_day_count,
           difficulty,
           season_start, season_end, seasonal_only,
           weather_dependent,
           included, what_to_bring,
           photos, tour_image,
           is_active, is_published,
           slug
         ) VALUES (
           $1,$2,$3,$4,
           $5,$6,'region',
           $7,'RUB',
           $8,1,
           $9,$10,$11,
           $12,
           $13,$14,true,
           $15,
           $16::jsonb,$17::jsonb,
           $18,$19,
           true,true,
           $20
         )
         ON CONFLICT (slug) DO NOTHING`,
        [
          operatorId,
          t.title,
          t.short_description,
          t.description,
          t.activity_type,
          t.location_name,
          t.base_price,
          t.max_participants,
          t.duration_hours ?? 8,
          (t as { duration_type?: string }).duration_type ?? 'fixed',
          (t as { multi_day_count?: number }).multi_day_count ?? null,
          t.difficulty,
          t.season_start ?? null,
          t.season_end ?? null,
          (t as { weather_dependent?: boolean }).weather_dependent ?? false,
          t.included,
          t.what_to_bring,
          t.photos,
          t.photos[0],
          slug,
        ]
      );
      inserted++;
      insertedTitles.push(t.title);
    }

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      operator_id: operatorId,
      user_id: userId,
      inserted,
      tours: insertedTitles,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
