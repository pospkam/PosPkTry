import { Metadata } from 'next';
import PageShell from '@/components/shared/PageShell';

export const dynamic = 'force-dynamic';

// Server Component - fetch data on server instead of useEffect
async function getApiSpec() {
  try {
    const res = await fetch('/api/docs', { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
  } catch (error) {
    return null;
  }
}

export const metadata: Metadata = {
  title: 'API Documentation | Kamhub',
  description: 'Kamhub API Documentation',
};

export default async function ApiDocsPage() {
  const spec = await getApiSpec();
  const loading = false;
  const error = spec === null ? 'Failed to load API specification' : null;

  if (error) {
    return (
      <PageShell title="API Документация">
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-red-400 text-xl">Ошибка: {error}</div>
      </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="API Документация">
    <div className="bg-transparent">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-4">API Documentation</h1>
        <p className="text-[var(--text-muted)] text-lg mb-8">
          {spec?.info?.description || 'Kamhub API'}
        </p>
        
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Endpoints</h2>
          <div className="grid gap-4">
            {(spec?.tags || []).map((tag: unknown) => (
              <div key={(tag as { name: string }).name} className="border-l-4 border-[var(--accent)] pl-4">
                <h3 className="text-xl font-semibold text-[var(--text-primary)]">{(tag as { name: string }).name}</h3>
                <p className="text-[var(--text-muted)]">{(tag as { description: string }).description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">OpenAPI Spec</h2>
          <pre className="text-[var(--text-muted)] text-sm overflow-auto max-h-96">
            {JSON.stringify(spec, null, 2)}
          </pre>
        </div>
      </div>
    </div>
    </PageShell>
  );
}
