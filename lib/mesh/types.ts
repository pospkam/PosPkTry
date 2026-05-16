export interface MeshPeer {
  deviceId: string;
  nickname?: string;
  position?: { lat: number; lng: number; accuracy: number; timestamp: number };
  battery?: number;
  lastSeen: number;
}

export type MeshMessageType = 'position' | 'sos' | 'ping' | 'pong';

export interface MeshMessage {
  type: MeshMessageType;
  from: string;
  payload: unknown;
  timestamp: number;
}

export type MeshStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'no-gps';
