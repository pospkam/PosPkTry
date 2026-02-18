'use client';

import { useEffect, useState } from 'react';

export default function ApiDocsPage() {
  const [spec, setSpec] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api-docs')
      .then(res => res.json())
      .then(data => {
        setSpec(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-premium-black to-premium-gold/10 flex items-center justify-center">
        <div className="text-white text-xl">Загрузка документации...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-premium-black to-premium-gold/10 flex items-center justify-center">
        <div className="text-red-400 text-xl">Ошибка: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-premium-black to-premium-gold/10">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-black text-white mb-4">API Documentation</h1>
        <p className="text-white/70 text-lg mb-8">
          {spec?.info?.description || 'Kamhub API'}
        </p>
        
        <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-2xl p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Endpoints</h2>
          <div className="grid gap-4">
            {(spec?.tags || []).map((tag: any) => (
              <div key={tag.name} className="border-l-4 border-premium-gold pl-4">
                <h3 className="text-xl font-semibold text-white">{tag.name}</h3>
                <p className="text-white/60">{tag.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-white mb-4">OpenAPI Spec</h2>
          <pre className="text-white/70 text-sm overflow-auto max-h-96">
            {JSON.stringify(spec, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
