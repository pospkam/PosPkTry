/**
 * WhatsApp Business API — Kuzmich bot
 *
 * Настройка:
 *   1. Meta for Developers → WhatsApp → Webhooks → URL: tourhab.ru/api/whatsapp/kuzmich
 *   2. Env: WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN
 *
 * GET  — webhook verification (hub.challenge handshake)
 * POST — входящие сообщения (text + image)
 */

import { NextRequest, NextResponse } from 'next/server';
import { processMessage, type PendingBooking } from '@/lib/kuzmich/core';
import { callGeminiVision } from '@/lib/ai/providers';

export const dynamic = 'force-dynamic';

// In-memory pending bookings (same pattern as Telegram handler)
const pending = new Map<number, PendingBooking>();

// ── Helpers ───────────────────────────────────────────────────────

function getEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing env: ${key}`);
  return val;
}

async function sendWhatsApp(to: string, text: string): Promise<void> {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token   = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneId || !token) return;

  await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text.slice(0, 4096) },
    }),
  }).catch(() => { /* не блокируем */ });
}

async function downloadWhatsAppMedia(mediaId: string): Promise<{ base64: string; mimeType: string } | null> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) return null;
  try {
    // Получить URL медиа
    const metaRes = await fetch(`https://graph.facebook.com/v19.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!metaRes.ok) return null;
    const meta = await metaRes.json() as { url?: string; mime_type?: string };
    if (!meta.url) return null;

    // Скачать файл
    const fileRes = await fetch(meta.url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!fileRes.ok) return null;

    const buffer = await fileRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    return { base64, mimeType: meta.mime_type ?? 'image/jpeg' };
  } catch {
    return null;
  }
}

// ── GET: webhook verification ──────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const mode      = searchParams.get('hub.mode');
  const token     = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (mode === 'subscribe' && token === verifyToken && challenge) {
    return new Response(challenge, { status: 200 });
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// ── POST: входящие сообщения ───────────────────────────────────────

interface WAMessage {
  from: string;
  id: string;
  type: 'text' | 'image' | 'audio' | 'document' | 'unknown';
  text?: { body: string };
  image?: { id: string; mime_type: string };
  contacts?: Array<{ profile: { name: string } }>;
}

interface WAUpdate {
  object: string;
  entry: Array<{
    changes: Array<{
      value: {
        messages?: WAMessage[];
        contacts?: Array<{ profile: { name: string }; wa_id: string }>;
        statuses?: unknown[];
      };
    }>;
  }>;
}

export async function POST(req: NextRequest) {
  // Verify X-Hub-Signature-256 in production (optional but recommended)
  try {
    const body = await req.json() as WAUpdate;

    if (body.object !== 'whatsapp_business_account') {
      return NextResponse.json({ ok: true });
    }

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;
        if (!value?.messages?.length) continue;

        for (const msg of value.messages) {
          const phone = msg.from; // e.g. "79001234567"
          // Use phone as numeric chatId (WhatsApp phones fit in bigint)
          const chatId = parseInt(phone.replace(/\D/g, '').slice(-10), 10);
          if (!chatId) continue;

          // Имя из contacts
          const contactName = value.contacts?.find(c => c.wa_id === phone)?.profile.name ?? null;

          // Функция отправки ответа
          const reply = async (_: number, text: string) => {
            await sendWhatsApp(phone, text);
          };

          // Обработка изображения
          if (msg.type === 'image' && msg.image?.id) {
            const media = await downloadWhatsAppMedia(msg.image.id);
            let imageDescription = '';
            if (media) {
              const desc = await callGeminiVision(
                media.base64,
                media.mimeType,
                'Describe what is in the photo in 1-2 sentences. Mention if it looks like Kamchatka (volcanoes, bears, hot springs, fishing). Respond in Russian.',
              ).catch(() => null);
              imageDescription = desc ? `[Фото: ${desc}]` : '[Пользователь прислал фото]';
            }
            await processMessage({
              chatId,
              text: imageDescription || '[Фото]',
              userName: contactName,
              mode: 'whatsapp',
              createdVia: 'whatsapp',
              pending,
              reply,
            });
            continue;
          }

          // Обработка текста
          if (msg.type === 'text' && msg.text?.body) {
            await processMessage({
              chatId,
              text: msg.text.body,
              userName: contactName,
              mode: 'whatsapp',
              createdVia: 'whatsapp',
              pending,
              reply,
            });
          }
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // всегда 200 для Meta
  }
}
