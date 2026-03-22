-- fix-operator-images.sql
-- Исправление путей к изображениям операторов.
-- Запустить на продакшн БД: psql $DATABASE_URL -f scripts/fix-operator-images.sql
--
-- Проблема: seed-скрипты указывали несуществующие пути (topkam-hero.jpg,
-- kamchatintour-hero.jpg) или неполные пути в gallery (без /images/fishingkam/).

-- TopKam: реальные фото из public/images/operators/
UPDATE partners
SET
  hero_image = '/images/operators/topkam-1187.jpg',
  gallery = '[
    "/images/operators/topkam-1187.jpg",
    "/images/operators/topkam-1205.jpg",
    "/images/operators/topkam-1300.jpg",
    "/images/operators/topkam-36.jpg",
    "/images/operators/topkam-390.jpg",
    "/images/operators/topkam-67.jpg"
  ]'::jsonb
WHERE slug = 'topkam';

-- Камчатинтур: красивые пейзажи Камчатки
UPDATE partners
SET
  hero_image = '/images/bento/khalaktyr.jpg',
  gallery = '[
    "/images/bento/khalaktyr.jpg",
    "/images/bento/mutnovsky.jpg",
    "/images/bento/paratunka.jpg",
    "/images/gallery/camp-sunset.jpg",
    "/images/gallery/bay-sunset.jpg"
  ]'::jsonb
WHERE slug = 'kamchatintour';

-- Камчатская рыбалка: исправляем пути в gallery (добавляем prefix /images/fishingkam/)
UPDATE partners
SET
  hero_image = '/images/fishingkam/2025-01-27_142444.jpg',
  gallery = '[
    "/images/fishingkam/2025-01-27_142444.jpg",
    "/images/fishingkam/2025-01-27_142653.jpg",
    "/images/fishingkam/2025-01-27_142814.jpg",
    "/images/fishingkam/2025-01-27_142551.jpg",
    "/images/fishingkam/2025-02-10_151416.jpg",
    "/images/fishingkam/2025-02-10_151421.jpg",
    "/images/fishingkam/2025-02-10_151433.jpg",
    "/images/fishingkam/2025-01-09_113928_1_.jpg"
  ]'::jsonb
WHERE slug = 'kamchatskaya-rybalka';

-- Вулкан Гид и Камчатка Дикая уже имеют корректные пути в seed-скриптах
-- vulkan-gid: /images/bento/mutnovsky.jpg
-- kamchatka-wild: /images/activities/helicopter.jpg

SELECT slug, hero_image, jsonb_array_length(gallery) AS gallery_count
FROM partners
WHERE slug IN ('topkam', 'kamchatintour', 'kamchatskaya-rybalka', 'vulkan-gid', 'kamchatka-wild')
ORDER BY slug;
