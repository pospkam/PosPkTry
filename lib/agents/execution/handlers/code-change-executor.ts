/**
 * CodeChangeExecutor — исполняет code_change инициативы через GitHub API.
 *
 * Flow:
 *   1. AI#1: определяет file_path из описания инициативы
 *   2. GitHub API: получаем текущий контент файла + SHA
 *   3. AI#2: генерирует полный новый контент файла
 *   4. GitHub API: создаём ветку agent/code-{id}
 *   5. GitHub API: обновляем файл (коммит на ветке)
 *   6. GitHub API: создаём Pull Request
 *   7. Telegram: уведомление с ссылкой на PR
 *
 * Env vars required:
 *   GITHUB_TOKEN  — Personal Access Token (repo scope)
 *   GITHUB_OWNER  — "pospkam"
 *   GITHUB_REPO   — "PosPkTry"
 */

import { callAIWithModelDirect } from '@/lib/ai/providers';
import { getModelForAgent } from '@/lib/ai/agent-models';
import type { ExecutionTask, ExecutionResult } from '../initiative-executor';
import type { ChatMessage } from '@/lib/ai/prompts';

// Файлы которые агент никогда не должен трогать
const FORBIDDEN_PATHS = [
  'lib/auth',
  'middleware.ts',
  'app/api/payments',
  'app/api/safety/sos',
  '.env',
];

// Максимальный размер файла для AI-обработки (символов)
const MAX_FILE_CHARS = 40_000;

// ── GitHub API helpers ─────────────────────────────────────────────────────────

function ghHeaders(): Record<string, string> {
  return {
    'Authorization':        `Bearer ${process.env.GITHUB_TOKEN}`,
    'Accept':               'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type':         'application/json',
  };
}

function ghBase(): string {
  const owner = process.env.GITHUB_OWNER ?? 'pospkam';
  const repo  = process.env.GITHUB_REPO  ?? 'PosPkTry';
  return `https://api.github.com/repos/${owner}/${repo}`;
}

async function ghGet<T>(path: string): Promise<T> {
  const res = await fetch(`${ghBase()}${path}`, { headers: ghHeaders() });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GitHub GET ${path} → ${res.status}: ${body.substring(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

async function ghPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${ghBase()}${path}`, {
    method: 'POST', headers: ghHeaders(), body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`GitHub POST ${path} → ${res.status}: ${err.substring(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

async function ghPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${ghBase()}${path}`, {
    method: 'PUT', headers: ghHeaders(), body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`GitHub PUT ${path} → ${res.status}: ${err.substring(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

// ── AI helpers ─────────────────────────────────────────────────────────────────

const MODEL     = getModelForAgent('vibe_coder');
const NEW_MODEL = getModelForAgent('vibe_coder');

/** AI#1 — определить какой файл нужно изменить */
async function identifyTargetFile(description: string): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `Ты анализируешь задание на изменение кода в проекте Next.js 15 / TypeScript.
Верни ТОЛЬКО путь к файлу относительно корня репозитория (например: lib/agents/agencies/eco-agency.ts).
Без объяснений, без markdown, только путь.
Если не можешь определить файл из описания — верни "UNKNOWN".`,
    },
    {
      role: 'user',
      content: `Задание: ${description}`,
    },
  ];

  const result = await callAIWithModelDirect(messages, MODEL);
  return result.trim().replace(/^["'`]|["'`]$/g, '');
}

/** AI#2 — сгенерировать новый контент файла */
async function generateNewFileContent(
  filePath: string,
  currentContent: string,
  description: string,
): Promise<string> {
  const truncated = currentContent.length > MAX_FILE_CHARS
    ? currentContent.substring(0, MAX_FILE_CHARS) + '\n// ... (truncated)'
    : currentContent;

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `Ты senior TypeScript/Next.js разработчик.
Тебе дан текущий файл и задание. Верни ПОЛНЫЙ обновлённый файл.

Правила:
- Только код, без markdown, без \`\`\` блоков
- Сохрани все существующие импорты и экспорты которые не связаны с изменением
- TypeScript strict — никакого any, правильные типы
- Минимальные изменения — только то что нужно по заданию
- Стиль кода должен совпадать с существующим файлом`,
    },
    {
      role: 'user',
      content: `Файл: ${filePath}\n\nЗадание: ${description}\n\nТекущий контент:\n${truncated}`,
    },
  ];

  return callAIWithModelDirect(messages, MODEL);
}

// ── Main executor ─────────────────────────────────────────────────────────────

export async function executeCodeChange(task: ExecutionTask): Promise<ExecutionResult> {
  const changes: string[] = [];
  const errors:  string[] = [];

  // Guard: need GitHub token
  if (!process.env.GITHUB_TOKEN) {
    return {
      success:              false,
      changes_made:         [],
      errors:               ['GITHUB_TOKEN не настроен. Добавь в переменные окружения Timeweb Cloud.'],
      rollback_available:   false,
      verification_passed:  false,
    };
  }

  try {
    const fullDescription = typeof task.context.full_description === 'string'
      ? task.context.full_description
      : task.description;

    // ── Step 1: AI identifies file to modify ───────────────────────────────────
    let filePath = typeof task.context.file_path === 'string'
      ? task.context.file_path
      : await identifyTargetFile(fullDescription);

    if (!filePath || filePath === 'UNKNOWN') {
      throw new Error(`AI не смог определить целевой файл из описания: "${fullDescription.substring(0, 100)}"`);
    }

    // Strip leading slash if present
    filePath = filePath.replace(/^\//, '');

    // Security check
    if (FORBIDDEN_PATHS.some(f => filePath.includes(f))) {
      throw new Error(`Попытка изменить запрещённый файл: ${filePath}`);
    }

    changes.push(`Целевой файл: ${filePath}`);

    // ── Step 2: Fetch current file from GitHub ─────────────────────────────────
    const fileData = await ghGet<{ content: string; sha: string; size: number }>(
      `/contents/${filePath}`
    );

    const currentContent = Buffer.from(fileData.content.replace(/\n/g, ''), 'base64').toString('utf-8');
    changes.push(`Файл получен (${Math.round(currentContent.length / 1024)}KB, SHA: ${fileData.sha.substring(0, 7)})`);

    // ── Step 3: AI generates new file content ──────────────────────────────────
    const newContent = await generateNewFileContent(filePath, currentContent, fullDescription);

    if (!newContent || newContent.length < 50) {
      throw new Error('AI вернул пустой или слишком короткий файл');
    }

    // ── Guard: reject markdown contamination ──────────────────────────────────
    // AI sometimes wraps output in ```typescript ... ``` code fences which
    // would make the file invalid TypeScript and break the build.
    const stripped = newContent.trimStart();
    if (stripped.startsWith('```')) {
      throw new Error('AI обернул ответ в markdown code fence (```). Файл не был создан. Нужна повторная попытка с другим промптом.');
    }
    // Also reject if large portion of the original code went missing (>40% shorter)
    if (currentContent.length > 500 && newContent.length < currentContent.length * 0.6) {
      throw new Error(
        `AI удалил слишком много кода: было ${currentContent.length} символов, стало ${newContent.length} (${Math.round(newContent.length / currentContent.length * 100)}%). Отклонено как деструктивное изменение.`
      );
    }

    if (newContent.trim() === currentContent.trim()) {
      return {
        success:              true,
        changes_made:         ['AI пришёл к выводу что изменения не нужны — файл уже корректен'],
        errors:               [],
        rollback_available:   false,
        verification_passed:  true,
      };
    }

    changes.push(`Новый контент сгенерирован (${Math.round(newContent.length / 1024)}KB)`);

    // ── Step 4: Create branch ──────────────────────────────────────────────────
    const branchName = `agent/code-${task.approval_id.substring(0, 8)}`;

    const mainRef = await ghGet<{ object: { sha: string } }>('/git/refs/heads/main');
    await ghPost('/git/refs', {
      ref: `refs/heads/${branchName}`,
      sha: mainRef.object.sha,
    });

    changes.push(`Ветка: ${branchName}`);

    // ── Step 5: Commit updated file to branch ──────────────────────────────────
    const newContentB64 = Buffer.from(newContent).toString('base64');
    const commitMsg = `feat(agent): ${fullDescription.substring(0, 60)}`;

    await ghPut(`/contents/${filePath}`, {
      message: commitMsg,
      content: newContentB64,
      sha:     fileData.sha,
      branch:  branchName,
    });

    changes.push(`Коммит: "${commitMsg}"`);

    // ── Step 6: Create Pull Request ────────────────────────────────────────────
    const pr = await ghPost<{ number: number; html_url: string }>('/pulls', {
      title: `[AI vibe_coder] ${fullDescription.substring(0, 72)}`,
      body:  [
        '## AI-инициатива от совета директоров',
        '',
        `**Агент:** AI Разработчик (vibe_coder)`,
        `**Approval ID:** \`${task.approval_id}\``,
        `**Файл:** \`${filePath}\``,
        '',
        '## Задание',
        fullDescription,
        '',
        '---',
        '*Создано автоматически. Проверь diff и нажми Merge если всё корректно.*',
        '*После мержа → автодеплой на Timeweb.*',
      ].join('\n'),
      head: branchName,
      base: 'main',
    });

    changes.push(`PR #${pr.number} создан → ${pr.html_url}`);

    // ── Step 7: Telegram notification ─────────────────────────────────────────
    const tgToken  = process.env.TELEGRAM_BOT_TOKEN;
    const tgChatId = process.env.TELEGRAM_CHAT_ID;

    if (tgToken && tgChatId) {
      await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          chat_id:                  tgChatId,
          parse_mode:               'HTML',
          disable_web_page_preview: false,
          text: [
            '<b>AI Разработчик создал Pull Request</b>',
            '',
            `<b>Файл:</b> <code>${filePath}</code>`,
            `<b>Задача:</b> ${fullDescription.substring(0, 200)}`,
            '',
            `<a href="${pr.html_url}">Открыть PR #${pr.number} на GitHub</a>`,
            '',
            '<i>Проверь diff → нажми Merge → автодеплой запустится</i>',
          ].join('\n'),
        }),
      }).catch(() => null);
    }

    return {
      success:              true,
      changes_made:         changes,
      errors,
      rollback_available:   true, // PR можно закрыть без мержа — ветка удаляется
      verification_passed:  true,
    };

  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
    return {
      success:              false,
      changes_made:         changes,
      errors,
      rollback_available:   false,
      verification_passed:  false,
    };
  }
}

// ── New Page Creator ───────────────────────────────────────────────────────────

/** AI#1 — предложить путь для нового файла */
async function suggestNewFilePath(description: string): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `Ты senior Next.js 15 разработчик.
Тебе дано описание новой страницы. Предложи путь файла в проекте Next.js 15 App Router.
Верни ТОЛЬКО путь (например: app/tours/eco-camp/page.tsx).
Без объяснений, без markdown, только путь.`,
    },
    {
      role: 'user',
      content: `Создать страницу: ${description}`,
    },
  ];

  const result = await callAIWithModelDirect(messages, NEW_MODEL);
  return result.trim().replace(/^["'`]|["'`]$/g, '');
}

/** AI#2 — сгенерировать полный контент нового файла */
async function generateNewPageContent(filePath: string, description: string): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `Ты senior TypeScript/Next.js 15 разработчик премиальной туристической платформы Камчатки.

Правила:
- Только код, без markdown, без \`\`\` блоков
- TypeScript strict — никакого any, правильные типы
- Дизайн-система: только CSS-переменные (var(--accent), var(--bg-card), var(--text-primary), var(--ocean) и т.д.)
- Шрифты: font-playfair для заголовков (text-4xl/text-5xl), Outfit для остального
- Иконки: только lucide-react
- Никаких emoji, никакого glassmorphism, никаких bg-white/text-white
- Контекст: природа Камчатки — вулканы, медведи, океан, тайга`,
    },
    {
      role: 'user',
      content: `Создай полную Next.js 15 страницу для файла: ${filePath}\n\nОписание: ${description}`,
    },
  ];

  return callAIWithModelDirect(messages, NEW_MODEL);
}

/**
 * executeNewPageCreate — создаёт новую страницу через GitHub PR.
 * Отличие от executeCodeChange:
 *   - AI предлагает НОВЫЙ путь файла (не существующий)
 *   - Нет шага fetch существующего файла (нет SHA)
 *   - GitHub API: PUT без поля sha (создание, не обновление)
 */
export async function executeNewPageCreate(task: ExecutionTask): Promise<ExecutionResult> {
  const changes: string[] = [];
  const errors:  string[] = [];

  if (!process.env.GITHUB_TOKEN) {
    return {
      success:              false,
      changes_made:         [],
      errors:               ['GITHUB_TOKEN не настроен. Добавь в переменные окружения Timeweb Cloud.'],
      rollback_available:   false,
      verification_passed:  false,
    };
  }

  try {
    const fullDescription = typeof task.context.full_description === 'string'
      ? task.context.full_description
      : task.description;

    // ── Step 1: AI suggests new file path ──────────────────────────────────
    let filePath = typeof task.context.file_path === 'string'
      ? task.context.file_path
      : await suggestNewFilePath(fullDescription);

    if (!filePath || filePath === 'UNKNOWN') {
      throw new Error(`AI не смог предложить путь для страницы: "${fullDescription.substring(0, 100)}"`);
    }

    filePath = filePath.replace(/^\//, '');

    // Security check
    if (FORBIDDEN_PATHS.some(f => filePath.includes(f))) {
      throw new Error(`Попытка создать файл в запрещённой директории: ${filePath}`);
    }

    changes.push(`Новый файл: ${filePath}`);

    // ── Step 2: AI generates page content ─────────────────────────────────
    const newContent = await generateNewPageContent(filePath, fullDescription);

    if (!newContent || newContent.length < 50) {
      throw new Error('AI вернул пустой или слишком короткий компонент');
    }

    changes.push(`Контент сгенерирован (${Math.round(newContent.length / 1024)}KB)`);

    // ── Step 3: Create branch ─────────────────────────────────────────────
    const branchName = `agent/new-page-${task.approval_id.substring(0, 8)}`;

    const mainRef = await ghGet<{ object: { sha: string } }>('/git/refs/heads/main');
    await ghPost('/git/refs', {
      ref: `refs/heads/${branchName}`,
      sha: mainRef.object.sha,
    });

    changes.push(`Ветка: ${branchName}`);

    // ── Step 4: Create new file on branch (no sha field) ─────────────────
    const newContentB64 = Buffer.from(newContent).toString('base64');
    const commitMsg = `feat(new-page): ${fullDescription.substring(0, 60)}`;

    await ghPut(`/contents/${filePath}`, {
      message: commitMsg,
      content: newContentB64,
      branch:  branchName,
      // No sha field — this is a CREATE, not an UPDATE
    });

    changes.push(`Коммит: "${commitMsg}"`);

    // ── Step 5: Create Pull Request ───────────────────────────────────────
    const pr = await ghPost<{ number: number; html_url: string }>('/pulls', {
      title: `[AI new-page] ${fullDescription.substring(0, 72)}`,
      body:  [
        '## AI-инициатива — новая страница',
        '',
        `**Агент:** AI Разработчик (vibe_coder)`,
        `**Approval ID:** \`${task.approval_id}\``,
        `**Новый файл:** \`${filePath}\``,
        '',
        '## Описание',
        fullDescription,
        '',
        '---',
        '*Создано автоматически. Проверь компонент и нажми Merge если всё корректно.*',
        '*После мержа → автодеплой на Timeweb.*',
      ].join('\n'),
      head: branchName,
      base: 'main',
    });

    changes.push(`PR #${pr.number} создан → ${pr.html_url}`);

    // ── Step 6: Telegram notification ─────────────────────────────────────
    const tgToken  = process.env.TELEGRAM_BOT_TOKEN;
    const tgChatId = process.env.TELEGRAM_CHAT_ID;

    if (tgToken && tgChatId) {
      await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          chat_id:                  tgChatId,
          parse_mode:               'HTML',
          disable_web_page_preview: false,
          text: [
            '<b>AI Разработчик создал новую страницу (PR)</b>',
            '',
            `<b>Файл:</b> <code>${filePath}</code>`,
            `<b>Задача:</b> ${fullDescription.substring(0, 200)}`,
            '',
            `<a href="${pr.html_url}">Открыть PR #${pr.number} на GitHub</a>`,
            '',
            '<i>Проверь компонент → нажми Merge → автодеплой запустится</i>',
          ].join('\n'),
        }),
      }).catch(() => null);
    }

    return {
      success:              true,
      changes_made:         changes,
      errors,
      rollback_available:   true,
      verification_passed:  true,
    };

  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
    return {
      success:              false,
      changes_made:         changes,
      errors,
      rollback_available:   false,
      verification_passed:  false,
    };
  }
}
