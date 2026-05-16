import { NextRequest } from 'next/server';
import {
  registerDevice,
  removeDevice,
  sendToDevice,
  getRoomPeers,
} from '@/lib/mesh/signaling-store';

export const runtime = 'nodejs'; // SSE requires Node.js runtime

export async function GET(req: NextRequest): Promise<Response> {
  const deviceId = req.nextUrl.searchParams.get('deviceId');
  const room = req.nextUrl.searchParams.get('room');

  if (!deviceId || !room) {
    return new Response('Missing deviceId or room', { status: 400 });
  }

  const encoder = new TextEncoder();
  let keepalive: ReturnType<typeof setInterval>;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      registerDevice(deviceId, room, controller);

      const peers = getRoomPeers(room, deviceId);
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'room-peers', peers })}\n\n`),
      );

      keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keepalive\n\n'));
        } catch {
          clearInterval(keepalive);
        }
      }, 25000);
    },
    cancel() {
      clearInterval(keepalive);
      removeDevice(deviceId);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

export async function POST(req: NextRequest): Promise<Response> {
  let body: { to: string; message: unknown };
  try {
    body = (await req.json()) as { to: string; message: unknown };
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { to, message } = body;
  if (!to || !message) return new Response('Missing to/message', { status: 400 });

  const delivered = sendToDevice(to, message);
  return Response.json({ delivered });
}
