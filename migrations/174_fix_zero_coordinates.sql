-- Migration 174: Restore real geographic places hidden due to zero coordinates
-- Sets verified GPS coordinates and makes places visible.
-- Sources: OpenStreetMap Nominatim, Wikipedia, Global Volcanism Program.

-- Верхне-Кошелевские парогидротермальные источники
-- Source: Global Volcanism Program (Koshelev volcano complex), southern Kamchatka
UPDATE places SET lat = 51.3570, lng = 156.7500, is_visible = true
WHERE id = '14999081-db57-43d3-8aad-f6c8361b69ac';

-- Верхне-Паратунские термальные источники
-- Source: Wikipedia (Верхне-Паратунские источники), Yelizovsky district
UPDATE places SET lat = 52.8237, lng = 158.1634, is_visible = true
WHERE id = '75ae94a5-b7aa-4358-9d94-6073f909915d';

-- Горячереченские термальные источники
-- Source: Wikipedia (Горячереченские горячие источники), Nalychevo valley
UPDATE places SET lat = 53.5000, lng = 158.7600, is_visible = true
WHERE id = '7f5284b0-8862-4b11-8a68-2241d359832c';

-- Грифон Иванова
-- Source: Wikimapia, thermal spring in Nalychevo Nature Park
UPDATE places SET lat = 53.5130, lng = 158.7560, is_visible = true
WHERE id = 'a72b9bdd-f035-4273-a4dc-8d53f8b279cb';

-- Дачные термальные источники (Малая долина гейзеров)
-- Source: multiple tourism sources, near Mutnovsky volcano
UPDATE places SET lat = 52.5311, lng = 158.1974, is_visible = true
WHERE id = 'c3a32e0a-e12c-48ef-97d9-312d78baf31c';

-- Малкинские термальные источники
-- Source: OSM Nominatim, Bystrinsky district (corrected from erroneous 54.2N)
UPDATE places SET lat = 53.3219, lng = 157.5380, is_visible = true
WHERE id = '9fb0ba03-e708-4a5b-9b9c-52a2f5280fe8';

-- Малые Банные термальные источники
-- Source: OSM Nominatim, right bank of Maly Klyuch river, 5km from Bolshiye Bannye
UPDATE places SET lat = 52.8635, lng = 157.8451, is_visible = true
WHERE id = '3d4b7d25-1943-45ca-b88b-85b73300537c';

-- Озеро Большой Кар
-- Source: OSM, glacial cirque lake on Vachkazhets massif
UPDATE places SET lat = 52.8750, lng = 158.1000, is_visible = true
WHERE id = '56d16421-ed6c-4650-af9e-1919fbae949f';

-- Озеро Икар
-- Source: OSM, glacial cirque lake on Vachkazhets massif (adjacent to Bolshoy Kar)
UPDATE places SET lat = 52.8800, lng = 158.0900, is_visible = true
WHERE id = 'f616768c-fd81-4745-90d7-1f9fba8fe2b7';

-- Паланские пороги
-- Source: OSM, Palana river rapids, northern Kamchatka (Koryaksky district)
UPDATE places SET lat = 59.0842, lng = 159.9542, is_visible = true
WHERE id = '8ed1e7c5-df06-4bae-9c48-3be6c2890aa0';

-- Под Козельский вулкан
-- Source: Wikipedia (Kozhelsky volcano 53.2270°N 158.8870°E), area at volcano base
UPDATE places SET lat = 53.2269, lng = 158.8889, is_visible = true
WHERE id = '0e5c632b-89cb-4511-9905-83ac54c2c119';

-- Пущинские термальные источники
-- Source: OSM Nominatim (54.0518°N 158.0414°E), Milkovsky district, near Kashkan river
UPDATE places SET lat = 54.0518, lng = 158.0414, is_visible = true
WHERE id = 'e1252887-a232-4ea8-88e2-3d2004ecea7c';

-- ТРОПА МЕДВЕДЯ (ДОЛИНА СМЕРТИ)
-- Source: Wikipedia (Kikhpinych area), Valley of Death near Uzon/Kronotsky reserve
UPDATE places SET lat = 54.4830, lng = 160.2518, is_visible = true
WHERE id = 'e552c8a2-52bd-4f7d-ad37-33b1a28460ab';

-- Таловские термальные источники
-- Source: OSM Nominatim, Nalychevo Nature Park, Yelizovsky district
UPDATE places SET lat = 53.5746, lng = 158.8385, is_visible = true
WHERE id = 'f3c445de-b12b-434b-bc22-7005a8b6441e';

-- Фумарола вулкана Дзендзур
-- Source: Wikipedia (Dzenzur volcano 53.637°N 158.922°E)
UPDATE places SET lat = 53.6370, lng = 158.9220, is_visible = true
WHERE id = '05112df7-54f9-4280-bcd2-1bfe4929dfc0';

-- Чистинские (Аагские) нарзаны
-- Source: Wikipedia (Аагские источники 53.4696°N 158.7271°E), near Aag volcano
UPDATE places SET lat = 53.4696, lng = 158.7271, is_visible = true
WHERE id = '5fe02f54-d018-4125-a0ec-e5fc458ad493';

-- Вачкажец (горный массив)
-- Source: Wikipedia (52°50'N 158°06'E = 52.833°N 158.100°E)
UPDATE places SET lat = 52.8330, lng = 158.1000, is_visible = true
WHERE id = 'c4310d06-2b6c-4b6e-af3a-b0c7cd678ebe';

INSERT INTO _migrations (name)
VALUES ('174_fix_zero_coordinates.sql')
ON CONFLICT (name) DO NOTHING;
