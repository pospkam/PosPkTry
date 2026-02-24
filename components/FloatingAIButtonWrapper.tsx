'use client';

import dynamic from 'next/dynamic';

const FloatingAIButton = dynamic(
  () => import('@/components/FloatingAIButton').then(mod => ({ default: mod.default })),
  { ssr: false }
);

export default function FloatingAIButtonWrapper() {
  return <FloatingAIButton />;
}