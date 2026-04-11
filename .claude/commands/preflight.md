Выполни предполётную проверку перед коммитом. Проверь все изменённые файлы.

## Шаги

### 1. Какие файлы изменены?

Выполни `git diff --name-only` и `git diff --cached --name-only` чтобы увидеть все изменения.

### 2. TypeScript компиляция

Выполни `npx tsc --noEmit` и проверь что 0 ошибок.
Если есть ошибки — покажи их и ОСТАНОВИ проверку.

### 3. Тесты

Выполни `npx vitest run` и проверь что все тесты зелёные.

### 4. Проверка изменённых файлов

Для каждого изменённого `.ts`/`.tsx` файла проверь:
- Нет `any` типов
- Нет `console.log` (только `console.error` в catch)
- SQL параметризованный ($1, $2), нет конкатенации
- API routes имеют auth check и Zod валидацию
- Импорт pool — named (`{ pool }`)
- Нет прямого `SELECT * FROM kamchatka_routes` (только через `v_kamchatka_routes_api`)
- Нет `await callDeepSeek/callMiMo/callOpenrouter` напрямую (только `callAIWaterfall/callAIFast`)

### 5. Вердикт

```
PREFLIGHT: {OK | FAIL}

Изменено файлов: {N}
TSC: {OK | X ошибок}
Тесты: {OK | X failed}
SQL безопасность: {OK | проблемы}
Auth checks: {OK | пропущено}
AI waterfall: {OK | прямые вызовы}

{Если FAIL — список того что нужно исправить}
```
