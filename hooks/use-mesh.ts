'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { VolcanoMesh } from '@/lib/mesh/volcano-mesh';
import type { MeshMessage, MeshPeer, MeshStatus } from '@/lib/mesh/types';

export function useMesh(
  enabled: boolean,
  position: { lat: number; lng: number } | null,
) {
  const meshRef = useRef<VolcanoMesh | null>(null);
  const [status, setStatus] = useState<MeshStatus>('idle');
  const [peers, setPeers] = useState<Map<string, MeshPeer>>(new Map());
  const [sosPeers, setSosPeers] = useState<MeshMessage[]>([]);

  useEffect(() => {
    if (!enabled || !position) return;

    const mesh = new VolcanoMesh();
    meshRef.current = mesh;

    mesh.onStatus(setStatus);
    mesh.onPeer((peerId, peer) => {
      setPeers((prev) => {
        const next = new Map(prev);
        if (peer) next.set(peerId, peer);
        else next.delete(peerId);
        return next;
      });
    });
    mesh.onMsg((msg) => {
      if (msg.type === 'sos') {
        setSosPeers((prev) => [...prev.slice(-9), msg]);
      }
    });

    void mesh.start(position.lat, position.lng);

    return () => {
      mesh.stop();
      meshRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, position?.lat, position?.lng]);

  useEffect(() => {
    if (position && meshRef.current) {
      meshRef.current.updatePosition(position.lat, position.lng, 10);
    }
  }, [position?.lat, position?.lng]);

  const sendSOS = useCallback(() => {
    meshRef.current?.sendSOS();
  }, []);

  return {
    status,
    peers,
    sosPeers,
    sendSOS,
    deviceId: meshRef.current?.deviceId,
  };
}
