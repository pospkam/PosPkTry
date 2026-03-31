-- Migration 117: Reclassify kind in agent_route_knowledge
-- 12 geographic objects: tour → place
-- 2 trails: place → route
-- 1 commercial excursion: place → tour

-- ── tour → place (географические объекты) ────────────────────────────────────

UPDATE agent_route_knowledge SET kind = 'place' WHERE id IN (
  'a34d8fa0-e25d-402d-80ce-24404bf7511f', -- Авачинская бухта — морская прогулка
  'af84b5bb-39eb-4b3e-883d-8aa50641077a', -- Бухта Русская — нетронутая природа
  'fd3feffa-0e07-4a29-b4c8-216666dfe1e8', -- Скалы Три Брата
  '49a1d46a-704b-4307-bb6a-fea5988ec4f8', -- Халактырский пляж
  '9fd7f562-5afc-492c-b670-5ba9ab2d7bed', -- Остров Старичков — птичий базар
  '8ef745b1-7de3-4899-9431-809f9c8521de', -- Курильское озеро — наблюдение за медведями
  'ff6d6ee6-e81a-4f9c-bbf6-6e119e1cafdb', -- Озеро Толмачёво — рыбалка и медведи
  '18c516d2-cfda-43a0-adda-768a125b366b', -- Река Хакыцын — сезон медведей
  '9e0180ff-74d6-45a9-9f71-41fd9d30b9ce', -- Река Авача — рыбалка
  'da5755cb-aa5a-4c50-b6c5-ddbcdceab55c', -- Река Жупанова — рыбалка
  '9ad01c57-7c24-4515-b92d-698bd9a1cb5f', -- Река Камчатка — рыбалка
  '1208a109-c78c-41b3-8f21-4db06d4a13ca'  -- Река Опала — спортивная рыбалка
);

-- ── place → route (тропы/маршруты) ───────────────────────────────────────────

UPDATE agent_route_knowledge SET kind = 'route' WHERE id IN (
  '8afb971c-04a7-4249-88c2-2dea757fa1cb', -- Эко-тропа Тупикин ключ
  '4ed1f995-b31c-4444-a670-3740959285db'  -- Эко-тропа Черемшанка
);

-- ── place → tour (коммерческая экскурсия) ─────────────────────────────────────

UPDATE agent_route_knowledge SET kind = 'tour'
WHERE id = '54e7b462-8eca-40e9-b2aa-96315927158c'; -- Петропавловск-Камчатский — обзорная экскурсия
