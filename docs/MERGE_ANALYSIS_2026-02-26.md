# Merge analysis worklog (2026-02-26)

## Контекст

Цель: проверить целостность после мержа ветки `cursor/middleware-security-rules-130a` в `main`, сверить auth-покрытие, качество сборки/линта и состояние веток.

Проверка выполнена в `main` (HEAD: `ea5c3d3`).

---

## 1) MERGE INTEGRITY

### Подтверждение состава AUTH-ветки (163 файла)

Для проверки взяты AUTH-коммиты из `docs/AUTH_HARDENING_WORKLOG_2026-02-25.md`:

1. `9a1c139`
2. `2c74ef6`
3. `d29e6a3`
4. `f1f1e6b`
5. `fe7e6aa`
6. `50d240c`

Результат union-проверки по измененным файлам:

- `163` уникальных файлов
- `161` в `app/api/**`

Сверка с деревом `main`:

- `162/163` файлов физически присутствуют в `main`
- `1/163` файл отсутствует по ожидаемой причине:
  - `app/api/ai/groq/route.ts` удален осознанно в коммите `01a4edf` (`refactor(ai): remove groq provider across project`)

Итог: изменения из auth hardening не потеряны; удаление `app/api/ai/groq/route.ts` является частью последующих согласованных изменений ветки.

### Конфликты мержа

- `git ls-files -u` -> `0` (unmerged entries отсутствуют)
- Поиск маркеров `<<<<<<<`, `=======`, `>>>>>>>` -> не найдено

### Build/Lint после мержа

- `JWT_SECRET=dummy-secret npm run build` -> успешно (`exit 0`)
- `npm run lint` -> успешно, без новых ошибок

---

## 2) AUTH COVERAGE

### TODO: AUTH

- `TODO: AUTH` в `app/api/**/*.ts` -> `0`

### Guards: наличие и использование

Определения guards подтверждены в:

- `lib/auth/middleware.ts`:
  - `requireAuth`
  - `requireRole`
  - `requireAdmin`
  - `requireOperator`
  - `requireTransferOperator`

Фактическое использование в `app/api/**/*.ts`:

- `requireAuth(` -> `67` вызовов
- `requireRole(` -> `33` вызова
- `requireAdmin(` -> `55` вызовов
- `requireOperator(` -> `51` вызов
- `requireTransferOperator(` -> `34` вызова

### Проверка legacy header-auth (`X-User-Id` / `X-User-Role`)

- В `app/api/**/*.ts`: `0` прямых ссылок на `x-user-id` / `x-user-role`
- Обнаружен один legacy helper:
  - `app/api/admin/stats/route.ts` импортирует `requireAdmin` из `lib/auth/check-admin.ts`
  - `lib/auth/check-admin.ts` использует `x-user-id`/`x-user-role`

Итог по пункту: для большинства приватных маршрутов header-based решение убрано, но есть 1 remaining endpoint (`/api/admin/stats`) на legacy helper.

---

## 3) BRANCH CLEANUP

### Remote branches not merged into main

После `git fetch --prune origin`:

- `git branch -r --no-merged origin/main` -> пусто

Текущее состояние remote:

- `origin/main`
- `origin/HEAD -> origin/main`

### Open PRs

- `gh pr list --state open` -> `[]` (открытых PR нет)

### Safe to delete (stale branches)

- На remote нет веток, требующих удаления.

Exact команды (если появятся stale merged ветки в будущем):

```bash
git fetch --prune origin
git push origin --delete <branch-name>
```

---

## 4) BUILD AND QUALITY

### Build

- Команда: `JWT_SECRET=dummy-secret npm run build`
- Результат: `PASS`

### Lint + baseline diff

Baseline (pre-merge): `206c0d8`  
Current: `main` (`ea5c3d3`)

- warnings (baseline): `41`
- warnings (current): `41`
- new warnings vs baseline: `0`
- resolved warnings vs baseline: `0`
- errors: `0`

Все предупреждения текущего линта относятся к существующей группе `react-hooks/exhaustive-deps`.

### Проверка на `any`, внесенные merge-диффом

Проверен merge-дифф `ea5c3d3^1..ea5c3d3` (добавленные строки в `*.ts/*.tsx`):

- новых вхождений `any` (`: any`, `any[]`, `Record<string, any>`, `as any`, `<any>`) -> `0`

### Проверка конфликт-маркеров

- `<<<<<<<` / `=======` / `>>>>>>>` -> `0` совпадений

---

## 5) NEXT STEPS

### Что готово запускать следующим по AGENTS.md

Согласно `AGENTS.md`, проект в статусе MVP; зафиксированный следующий продуктовый шаг:

- деплой -> первые бронирования -> сбор реальных метрик

Для security-потока (технический следующий шаг): можно сразу запускать новый точечный цикл IDOR-аудита по приватным `GET/PUT/DELETE` с `id` в params/query (bookings/tours/operator dashboard), с отчетом по шаблону.

### Первый атомарный коммит для нового IDOR цикла

Рекомендуемый первый коммит:

- `fix(security): enforce ownership filters for id-based operator booking routes`

Состав первого атомарного шага:

1. Выбрать 1 группу endpoint'ов (например, `app/api/operator/bookings/[id]/**`).
2. Привести SQL к ownership-фильтрам вида `WHERE id = $1 AND owner_user_id = $2` (или эквивалент через `JOIN partners`).
3. Проверить anti-enumeration (`404` вместо информативного `403` на чужой ресурс).
4. Прогнать:
   - `JWT_SECRET=dummy-secret npm run build`
   - `npm run lint`

---

## Статус

- Анализ завершен.
- Отчет сохранен: `docs/MERGE_ANALYSIS_2026-02-26.md`.
