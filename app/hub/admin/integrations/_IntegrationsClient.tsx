'use client';

import { useState, useEffect, useCallback } from 'react';
import { Protected } from '@/components/auth/Protected';
import {
  Plug, Plus, Copy, Check, Eye, EyeOff, Trash2,
  Loader2, ChevronDown, ChevronUp, Globe, Shield,
  ToggleLeft, ToggleRight,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OctoKey {
  id: string;
  name: string;
  api_key: string;
  operator_id: string | null;
  operator_name: string | null;
  can_read_products: boolean;
  can_read_availability: boolean;
  can_create_bookings: boolean;
  rate_limit_per_minute: number;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  notes: string | null;
  webhook_url: string | null;
}

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ─── Create Form ──────────────────────────────────────────────────────────────

function CreateForm({ onCreated }: { onCreated: (key: OctoKey & { api_key: string }) => void }) {
  const [name,        setName]        = useState('');
  const [notes,       setNotes]       = useState('');
  const [webhookUrl,  setWebhookUrl]  = useState('');
  const [rateLimit,   setRateLimit]   = useState(60);
  const [canProducts, setCanProducts] = useState(true);
  const [canAvail,    setCanAvail]    = useState(true);
  const [canBook,     setCanBook]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');

  async function create() {
    if (!name.trim()) { setError('Укажите название'); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/admin/octo-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          notes: notes.trim() || undefined,
          webhookUrl: webhookUrl.trim() || undefined,
          canReadProducts: canProducts,
          canReadAvailability: canAvail,
          canCreateBookings: canBook,
          rateLimitPerMinute: rateLimit,
        }),
      });
      const j: unknown = await res.json();
      if (typeof j === 'object' && j !== null && 'success' in j && (j as { success: boolean }).success) {
        onCreated((j as unknown as { data: OctoKey & { api_key: string } }).data);
        setName(''); setNotes(''); setWebhookUrl('');
      } else {
        setError((j as { error?: string }).error ?? 'Ошибка');
      }
    } catch { setError('Сетевая ошибка'); }
    finally { setSaving(false); }
  }

  const inputCls = 'w-full px-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]';
  const labelCls = 'block text-xs font-medium text-[var(--text-secondary)] mb-1';

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 space-y-4">
      <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
        <Plus className="w-4 h-4 text-[var(--accent)]" /> Новый ключ
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Название партнёра *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Tiqets, Headout..." className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Rate limit (запросов/мин)</label>
          <input type="number" min={1} max={1000} value={rateLimit} onChange={e => setRateLimit(Number(e.target.value))} className={inputCls} />
        </div>
      </div>

      <div>
        <label className={labelCls}><Globe className="w-3 h-3 inline mr-1" />Webhook URL (OCTO Notifications)</label>
        <input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://partner.com/octo/webhook" className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Примечания</label>
        <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Контакт, договор..." className={inputCls} />
      </div>

      <div className="flex flex-wrap gap-3">
        {[
          { label: 'Туры',         val: canProducts, set: setCanProducts },
          { label: 'Доступность',  val: canAvail,    set: setCanAvail    },
          { label: 'Бронирование', val: canBook,      set: setCanBook     },
        ].map(({ label, val, set }) => (
          <button
            key={label}
            onClick={() => set(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              val
                ? 'bg-[var(--success)]/10 border-[var(--success)]/30 text-[var(--success)]'
                : 'border-[var(--border)] text-[var(--text-muted)]'
            }`}
          >
            {val ? <Check className="w-3 h-3" /> : null}
            {label}
          </button>
        ))}
      </div>

      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}

      <button
        onClick={create}
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        Создать
      </button>
    </div>
  );
}

// ─── Key Card ─────────────────────────────────────────────────────────────────

function KeyCard({
  keyData,
  onToggle,
  onDelete,
}: {
  keyData: OctoKey;
  onToggle: (id: string, active: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [expanded, setExpanded]   = useState(false);
  const [showKey,   setShowKey]   = useState(false);
  const [copied,    setCopied]    = useState(false);
  const [acting,    setActing]    = useState(false);

  async function copyKey() {
    await navigator.clipboard.writeText(keyData.api_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function toggle() {
    setActing(true);
    await onToggle(keyData.id, !keyData.is_active);
    setActing(false);
  }

  async function del() {
    if (!confirm(`Деактивировать ключ «${keyData.name}»?`)) return;
    setActing(true);
    await onDelete(keyData.id);
    setActing(false);
  }

  const perm = [
    keyData.can_read_products    && 'Туры',
    keyData.can_read_availability && 'Доступность',
    keyData.can_create_bookings   && 'Бронирование',
  ].filter(Boolean).join(', ');

  return (
    <div className={`bg-[var(--bg-card)] border rounded-xl overflow-hidden transition-colors ${keyData.is_active ? 'border-[var(--border)]' : 'border-[var(--border)] opacity-60'}`}>
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[var(--bg-hover)] transition-colors" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${keyData.is_active ? 'bg-[var(--success)]' : 'bg-[var(--text-muted)]'}`} />
          <div>
            <p className="font-medium text-[var(--text-primary)] text-sm">{keyData.name}</p>
            <p className="text-[10px] text-[var(--text-muted)]">{perm} · {keyData.rate_limit_per_minute} req/min · создан {formatDate(keyData.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {keyData.last_used_at && (
            <span className="text-[10px] text-[var(--text-muted)] hidden sm:block">
              использован {formatDate(keyData.last_used_at)}
            </span>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-[var(--border)] space-y-3 pt-3">
          {/* API Key */}
          <div>
            <p className="text-xs text-[var(--text-muted)] mb-1">API Key</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-[var(--bg-primary)] border border-[var(--border)] rounded px-3 py-1.5 text-[var(--text-primary)] font-mono truncate">
                {showKey ? keyData.api_key : '••••••••••••••••••••••••••••••••'}
              </code>
              <button onClick={() => setShowKey(v => !v)} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button onClick={copyKey} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                {copied ? <Check className="w-4 h-4 text-[var(--success)]" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Webhook */}
          {keyData.webhook_url && (
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-1 flex items-center gap-1">
                <Globe className="w-3 h-3" /> Webhook URL
              </p>
              <p className="text-xs text-[var(--ocean)] font-mono truncate">{keyData.webhook_url}</p>
            </div>
          )}

          {/* Permissions */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: 'Туры',         active: keyData.can_read_products },
              { label: 'Доступность',  active: keyData.can_read_availability },
              { label: 'Бронирование', active: keyData.can_create_bookings },
            ].map(({ label, active }) => (
              <span key={label} className={`text-[10px] px-2 py-0.5 rounded-full border ${
                active
                  ? 'bg-[var(--success)]/10 border-[var(--success)]/20 text-[var(--success)]'
                  : 'border-[var(--border)] text-[var(--text-muted)]'
              }`}>
                {label}
              </span>
            ))}
          </div>

          {keyData.notes && (
            <p className="text-xs text-[var(--text-secondary)] italic">{keyData.notes}</p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={toggle}
              disabled={acting}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                keyData.is_active
                  ? 'border-[var(--warning)]/30 text-[var(--warning)] hover:bg-[var(--warning)]/5'
                  : 'border-[var(--success)]/30 text-[var(--success)] hover:bg-[var(--success)]/5'
              } disabled:opacity-50`}
            >
              {acting ? <Loader2 className="w-3 h-3 animate-spin" /> : keyData.is_active ? <ToggleRight className="w-3 h-3" /> : <ToggleLeft className="w-3 h-3" />}
              {keyData.is_active ? 'Деактивировать' : 'Активировать'}
            </button>

            <button
              onClick={del}
              disabled={acting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--danger)]/20 text-[var(--danger)] hover:bg-[var(--danger)]/5 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3 h-3" /> Удалить
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function IntegrationsClient() {
  const [keys,    setKeys]    = useState<OctoKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newKey,  setNewKey]  = useState<(OctoKey & { api_key: string }) | null>(null);

  const loadKeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/octo-keys');
      const j: unknown = await res.json();
      if (typeof j === 'object' && j !== null && 'data' in j) {
        setKeys((j as { data: OctoKey[] }).data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  async function handleToggle(id: string, active: boolean) {
    await fetch(`/api/admin/octo-keys/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: active }),
    });
    setKeys(prev => prev.map(k => k.id === id ? { ...k, is_active: active } : k));
  }

  async function handleDelete(id: string) {
    await fetch(`/api/admin/octo-keys/${id}`, { method: 'DELETE' });
    setKeys(prev => prev.filter(k => k.id !== id));
  }

  function handleCreated(key: OctoKey & { api_key: string }) {
    setKeys(prev => [key, ...prev]);
    setShowForm(false);
    setNewKey(key);
  }

  const active   = keys.filter(k => k.is_active);
  const inactive = keys.filter(k => !k.is_active);

  return (
    <Protected roles={['admin']}>
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Plug className="w-6 h-6 text-[var(--accent)]" />
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Интеграции / OCTO</h1>
              <p className="text-sm text-[var(--text-muted)]">API-ключи для OTA-партнёров (Tiqets, Headout, Amadeus)</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            {showForm ? 'Отмена' : 'Создать ключ'}
          </button>
        </div>

        {/* OCTO info banner */}
        <div className="flex items-start gap-3 p-4 bg-[var(--ocean)]/5 border border-[var(--ocean)]/20 rounded-xl mb-6">
          <Shield className="w-5 h-5 text-[var(--ocean)] mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-[var(--text-primary)] mb-0.5">OCTO Standard API</p>
            <p className="text-[var(--text-secondary)]">
              Базовый URL: <code className="text-[var(--ocean)] font-mono">https://tourhab.ru/api/octo</code>
              {' · '}Авторизация: <code className="text-[var(--ocean)] font-mono">Authorization: Bearer &lt;api_key&gt;</code>
            </p>
          </div>
        </div>

        {/* New key created notice */}
        {newKey && (
          <div className="mb-4 p-4 bg-[var(--success)]/10 border border-[var(--success)]/30 rounded-xl">
            <p className="text-sm font-medium text-[var(--success)] mb-2">Ключ создан — сохраните, он показывается один раз</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-[var(--bg-card)] border border-[var(--success)]/30 rounded px-3 py-2 font-mono text-[var(--text-primary)] break-all">
                {newKey.api_key}
              </code>
              <button
                onClick={() => { navigator.clipboard.writeText(newKey.api_key); }}
                className="p-2 text-[var(--success)] hover:bg-[var(--success)]/10 rounded transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <button onClick={() => setNewKey(null)} className="text-xs text-[var(--text-muted)] mt-2 hover:text-[var(--text-secondary)] transition-colors">
              Скрыть
            </button>
          </div>
        )}

        {/* Create form */}
        {showForm && (
          <div className="mb-6">
            <CreateForm onCreated={handleCreated} />
          </div>
        )}

        {/* Keys list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
          </div>
        ) : keys.length === 0 ? (
          <div className="text-center py-16">
            <Plug className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
            <p className="text-[var(--text-secondary)]">Нет ключей. Создайте первый для OTA-партнёра.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {active.length > 0 && (
              <>
                <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide px-1">Активные ({active.length})</p>
                {active.map(k => (
                  <KeyCard key={k.id} keyData={k} onToggle={handleToggle} onDelete={handleDelete} />
                ))}
              </>
            )}
            {inactive.length > 0 && (
              <>
                <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide px-1 mt-4">Неактивные ({inactive.length})</p>
                {inactive.map(k => (
                  <KeyCard key={k.id} keyData={k} onToggle={handleToggle} onDelete={handleDelete} />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </Protected>
  );
}
