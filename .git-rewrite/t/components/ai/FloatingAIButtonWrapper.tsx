'use client';

import dynamic from 'next/dynamic';

const FloatingAIButton = dynamic(
  () => import('@/components/ai/FloatingAIButton').then(mod => ({ default: mod.default })),
  { ssr: false }
);

export default function FloatingAIButtonWrapper() {
  return <FloatingAIButton />;
}