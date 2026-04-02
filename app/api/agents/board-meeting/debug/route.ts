/**
 * GET /api/agents/board-meeting/debug
 *
 * Живой мониторинг текущего совещания (SSE)
 * Кэшированный буфер всех событий в памяти процесса
 */

import { NextRequest, NextResponse } from 'next/server';

// Глобальный буфер последнего совещания (макс 1000 событий)
interface DebugEvent {
  timestamp: string;
  type: string;
  data: Record<string, unknown>;
}

let debugBuffer: DebugEvent[] = [];
const MAX_BUFFER = 1000;

export function sendDebugEvent(type: string, data: Record<string, unknown>) {
  const event: DebugEvent = {
    timestamp: new Date().toISOString(),
    type,
    data,
  };
  debugBuffer.push(event);
  if (debugBuffer.length > MAX_BUFFER) {
    debugBuffer = debugBuffer.slice(-MAX_BUFFER);
  }
}

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const format = req.nextUrl.searchParams.get('format') ?? 'json';

  if (format === 'stream') {
    // Потоковый режим — отправляем все события и слушаем новые
    const encoder = new TextEncoder();
    let lastIndex = 0;

    const stream = new ReadableStream({
      async start(controller) {
        // Отправляем исторические события
        for (let i = lastIndex; i < debugBuffer.length; i++) {
          const evt = debugBuffer[i];
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(evt)}\n\n`)
          );
        }
        lastIndex = debugBuffer.length;

        // Слушаем новые события каждые 100мс
        const interval = setInterval(() => {
          for (let i = lastIndex; i < debugBuffer.length; i++) {
            const evt = debugBuffer[i];
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(evt)}\n\n`)
            );
          }
          lastIndex = debugBuffer.length;
        }, 100);

        req.signal.addEventListener('abort', () => {
          clearInterval(interval);
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }

  if (format === 'clear') {
    debugBuffer = [];
    return NextResponse.json({ success: true, message: 'Debug buffer cleared' });
  }

  // Default: JSON
  const stats = {
    buffer_size: debugBuffer.length,
    oldest_event: debugBuffer[0]?.timestamp ?? null,
    newest_event: debugBuffer[debugBuffer.length - 1]?.timestamp ?? null,
    events_by_type: {} as Record<string, number>,
  };

  for (const evt of debugBuffer) {
    stats.events_by_type[evt.type] = (stats.events_by_type[evt.type] ?? 0) + 1;
  }

  return NextResponse.json({
    stats,
    events: debugBuffer.slice(-50), // Last 50 events
  });
}
