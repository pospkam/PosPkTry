'use client';

import type { MeshMessage, MeshMessageType, MeshPeer, MeshStatus } from './types';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

function geoRoom(lat: number, lng: number): string {
  return `vol-${Math.floor(lat * 10)}-${Math.floor(lng * 10)}`;
}

function genDeviceId(): string {
  return crypto.randomUUID();
}

type PeerHandler = (peerId: string, peer: MeshPeer) => void;
type MessageHandler = (msg: MeshMessage) => void;

interface PeerPosition {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

export class VolcanoMesh {
  readonly deviceId: string;
  private room = '';
  private sse: EventSource | null = null;
  private pcs = new Map<string, RTCPeerConnection>();
  private channels = new Map<string, RTCDataChannel>();
  private peers = new Map<string, MeshPeer>();

  private onStatusChange?: (s: MeshStatus) => void;
  private onPeersChange?: PeerHandler;
  private onMessage?: MessageHandler;

  private positionInterval: ReturnType<typeof setInterval> | null = null;
  private currentPosition?: PeerPosition;

  constructor() {
    if (typeof window === 'undefined') throw new Error('VolcanoMesh: client only');
    this.deviceId = localStorage.getItem('mesh-device-id') ?? genDeviceId();
    localStorage.setItem('mesh-device-id', this.deviceId);
  }

  onStatus(fn: (s: MeshStatus) => void): void {
    this.onStatusChange = fn;
  }

  onPeer(fn: PeerHandler): void {
    this.onPeersChange = fn;
  }

  onMsg(fn: MessageHandler): void {
    this.onMessage = fn;
  }

  async start(lat: number, lng: number): Promise<void> {
    this.currentPosition = { lat, lng, accuracy: 10, timestamp: Date.now() };
    this.room = geoRoom(lat, lng);
    this.onStatusChange?.('connecting');

    const url = `/api/mesh/signal?deviceId=${encodeURIComponent(this.deviceId)}&room=${encodeURIComponent(this.room)}`;
    this.sse = new EventSource(url);

    this.sse.onopen = () => this.onStatusChange?.('connected');
    this.sse.onerror = () => this.onStatusChange?.('error');

    this.sse.onmessage = (e: MessageEvent<string>) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(e.data) as Record<string, unknown>;
      } catch {
        return;
      }
      void this.handleSignal(msg);
    };

    this.positionInterval = setInterval(() => this.broadcastPosition(), 10000);
  }

  stop(): void {
    this.sse?.close();
    this.sse = null;
    if (this.positionInterval) clearInterval(this.positionInterval);
    this.pcs.forEach((pc) => pc.close());
    this.pcs.clear();
    this.channels.clear();
    this.peers.clear();
    this.onStatusChange?.('idle');
  }

  private async handleSignal(msg: Record<string, unknown>): Promise<void> {
    const type = msg.type as string;

    if (type === 'room-peers') {
      const peers = msg.peers as string[];
      for (const peerId of peers) {
        await this.createOffer(peerId);
      }
    } else if (type === 'peer-left') {
      const peerId = msg.deviceId as string;
      this.pcs.get(peerId)?.close();
      this.pcs.delete(peerId);
      this.channels.delete(peerId);
      this.peers.delete(peerId);
      this.onPeersChange?.(peerId, null as unknown as MeshPeer);
    } else if (type === 'offer') {
      await this.handleOffer(
        msg.from as string,
        msg.sdp as RTCSessionDescriptionInit,
      );
    } else if (type === 'answer') {
      await this.handleAnswer(
        msg.from as string,
        msg.sdp as RTCSessionDescriptionInit,
      );
    } else if (type === 'ice') {
      await this.handleIce(
        msg.from as string,
        msg.candidate as RTCIceCandidateInit,
      );
    }
  }

  private async relay(to: string, message: unknown): Promise<void> {
    await fetch('/api/mesh/signal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, message }),
    }).catch(() => {});
  }

  private createPeerConnection(peerId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.pcs.set(peerId, pc);

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        void this.relay(peerId, {
          type: 'ice',
          from: this.deviceId,
          candidate: candidate.toJSON(),
        });
      }
    };

    pc.ondatachannel = ({ channel }) => {
      this.setupChannel(peerId, channel);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.pcs.delete(peerId);
        this.channels.delete(peerId);
        this.peers.delete(peerId);
      }
    };

    return pc;
  }

  private setupChannel(peerId: string, channel: RTCDataChannel): void {
    this.channels.set(peerId, channel);

    channel.onopen = () => {
      this.sendToPeer(peerId, {
        type: 'position' as MeshMessageType,
        from: this.deviceId,
        payload: this.currentPosition,
        timestamp: Date.now(),
      });
    };

    channel.onmessage = ({ data }: MessageEvent<string>) => {
      let msg: MeshMessage;
      try {
        msg = JSON.parse(data) as MeshMessage;
      } catch {
        return;
      }
      this.handleDataMessage(peerId, msg);
    };

    channel.onclose = () => {
      this.channels.delete(peerId);
    };
  }

  private async createOffer(peerId: string): Promise<void> {
    const pc = this.createPeerConnection(peerId);
    const channel = pc.createDataChannel('volcano', { ordered: false, maxRetransmits: 2 });
    this.setupChannel(peerId, channel);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await this.relay(peerId, { type: 'offer', from: this.deviceId, sdp: offer });
  }

  private async handleOffer(
    peerId: string,
    sdp: RTCSessionDescriptionInit,
  ): Promise<void> {
    const pc = this.createPeerConnection(peerId);
    await pc.setRemoteDescription(sdp);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await this.relay(peerId, { type: 'answer', from: this.deviceId, sdp: answer });
  }

  private async handleAnswer(
    peerId: string,
    sdp: RTCSessionDescriptionInit,
  ): Promise<void> {
    const pc = this.pcs.get(peerId);
    if (!pc) return;
    await pc.setRemoteDescription(sdp);
  }

  private async handleIce(
    peerId: string,
    candidate: RTCIceCandidateInit,
  ): Promise<void> {
    const pc = this.pcs.get(peerId);
    if (!pc) return;
    await pc.addIceCandidate(candidate).catch(() => {});
  }

  private handleDataMessage(peerId: string, msg: MeshMessage): void {
    if (msg.type === 'position') {
      const payload = msg.payload as PeerPosition | undefined;
      const existing = this.peers.get(peerId);
      const peer: MeshPeer = {
        deviceId: peerId,
        lastSeen: Date.now(),
        ...existing,
      };
      if (payload) peer.position = payload;
      this.peers.set(peerId, peer);
      this.onPeersChange?.(peerId, peer);
    } else if (msg.type === 'ping') {
      this.sendToPeer(peerId, {
        type: 'pong',
        from: this.deviceId,
        payload: null,
        timestamp: Date.now(),
      });
    }

    this.onMessage?.(msg);
  }

  private sendToPeer(peerId: string, msg: MeshMessage): void {
    const ch = this.channels.get(peerId);
    if (ch?.readyState === 'open') {
      ch.send(JSON.stringify(msg));
    }
  }

  private broadcast(msg: Omit<MeshMessage, 'from'>): void {
    const full: MeshMessage = { ...msg, from: this.deviceId };
    for (const [peerId] of this.channels) {
      this.sendToPeer(peerId, full);
    }
  }

  updatePosition(lat: number, lng: number, accuracy: number): void {
    this.currentPosition = { lat, lng, accuracy, timestamp: Date.now() };
  }

  broadcastPosition(): void {
    if (!this.currentPosition) return;
    this.broadcast({ type: 'position', payload: this.currentPosition, timestamp: Date.now() });
  }

  sendSOS(): void {
    this.broadcast({
      type: 'sos',
      payload: {
        position: this.currentPosition,
        deviceId: this.deviceId,
      },
      timestamp: Date.now(),
    });
  }

  getPeers(): MeshPeer[] {
    return Array.from(this.peers.values());
  }

  get connectedCount(): number {
    return Array.from(this.channels.values()).filter((ch) => ch.readyState === 'open').length;
  }
}
