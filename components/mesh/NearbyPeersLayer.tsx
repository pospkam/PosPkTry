'use client';

import { useEffect, useRef } from 'react';
import type { MeshPeer } from '@/lib/mesh/types';
import type L from 'leaflet';

interface Props {
  peers: MeshPeer[];
  map: L.Map | null;
}

type LeafletGlobal = typeof L;

export default function NearbyPeersLayer({ peers, map }: Props) {
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  useEffect(() => {
    if (!map || typeof window === 'undefined') return;
    // @ts-expect-error -- Leaflet loaded globally by LeafletMap component
    const LeafletLib = (window as Record<string, unknown>).L as LeafletGlobal | undefined;
    if (!LeafletLib) return;

    const existing = new Set(markersRef.current.keys());

    for (const peer of peers) {
      if (!peer.position) continue;
      const { lat, lng } = peer.position;

      if (markersRef.current.has(peer.deviceId)) {
        markersRef.current.get(peer.deviceId)!.setLatLng([lat, lng]);
        existing.delete(peer.deviceId);
      } else {
        const icon = LeafletLib.divIcon({
          html: `<div style="width:12px;height:12px;border-radius:50%;background:#3FB950;border:2px solid white;box-shadow:0 0 6px rgba(63,185,80,0.7)"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6],
          className: '',
        });
        const marker = LeafletLib.marker([lat, lng], { icon })
          .bindTooltip(peer.nickname ?? `Турист ${peer.deviceId.slice(0, 6)}`, {
            permanent: false,
          })
          .addTo(map);
        markersRef.current.set(peer.deviceId, marker);
        existing.delete(peer.deviceId);
      }
    }

    for (const gone of existing) {
      markersRef.current.get(gone)?.remove();
      markersRef.current.delete(gone);
    }
  }, [peers, map]);

  useEffect(() => {
    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
    };
  }, []);

  return null;
}
