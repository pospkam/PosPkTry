-- Migration 116: Add source_url + source_name to ~50 ghost locations in agent_route_knowledge
-- All locations already have good descriptions (200+ chars). Only source_url is missing.

-- ── dzhip ────────────────────────────────────────────────────────────────────

UPDATE agent_route_knowledge SET
  source_url  = 'https://ru.wikipedia.org/wiki/Налычево_(природный_парк)',
  source_name = 'wikipedia'
WHERE id = '1616cdf5-e3e1-4354-9d23-056b0b9abdb4'; -- Джип-тур: Природный парк Налычево

UPDATE agent_route_knowledge SET
  source_url  = 'https://ru.wikipedia.org/wiki/Мутновский_(вулкан)',
  source_name = 'wikipedia'
WHERE id = '2a3cc5ab-a7c4-4411-ab83-f0d0508411e2'; -- Джип-тур: вулканы Горелый и Мутновский

-- ── eco ──────────────────────────────────────────────────────────────────────

UPDATE agent_route_knowledge SET
  source_url  = 'https://extraguide.ru/sightmap/?z=14&pt=52.062,157.711&t=Вулкан Ходутка',
  source_name = 'extraguide.ru'
WHERE id = 'a1b2c3d4-e5f6-7890-abcd-ef0123456789'; -- Вулкан Ходутка — затерянный мир

UPDATE agent_route_knowledge SET
  source_url  = 'https://idilesom.com/kam/',
  source_name = 'idilesom.com'
WHERE id = 'b7401013-dee2-48af-ac92-ebc3ea045bcf'; -- Голубые озёра — экотуризм

UPDATE agent_route_knowledge SET
  source_url  = 'https://kamchatka.travel/ru/what-to-see/ethnography',
  source_name = 'kamchatka.travel'
WHERE id = 'b8663d1c-33f6-4aec-a086-cfb3d10268a8'; -- Ительменская деревня — этнотуризм

UPDATE agent_route_knowledge SET
  source_url  = 'https://ru.wikipedia.org/wiki/Петропавловск-Камчатский',
  source_name = 'wikipedia'
WHERE id = '54e7b462-8eca-40e9-b2aa-96315927158c'; -- Петропавловск-Камчатский — обзорная экскурсия

UPDATE agent_route_knowledge SET
  source_url  = 'https://ru.wikipedia.org/wiki/Южно-Камчатский_государственный_природный_заказник',
  source_name = 'wikipedia'
WHERE id = 'd9059e8a-4c59-4baf-9be5-cae2fa33f810'; -- Природный парк Южно-Камчатский

UPDATE agent_route_knowledge SET
  source_url  = 'https://idilesom.com/kam/places/esse',
  source_name = 'idilesom.com'
WHERE id = 'b2c3d4e5-f6a7-8901-bcde-f01234567890'; -- Шаманская поляна у Эссо

UPDATE agent_route_knowledge SET
  source_url  = 'https://kamchatka.travel/ru/what-to-see/parks/bystinsky',
  source_name = 'kamchatka.travel'
WHERE id = '8afb971c-04a7-4249-88c2-2dea757fa1cb'; -- Эко-тропа Тупикин ключ

-- ── geo ──────────────────────────────────────────────────────────────────────

UPDATE agent_route_knowledge SET
  source_url  = 'https://vulcanarium.ru',
  source_name = 'vulcanarium.ru'
WHERE id = 'c1d2e3f4-a5b6-7890-cdef-012345678901'; -- Вулканариум — интерактивный музей вулканов

-- ── geyzery ──────────────────────────────────────────────────────────────────

UPDATE agent_route_knowledge SET
  source_url  = 'https://ru.wikipedia.org/wiki/Дачные_горячие_источники',
  source_name = 'wikipedia'
WHERE id = '2bf92082-0daf-4770-8031-a51c0f355be8'; -- Дачные горячие источники

-- ── historical ───────────────────────────────────────────────────────────────

UPDATE agent_route_knowledge SET
  source_url  = 'https://ru.wikipedia.org/wiki/Петропавловская_оборона',
  source_name = 'wikipedia'
WHERE id = 'a2b3c4d5-e6f7-4890-bcde-f01234567890'; -- Батарея Максутова — позиция 1854 года

UPDATE agent_route_knowledge SET
  source_url  = 'https://ru.wikipedia.org/wiki/Никольская_сопка_(Петропавловск-Камчатский)',
  source_name = 'wikipedia'
WHERE id = 'f1a2b3c4-d5e6-4789-abcd-ef0123456789'; -- Никольская сопка — мемориал

UPDATE agent_route_knowledge SET
  source_url  = 'https://ru.wikipedia.org/wiki/Петропавловская_оборона',
  source_name = 'wikipedia'
WHERE id = 'd5e6f7a8-b9c0-4123-efab-234567890123'; -- Петропавловская оборона 1854 — место сражения

-- ── lakes ────────────────────────────────────────────────────────────────────

UPDATE agent_route_knowledge SET
  source_url  = 'https://ru.wikipedia.org/wiki/Кроноцкое_озеро',
  source_name = 'wikipedia'
WHERE id = 'f1436e9c-2389-4764-b5e6-ef4ee6ffdd37'; -- Кроноцкое озеро

-- ── medvedi ──────────────────────────────────────────────────────────────────

UPDATE agent_route_knowledge SET
  source_url  = 'https://idilesom.com/kam/places/tolmachevo',
  source_name = 'idilesom.com'
WHERE id = 'ff6d6ee6-e81a-4f9c-bbf6-6e119e1cafdb'; -- Озеро Толмачёво — рыбалка и медведи

UPDATE agent_route_knowledge SET
  source_url  = 'https://ru.wikipedia.org/wiki/Курильское_озеро',
  source_name = 'wikipedia'
WHERE id = '18c516d2-cfda-43a0-adda-768a125b366b'; -- Река Хакыцын — сезон медведей

-- ── monument ─────────────────────────────────────────────────────────────────

UPDATE agent_route_knowledge SET
  source_url  = 'https://ru.wikipedia.org/wiki/Беринг,_Витус_Ионассен',
  source_name = 'wikipedia'
WHERE id = 'c4d5e6f7-a8b9-4012-defa-123456789012'; -- Памятник Витусу Берингу

-- ── morskie_progulki ─────────────────────────────────────────────────────────

UPDATE agent_route_knowledge SET
  source_url  = 'https://ru.wikipedia.org/wiki/Авачинская_бухта',
  source_name = 'wikipedia'
WHERE id = 'a34d8fa0-e25d-402d-80ce-24404bf7511f'; -- Авачинская бухта — морская прогулка

UPDATE agent_route_knowledge SET
  source_url  = 'https://spkam.com/stati-o-kamchatke/dostoprimechatelnosti',
  source_name = 'spkam.com'
WHERE id = 'af84b5bb-39eb-4b3e-883d-8aa50641077a'; -- Бухта Русская — нетронутая природа

UPDATE agent_route_knowledge SET
  source_url  = 'https://ru.wikipedia.org/wiki/Остров_Старичков',
  source_name = 'wikipedia'
WHERE id = '9fd7f562-5afc-492c-b670-5ba9ab2d7bed'; -- Остров Старичков — птичий базар

UPDATE agent_route_knowledge SET
  source_url  = 'https://ru.wikipedia.org/wiki/Три_брата_(скалы,_Камчатка)',
  source_name = 'wikipedia'
WHERE id = 'fd3feffa-0e07-4a29-b4c8-216666dfe1e8'; -- Скалы Три Брата

UPDATE agent_route_knowledge SET
  source_url  = 'https://ru.wikipedia.org/wiki/Халактырский_пляж',
  source_name = 'wikipedia'
WHERE id = '49a1d46a-704b-4307-bb6a-fea5988ec4f8'; -- Халактырский пляж

-- ── museum ───────────────────────────────────────────────────────────────────

UPDATE agent_route_knowledge SET
  source_url  = 'https://www.kamchatkamuseum.ru',
  source_name = 'kamchatkamuseum.ru'
WHERE id = 'b3c4d5e6-f7a8-4901-cdef-012345678901'; -- Камчатский краевой объединённый музей

-- ── nature_park ──────────────────────────────────────────────────────────────

UPDATE agent_route_knowledge SET
  source_url  = 'https://ru.wikipedia.org/wiki/Природный_парк_«Налычево»',
  source_name = 'wikipedia'
WHERE id = 'c7b5f423-7e9a-4c6b-a842-4f3e2d1c8b57'; -- Природный парк «Налычево»

-- ── nature_reserve ───────────────────────────────────────────────────────────

UPDATE agent_route_knowledge SET
  source_url  = 'https://ru.wikipedia.org/wiki/Командорский_государственный_природный_биосферный_заповедник',
  source_name = 'wikipedia'
WHERE id = 'a8f3d201-5c9e-4b7a-8d63-2f1e0c4b6a35'; -- Командорский заповедник

UPDATE agent_route_knowledge SET
  source_url  = 'https://ru.wikipedia.org/wiki/Корякский_природный_заповедник',
  source_name = 'wikipedia'
WHERE id = 'b9c4e312-6d8f-4a5b-9c71-3e2f1d0b7a46'; -- Корякский заповедник

-- ── rybalka ──────────────────────────────────────────────────────────────────

UPDATE agent_route_knowledge SET
  source_url  = 'https://spkam.com/stati-o-kamchatke/rybalka-na-kamchatke',
  source_name = 'spkam.com'
WHERE id = 'd3aef5f2-6a6f-458c-bb9a-429108c0161f'; -- Краболовный тур — Авачинская бухта

UPDATE agent_route_knowledge SET
  source_url  = 'https://spkam.com/stati-o-kamchatke/rybalka-na-kamchatke',
  source_name = 'spkam.com'
WHERE id = '7a77f0d0-c170-4dd7-8d64-c6e197a43966'; -- Морская рыбалка — Авачинский залив

UPDATE agent_route_knowledge SET
  source_url  = 'https://ru.wikipedia.org/wiki/Авача_(река)',
  source_name = 'wikipedia'
WHERE id = '9e0180ff-74d6-45a9-9f71-41fd9d30b9ce'; -- Река Авача — рыбалка

UPDATE agent_route_knowledge SET
  source_url  = 'https://ru.wikipedia.org/wiki/Жупанова_(река)',
  source_name = 'wikipedia'
WHERE id = 'da5755cb-aa5a-4c50-b6c5-ddbcdceab55c'; -- Река Жупанова — рыбалка

UPDATE agent_route_knowledge SET
  source_url  = 'https://ru.wikipedia.org/wiki/Камчатка_(река)',
  source_name = 'wikipedia'
WHERE id = '9ad01c57-7c24-4515-b92d-698bd9a1cb5f'; -- Река Камчатка — рыбалка

UPDATE agent_route_knowledge SET
  source_url  = 'https://ru.wikipedia.org/wiki/Опала_(река)',
  source_name = 'wikipedia'
WHERE id = '1208a109-c78c-41b3-8f21-4db06d4a13ca'; -- Река Опала — спортивная рыбалка

-- ── snegohod ─────────────────────────────────────────────────────────────────

UPDATE agent_route_knowledge SET
  source_url  = 'https://ru.wikipedia.org/wiki/Горелый_(вулкан)',
  source_name = 'wikipedia'
WHERE id = '371d8ed2-f6d3-4846-8a7d-86cea6915edd'; -- Снегоходный тур: Горелый и Мутновский

UPDATE agent_route_knowledge SET
  source_url  = 'https://ru.wikipedia.org/wiki/Авачинский_(вулкан)',
  source_name = 'wikipedia'
WHERE id = 'f2acfa97-7e94-489a-af50-c851929a55b7'; -- Снегоходный тур: вулканы Авачинский и Корякский

UPDATE agent_route_knowledge SET
  source_url  = 'https://spkam.com/stati-o-kamchatke/dostoprimechatelnosti',
  source_name = 'spkam.com'
WHERE id = '462df6fd-d242-4e6a-80a8-3e9122dad9c3'; -- Хелискинг — Авачинская группа

UPDATE agent_route_knowledge SET
  source_url  = 'https://ru.wikipedia.org/wiki/Вилючинский_(вулкан)',
  source_name = 'wikipedia'
WHERE id = 'ed630052-d366-4dbf-8433-d38df857bb8a'; -- Хелискинг — вулкан Вилючинский

-- ── termalnye_istochniki ─────────────────────────────────────────────────────

UPDATE agent_route_knowledge SET
  source_url  = 'https://ru.wikipedia.org/wiki/Паратунка_(курорт)',
  source_name = 'wikipedia'
WHERE id = 'bbef9ce7-8d33-4d58-899f-ae349a80ab62'; -- Верхне-Паратунские источники

UPDATE agent_route_knowledge SET
  source_url  = 'https://idilesom.com/kam/places/nachika',
  source_name = 'idilesom.com'
WHERE id = '6d3030d5-04eb-4d0e-b452-7661a0b18277'; -- Начикинские термальные источники

UPDATE agent_route_knowledge SET
  source_url  = 'https://ru.wikipedia.org/wiki/Паратунка_(курорт)',
  source_name = 'wikipedia'
WHERE id = '98d0607d-8547-40a3-8b71-e981b59a31df'; -- Паратунская зона отдыха

-- ── trekking ─────────────────────────────────────────────────────────────────

UPDATE agent_route_knowledge SET
  source_url  = 'https://extraguide.ru/sightmap/?z=14&pt=53.255,158.836&t=Авачинский перевал',
  source_name = 'extraguide.ru'
WHERE id = '7412e1c7-7b5c-4ee0-b0e9-4552bb6ff3ff'; -- Авачинский перевал (база «3 вулкана»)

UPDATE agent_route_knowledge SET
  source_url  = 'https://ru.wikipedia.org/wiki/Вилючинский_водопад',
  source_name = 'wikipedia'
WHERE id = 'dd433aa1-1209-4915-a3e9-e83eacda1489'; -- Вилючинский водопад

UPDATE agent_route_knowledge SET
  source_url  = 'https://ru.wikipedia.org/wiki/Горелый_(вулкан)',
  source_name = 'wikipedia'
WHERE id = 'd4b8bcf6-99f8-4d76-bbad-3cd119e6f008'; -- Лавовые пещеры вулкана Горелый

UPDATE agent_route_knowledge SET
  source_url  = 'https://kamchatka.travel/ru/what-to-see/parks/nalychevo',
  source_name = 'kamchatka.travel'
WHERE id = '48f1d9a2-6afa-481c-a8d0-20c1e97e0f3e'; -- Маршрут Пиначево — Центральный

UPDATE agent_route_knowledge SET
  source_url  = 'https://idilesom.com/kam/places/vachkazhets',
  source_name = 'idilesom.com'
WHERE id = '852b4bce-b6fc-4ab2-8079-d156b615f33d'; -- Маршрут к озёрам Вачкажец

UPDATE agent_route_knowledge SET
  source_url  = 'https://extraguide.ru/sightmap/?z=14&pt=53.255,158.836&t=Авачинский вулкан',
  source_name = 'extraguide.ru'
WHERE id = '55cb0779-4e54-4a2b-9f8d-d84828274a0f'; -- Однодневный поход к Авачинскому вулкану

-- ── vertoletnye_tury ─────────────────────────────────────────────────────────

UPDATE agent_route_knowledge SET
  source_url  = 'https://ru.wikipedia.org/wiki/Долина_гейзеров_(Камчатка)',
  source_name = 'wikipedia'
WHERE id = '46309226-2704-4bae-8812-6c241c517408'; -- Вертолётный тур: Долина гейзеров + Узон

UPDATE agent_route_knowledge SET
  source_url  = 'https://ru.wikipedia.org/wiki/Курильское_озеро',
  source_name = 'wikipedia'
WHERE id = 'e175b4bb-3dae-4afd-b8d0-ada95f4702d5'; -- Вертолётный тур: Курильское озеро

UPDATE agent_route_knowledge SET
  source_url  = 'https://ru.wikipedia.org/wiki/Мутновский_(вулкан)',
  source_name = 'wikipedia'
WHERE id = '8aedc7ab-5b90-469c-96ec-158ea82e92d6'; -- Вертолётный тур: Мутновский + Горелый

UPDATE agent_route_knowledge SET
  source_url  = 'https://ru.wikipedia.org/wiki/Налычево_(природный_парк)',
  source_name = 'wikipedia'
WHERE id = '5939fc71-0833-4ada-a0f2-abc3cd2fc792'; -- Вертолётный тур: Налычево

-- ── vulkani ──────────────────────────────────────────────────────────────────

UPDATE agent_route_knowledge SET
  source_url  = 'https://ru.wikipedia.org/wiki/Ксудач',
  source_name = 'wikipedia'
WHERE id = '768f17d2-e786-4911-9bc5-d8a0dca15ad2'; -- Вулканическая кальдера Ксудач
