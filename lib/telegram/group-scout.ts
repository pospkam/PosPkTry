/**
 * lib/telegram/group-scout.ts
 *
 * Автономный разведчик туристических Telegram-групп (MTProto).
 *
 * Что делает:
 * 1. Ищет туристические Telegram-группы/каналы по ключевым словам
 * 2. Анализирует найденные группы через AI-фильтр (релевантность Камчатке)
 * 3. Вступает в подходящие группы (макс. 5 новых в день, rate-limit)
 * 4. Из уже вступивших групп — собирает последние сообщения → groupMonitor
 * 5. Обновляет реестр в agent_memory
 *
 * Запуск: cron /api/cron/group-scout (раз в 6–24 часа)
 *
 * Требует: TG_API_ID, TG_API_HASH, TG_USER_SESSION
 */

import { Api } from 'telegram';
import bigInt from 'big-integer';
import { getMTProtoClient, isMTProtoConfigured } from './mtproto-client';
import { groupMonitor } from './group-monitor';
import { agentMemory } from '@/lib/agents/memory/agent-memory';
import { callAIFast } from '@/lib/ai/providers';
import { pool } from '@/lib/db-pool';
import type { ChatMessage } from '@/lib/ai/prompts';

// ── Конфигурация ──────────────────────────────────────────────────────────────

/** Ключевые слова для поиска туристических групп */
const SEARCH_KEYWORDS = [
  'камчатка туризм',
  'камчатка туры',
  'камчатка путешествия',
  'рыбалка камчатка',
  'туристы камчатка',
  'камчатка 2025',
  'камчатка 2026',
  'камчатка поход',
  'петропавловск-камчатский туристы',
];

const MAX_NEW_JOINS_PER_RUN = 5;      // не присоединяться к больше чем 5 групп за запуск
const JOIN_DELAY_MS         = 3000;   // пауза между join-операциями
const SEARCH_DELAY_MS       = 2000;   // пауза между поисковыми запросами
const HARVEST_LIMIT         = 50;     // кол-во сообщений для сбора из уже вступивших групп
const REGISTRY_KEY          = 'tg_mtproto_scout_registry'; // ключ в agent_memory

// ── Типы ──────────────────────────────────────────────────────────────────────

interface ScoutedGroup {
  id: string;
  accessHash: string;
  title: string;
  username?: string;
  memberCount: number;
  joinedAt?: string;
  lastHarvestedAt?: string;
  joinAttempts: number;
  relevanceScore: number; // 0–10 по AI
}

interface ScoutRegistry {
  groups: ScoutedGroup[];
  lastScoutAt: string;
  totalJoined: number;
  todayJoins: number;
  todayDate: string;
}

// ── Хелперы ───────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

async function getRegistry(): Promise<ScoutRegistry> {
  try {
    const { rows } = await pool.query<{ value: unknown }>(
      `SELECT value FROM agent_memory WHERE agent_id = 'evo' AND key = $1 LIMIT 1`,
      [REGISTRY_KEY]
    );
    const val = rows[0]?.value as ScoutRegistry | undefined;
    if (val?.groups) return val;
  } catch { /* игнорируем */ }
  return {
    groups: [],
    lastScoutAt: '',
    totalJoined: 0,
    todayJoins: 0,
    todayDate: '',
  };
}

async function saveRegistry(reg: ScoutRegistry): Promise<void> {
  await agentMemory.remember({
    agent_id:    'evo',
    memory_type: 'intelligence',
    key:         REGISTRY_KEY,
    value:       reg as unknown as Record<string, unknown>,
    confidence:  1.0,
    source:      'tg_group_scout',
    expires_at:  new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  });
}

/**
 * AI-оценка: насколько Telegram-группа релевантна туризму на Камчатке (0–10).
 */
async function scoreGroupRelevance(title: string, about: string): Promise<number> {
  const prompt: ChatMessage[] = [
    {
      role: 'system',
      content: 'Ты — аналитик туристической платформы Камчатки. Оцени, насколько Telegram-группа полезна для сбора бизнес-разведки по туризму на Камчатке. Отвечай ТОЛЬКО числом от 0 до 10.',
    },
    {
      role: 'user',
      content: `Название: ${title}\nОписание: ${about || 'нет'}\n\nОценка 0-10 (10=идеально релевантна Камчатке/туризму/рыбалке/природе):`,
    },
  ];
  try {
    const raw = await callAIFast(prompt);
    const score = parseInt(raw.trim(), 10);
    return isNaN(score) ? 0 : Math.min(10, Math.max(0, score));
  } catch {
    return 0;
  }
}

// ── Основные операции ─────────────────────────────────────────────────────────

/**
 * Поиск новых групп по ключевым словам через contacts.Search.
 */
async function searchGroups(keyword: string): Promise<ScoutedGroup[]> {
  const client = await getMTProtoClient();
  const results: ScoutedGroup[] = [];

  try {
    const found = await client.invoke(new Api.contacts.Search({ q: keyword, limit: 15 }));
    const peers = found as unknown as {
      chats?: Array<{
        id: bigint | string | number;
        accessHash?: bigint | string | null;
        title?: string;
        username?: string;
        participantsCount?: number;
        megagroup?: boolean;
        broadcast?: boolean;
      }>;
    };

    for (const chat of peers.chats ?? []) {
      // Пропускаем каналы (только broadcasts без мегагрупп)
      if (chat.broadcast && !chat.megagroup) continue;

      const id    = String(chat.id ?? '');
      const hash  = String(chat.accessHash ?? '');
      const title = chat.title ?? '';
      const count = chat.participantsCount ?? 0;

      // Минимальный порог участников — не присоединяться к мёртвым группам
      if (count < 20) continue;

      results.push({
        id,
        accessHash: hash,
        title,
        username:   chat.username,
        memberCount: count,
        joinAttempts: 0,
        relevanceScore: 0,
      });
    }
  } catch (err) {
    // FloodError или другая ошибка — просто возвращаем пустой массив
    const msg = (err as Error).message ?? '';
    if (msg.includes('FLOOD')) await sleep(30_000);
  }

  return results;
}

/**
 * Вступить в группу по username или id+accessHash.
 */
async function joinGroup(group: ScoutedGroup): Promise<boolean> {
  const client = await getMTProtoClient();
  try {
    const peer = group.username
      ? group.username
      : new Api.InputChannel({
          channelId:   bigInt(group.id),
          accessHash:  bigInt(group.accessHash),
        });
    await client.invoke(new Api.channels.JoinChannel({ channel: peer as Api.TypeInputChannel }));
    return true;
  } catch (err) {
    const msg = (err as Error).message ?? '';
    if (msg.includes('FLOOD')) await sleep(30_000);
    return false;
  }
}

/**
 * Собрать последние сообщения из группы → отправить в groupMonitor.
 */
async function harvestMessages(group: ScoutedGroup): Promise<number> {
  const client = await getMTProtoClient();
  let count = 0;

  try {
    const peer = group.username
      ? group.username
      : new Api.InputChannel({
          channelId:  bigInt(group.id),
          accessHash: bigInt(group.accessHash),
        });

    const messages = await client.getMessages(peer as Parameters<typeof client.getMessages>[0], {
      limit: HARVEST_LIMIT,
    });

    for (const msg of messages) {
      const text    = (msg as unknown as { message?: string }).message ?? '';
      const sender  = (msg as unknown as { fromId?: { userId?: bigint } }).fromId?.userId;
      const fromStr = sender ? `user_${String(sender)}` : 'unknown';
      groupMonitor.processMessage(group.id, group.title, fromStr, text);
      count++;
    }
  } catch {
    // Тихая ошибка — продолжаем
  }

  return count;
}

// ── Главный метод ─────────────────────────────────────────────────────────────

export interface ScoutResult {
  searched:   number;
  newFound:   number;
  joined:     number;
  harvested:  number;
  skipped:    number;
  error?:     string;
}

export async function runGroupScout(): Promise<ScoutResult> {
  if (!isMTProtoConfigured()) {
    return { searched: 0, newFound: 0, joined: 0, harvested: 0, skipped: 0, error: 'MTProto не сконфигурирован (TG_API_ID/TG_API_HASH/TG_USER_SESSION)' };
  }

  const result: ScoutResult = { searched: 0, newFound: 0, joined: 0, harvested: 0, skipped: 0 };
  const reg = await getRegistry();

  // Сброс дневного счётчика если новый день
  const today = new Date().toISOString().slice(0, 10);
  if (reg.todayDate !== today) {
    reg.todayDate  = today;
    reg.todayJoins = 0;
  }

  const knownIds = new Set(reg.groups.map(g => g.id));
  const newCandidates: ScoutedGroup[] = [];

  // ── Шаг 1: Поиск новых групп ─────────────────────────────────────────────
  for (const keyword of SEARCH_KEYWORDS) {
    result.searched++;
    const found = await searchGroups(keyword);
    for (const g of found) {
      if (!knownIds.has(g.id)) {
        newCandidates.push(g);
        knownIds.add(g.id); // дедупликация в рамках одного запуска
      }
    }
    await sleep(SEARCH_DELAY_MS);
  }
  result.newFound = newCandidates.length;

  // ── Шаг 2: AI-оценка и вступление в топ кандидатов ───────────────────────
  if (reg.todayJoins < MAX_NEW_JOINS_PER_RUN && newCandidates.length > 0) {
    // Сортируем по кол-ву участников (больше = популярнее)
    newCandidates.sort((a, b) => b.memberCount - a.memberCount);

    for (const candidate of newCandidates) {
      if (reg.todayJoins >= MAX_NEW_JOINS_PER_RUN) break;

      // AI-оценка релевантности
      candidate.relevanceScore = await scoreGroupRelevance(candidate.title, '');
      if (candidate.relevanceScore < 5) {
        result.skipped++;
        // Добавляем в реестр как нерелевантную (чтобы не проверять снова)
        candidate.joinAttempts = -1; // маркер "проверено, нерелевантно"
        reg.groups.push(candidate);
        continue;
      }

      await sleep(JOIN_DELAY_MS);
      const ok = await joinGroup(candidate);
      if (ok) {
        candidate.joinedAt = new Date().toISOString();
        candidate.joinAttempts = 1;
        reg.groups.push(candidate);
        reg.todayJoins++;
        reg.totalJoined++;
        result.joined++;
      } else {
        candidate.joinAttempts++;
        reg.groups.push(candidate);
        result.skipped++;
      }
    }
  }

  // ── Шаг 3: Сбор сообщений из вступивших групп ────────────────────────────
  const joinedGroups = reg.groups.filter(g => g.joinedAt && g.joinAttempts > 0);

  for (const group of joinedGroups) {
    const harvested = await harvestMessages(group);
    result.harvested += harvested;
    if (harvested > 0) {
      group.lastHarvestedAt = new Date().toISOString();
    }
    await sleep(1500);
  }

  // ── Шаг 4: Сохраняем реестр ──────────────────────────────────────────────
  reg.lastScoutAt = new Date().toISOString();
  await saveRegistry(reg);

  return result;
}

/**
 * Возвращает текущий реестр разведанных групп (для дашборда).
 */
export async function getScoutRegistry(): Promise<ScoutRegistry> {
  return getRegistry();
}
