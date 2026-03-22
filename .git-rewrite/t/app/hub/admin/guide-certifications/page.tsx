'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Award, RefreshCw, CheckCircle, XCircle, AlertTriangle, ExternalLink,
} from 'lucide-react';

interface Cert {
  id: string;
  guide_name: string | null;
  guide_email: string | null;
  name: string;
  issuing_authority: string;
  issue_date: string | null;
  expiry_date: string | null;
  certificate_number: string | null;
  document_url: string | null;
  is_verified: boolean;
}

interface Stats {
  total: string;
  verified: string;
  expired: string;
}

export default function AdminGuideCertifications() {
  const [certs, setCerts] = useState<Cert[]>([]);
  const [stats, setStats] = useState<Stats>({ total: '0', verified: '0', expired: '0' });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('verified', filter);
      const res = await fetch(`/api/admin/guide-certifications?${params}`);
      const json = await res.json();
      if (json.success) {
        setCerts(json.data.items);
        setStats(json.data.stats);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleVerify = async (id: string, verified: boolean) => {
    await fetch('/api/admin/guide-certifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_verified: verified }),
    });
    fetchData();
  };

  const kpis = [
    { label: 'Всего', value: stats.total, cls: 'text-[var(--text-primary)]' },
    { label: 'Подтверждено', value: stats.verified, cls: 'text-[var(--success)]' },
    { label: 'Просрочено', value: stats.expired, cls: 'text-[var(--danger)]' },
  ];

  return (
    <div className="p-5 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Award className="w-4 h-4 text-[var(--text-muted)]" />
          <h1 className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">Сертификаты гидов</h1>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[var(--text-secondary)] bg-[var(--bg-card)] border border-[var(--border)] rounded-md hover:bg-[var(--bg-hover)] transition-colors"
        >
          <RefreshCw className="w-3 h-3" /> Обновить
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {kpis.map(kpi => (
          <div key={kpi.label} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1">{kpi.label}</p>
            <span className={`text-xl font-semibold font-mono ${kpi.cls}`}>{kpi.value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-1.5">
        {[{ v: 'all', l: 'Все' }, { v: 'false', l: 'Не подтверждены' }, { v: 'true', l: 'Подтверждены' }].map(opt => (
          <button
            key={opt.v}
            onClick={() => setFilter(opt.v)}
            className={`px-2.5 py-1 text-[10px] font-medium rounded-md border transition-colors ${
              filter === opt.v
                ? 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/30'
                : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            {opt.l}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : certs.length === 0 ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-12 text-center">
          <Award className="w-6 h-6 text-[var(--text-muted)] mx-auto mb-2" />
          <p className="text-xs text-[var(--text-muted)]">Сертификатов не найдено</p>
        </div>
      ) : (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                <th className="px-4 py-2.5 text-left font-medium">Гид</th>
                <th className="py-2.5 text-left font-medium">Сертификат</th>
                <th className="py-2.5 text-left font-medium hidden lg:table-cell">Кем выдан</th>
                <th className="py-2.5 text-left font-medium hidden md:table-cell">Срок</th>
                <th className="py-2.5 text-left font-medium">Статус</th>
                <th className="py-2.5 text-right font-medium pr-4">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {certs.map(cert => {
                const expired = cert.expiry_date ? new Date(cert.expiry_date) < new Date() : false;
                return (
                  <tr key={cert.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-[var(--text-primary)] font-medium truncate max-w-[140px]">
                        {cert.guide_name ?? '—'}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)]">{cert.guide_email ?? ''}</p>
                    </td>
                    <td className="py-3">
                      <p className="text-[var(--text-primary)] truncate max-w-[180px]">{cert.name}</p>
                      {cert.certificate_number && (
                        <p className="text-[10px] text-[var(--text-muted)] font-mono">#{cert.certificate_number}</p>
                      )}
                    </td>
                    <td className="py-3 text-[var(--text-secondary)] hidden lg:table-cell truncate max-w-[140px]">
                      {cert.issuing_authority}
                    </td>
                    <td className="py-3 hidden md:table-cell">
                      <span className={`text-[10px] font-mono ${expired ? 'text-[var(--danger)]' : 'text-[var(--text-muted)]'}`}>
                        {cert.issue_date ? new Date(cert.issue_date).toLocaleDateString('ru-RU') : ''}
                        {cert.expiry_date ? ` — ${new Date(cert.expiry_date).toLocaleDateString('ru-RU')}` : ''}
                      </span>
                      {expired && <AlertTriangle className="inline w-3 h-3 ml-1 text-[var(--danger)]" />}
                    </td>
                    <td className="py-3">
                      {cert.is_verified ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded bg-[var(--success)]/10 text-[var(--success)]">
                          <CheckCircle className="w-2.5 h-2.5" /> ОК
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded bg-[var(--warning)]/10 text-[var(--warning)]">
                          <XCircle className="w-2.5 h-2.5" /> Ожидает
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right pr-4">
                      <div className="flex items-center gap-1 justify-end">
                        {cert.document_url && (
                          <a
                            href={cert.document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                            title="Открыть документ"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {!cert.is_verified ? (
                          <button
                            onClick={() => handleVerify(cert.id, true)}
                            className="p-1 text-[var(--text-muted)] hover:text-[var(--success)] transition-colors"
                            title="Подтвердить"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleVerify(cert.id, false)}
                            className="p-1 text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors"
                            title="Снять подтверждение"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
