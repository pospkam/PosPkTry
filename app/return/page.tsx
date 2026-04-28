import type { Metadata } from 'next';
import { Suspense } from 'react';
import ReturnClient from './ReturnClient';
import { Loader2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Отметить возврат — Tourhab',
  robots: 'noindex, nofollow',
};

export default function ReturnPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[100dvh] bg-[#0a0a0a] text-white flex items-center justify-center p-6">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    }>
      <ReturnClient />
    </Suspense>
  );
}
