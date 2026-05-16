// Used ONLY via app/api/mesh/signal/route.ts — never import in client code

const encoder = new TextEncoder();

interface SignalingConn {
  deviceId: string;
  room: string;
  controller: ReadableStreamDefaultController<Uint8Array>;
}

// Global singleton — works within a single Docker process
const globalForMesh = globalThis as typeof globalThis & {
  _meshConnections?: Map<string, SignalingConn>;
};
if (!globalForMesh._meshConnections) {
  globalForMesh._meshConnections = new Map();
}
const connections = globalForMesh._meshConnections;

export function registerDevice(
  deviceId: string,
  room: string,
  controller: ReadableStreamDefaultController<Uint8Array>,
): void {
  connections.set(deviceId, { deviceId, room, controller });
  broadcastToRoom(room, { type: 'peer-joined', deviceId }, deviceId);
}

export function removeDevice(deviceId: string): void {
  const conn = connections.get(deviceId);
  if (conn) {
    broadcastToRoom(conn.room, { type: 'peer-left', deviceId }, deviceId);
    connections.delete(deviceId);
  }
}

export function sendToDevice(targetId: string, message: unknown): boolean {
  const conn = connections.get(targetId);
  if (!conn) return false;
  try {
    conn.controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
    return true;
  } catch {
    connections.delete(targetId);
    return false;
  }
}

export function getRoomPeers(room: string, excludeId?: string): string[] {
  return Array.from(connections.values())
    .filter((c) => c.room === room && c.deviceId !== excludeId)
    .map((c) => c.deviceId);
}

function broadcastToRoom(room: string, message: unknown, excludeId?: string): void {
  for (const conn of connections.values()) {
    if (conn.room === room && conn.deviceId !== excludeId) {
      try {
        conn.controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
      } catch {
        connections.delete(conn.deviceId);
      }
    }
  }
}
