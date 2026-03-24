import { requireAdmin } from '@/lib/auth/middleware';
import { headers } from 'next/headers';
import { NextRequest } from 'next/server';
import { ArtemWorkspaceClient } from './_ArtemWorkspaceClient';

export const metadata = { title: 'Рабочее место — Артём | KamchatourHub' };

export default async function ArtemWorkspacePage() {
  const req = new NextRequest('http://localhost', { headers: await headers() });
  const auth = await requireAdmin(req);
  if (auth instanceof Response) return auth;

  return <ArtemWorkspaceClient />;
}
