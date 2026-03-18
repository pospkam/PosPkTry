'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  X, Mail, Phone, Star, Leaf, Loader2, AlertCircle,
  Calendar, Tag, Plus, Check, Send,
} from 'lucide-react';

const PRESET_TAGS = ['VIP', 'Постоянный', 'Группа', 'Проблемный', 'Оплатил аванс'];

interface Booking {
  id: string; tourName: string; status: string;
  totalPrice: number; guestsCount: number;
  startDate: string | null; createdAt: string;
}

interface Review {
  id: string; tourName: string; rating: number;
  comment: string; isVerified: boolean; createdAt: string;
}

interface CustomerProfile {
  id: string; name: string; email: string; phone: string;
  ecoPoints: number; tags: string[]; telegramId: string;
  bookings: Booking[]; reviews: Review[];
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'Ожидает',      cls: 'bg-yellow-500/20 text-yellow-400' },
  confirmed: { label: 'Подтверждена',  cls: 'bg-cyan-500/20 text-cyan-400' },
  completed: { label: 'Завершена',     cls: 'bg-green-500/20 text-green-400' },
  cancelled: { label: 'Отменена',      cls: 'bg-red-500/20 text-red-400' },
};

function fmt(v: number) { return new Intl.NumberFormat('ru-RU').format(v); }
function fmtDate(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getToken() {
  return localStorage.getItem('token') ?? localStorage.getItem('admin_token') ?? '';
}

interface Props {
  clientId: string;
  onClose: () => void;
  onTagsUpdated?: (id: string, tags: string[]) => void;
}

export default function CustomerProfileModal({ clientId, onClose, onTagsUpdated }: Props) {
  const [profile, setProfile]   = useState<CustomerProfile | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [tags, setTags]         = useState<string[]>([]);
  const [telegramId, setTelegramId] = useState('');
  const [tgEditing, setTgEditing]   = useState(false);
  const [tgInput, setTgInput]       = useState('');
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [tagInput, setTagInput] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/operator/clients/${clientId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as { success: boolean; data?: CustomerProfile; error?: string };
      if (!json.success || !json.data) throw new Error(json.error ?? 'Ошибка загрузки');
      setProfile(json.data);
      setTags(json.data.tags);
      setTelegramId(json.data.telegramId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  async function saveTags(next: string[]) {
    setSaving(true);
    try {
      const res = await fetch(`/api/operator/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ tags: next }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка');
      setTags(next);
      onTagsUpdated?.(clientId, next);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  }

  async function saveTelegramId(val: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/operator/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ telegram_id: val }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Ошибка');
      setTelegramId(val);
      setTgEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  }

  function togglePreset(tag: string) {
    const next = tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag];
    saveTags(next);
  }

  function addCustomTag() {
    const t = tagInput.trim();
    if (!t || tags.includes(t)) { setTagInput(''); return; }
    saveTags([...tags, t]);
    setTagInput('');
  }

  function removeTag(tag: string) { saveTags(tags.filter(t => t !== tag)); }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-t-3xl sm:rounded-lg w-full sm:max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] shrink-0">
          {loading ? (
            <div className="h-5 w-40 bg-[var(--bg-card)] rounded animate-pulse" />
          ) : profile ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0">
                <span className="text-cyan-400 font-bold text-lg">{profile.name.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <p className="font-semibold text-[var(--text-primary)]">{profile.name}</p>
                <p className="text-xs text-[var(--text-muted)]">{profile.email}</p>
              </div>
            </div>
          ) : <span className="text-[var(--text-primary)]">Профиль клиента</span>}
          <button onClick={onClose} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors rounded-lg hover:bg-[var(--bg-hover)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-6">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" /></div>
          ) : error ? (
            <div className="flex flex-col items-center py-16 gap-3">
              <AlertCircle className="w-8 h-8 text-red-400" />
              <p className="text-[var(--text-muted)] text-sm">{error}</p>
              <button onClick={load} className="text-cyan-400 underline text-sm">Повторить</button>
            </div>
          ) : profile && (
            <>
              {/* Info row */}
              <div className="flex flex-wrap gap-4 text-sm text-[var(--text-muted)]">
                {profile.phone && (
                  <span className="flex items-center gap-1.5"><Phone className="w-4 h-4" />{profile.phone}</span>
                )}
                <span className="flex items-center gap-1.5"><Mail className="w-4 h-4" />{profile.email}</span>
                {profile.ecoPoints > 0 && (
                  <span className="flex items-center gap-1.5 text-green-400">
                    <Leaf className="w-4 h-4" />{profile.ecoPoints} экобаллов
                  </span>
                )}
              </div>

              {/* Telegram */}
              <div className="flex items-center gap-3 flex-wrap">
                <Send className="w-4 h-4 text-[var(--ocean)] shrink-0" />
                {!tgEditing ? (
                  telegramId ? (
                    <>
                      <span className="text-sm text-[var(--text-muted)]">
                        {/^\d+$/.test(telegramId) ? telegramId : `@${telegramId}`}
                      </span>
                      <a
                        href={/^\d+$/.test(telegramId)
                          ? `tg://user?id=${telegramId}`
                          : `https://t.me/${telegramId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1 bg-[var(--ocean)]/15 hover:bg-[var(--ocean)]/25 border border-[var(--ocean)]/30 rounded-full text-[var(--ocean)] text-xs font-medium transition-colors"
                      >
                        <Send className="w-3 h-3" /> Написать
                      </a>
                      <button
                        onClick={() => { setTgInput(telegramId); setTgEditing(true); }}
                        className="text-xs text-[var(--text-muted)] hover:text-[var(--text-muted)]"
                      >изменить</button>
                    </>
                  ) : (
                    <button
                      onClick={() => { setTgInput(''); setTgEditing(true); }}
                      className="text-sm text-[var(--text-muted)] hover:text-[var(--text-muted)] flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Добавить Telegram
                    </button>
                  )
                ) : (
                  <div className="flex gap-2 flex-1">
                    <input
                      value={tgInput}
                      onChange={e => setTgInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); saveTelegramId(tgInput.trim()); }
                        if (e.key === 'Escape') setTgEditing(false);
                      }}
                      placeholder="@username или числовой ID"
                      className="flex-1 min-h-[34px] px-3 py-1 bg-[var(--bg-card)] border border-[var(--ocean)]/30 rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--ocean)]"
                    />
                    <button
                      onClick={() => saveTelegramId(tgInput.trim())}
                      disabled={saving}
                      className="px-3 py-1 bg-[var(--ocean)]/15 border border-[var(--ocean)]/30 rounded-lg text-[var(--ocean)] text-sm hover:bg-[var(--ocean)]/25 disabled:opacity-40"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setTgEditing(false)} className="px-2 text-[var(--text-muted)] hover:text-[var(--text-muted)]">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Tags */}
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-2 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" /> Теги
                  {saving && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
                  {saved  && <Check className="w-3 h-3 text-green-400 ml-1" />}
                </p>

                {/* Preset tags */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {PRESET_TAGS.map(t => (
                    <button
                      key={t}
                      onClick={() => togglePreset(t)}
                      disabled={saving}
                      className={`px-2.5 py-1 rounded-full text-xs border transition-colors disabled:opacity-50 ${
                        tags.includes(t)
                          ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400'
                          : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border)]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* Current custom tags */}
                {tags.filter(t => !PRESET_TAGS.includes(t)).length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {tags.filter(t => !PRESET_TAGS.includes(t)).map(t => (
                      <span key={t} className="flex items-center gap-1 px-2.5 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-xs text-purple-300">
                        {t}
                        <button onClick={() => removeTag(t)} className="hover:text-[var(--text-primary)] ml-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Custom tag input */}
                <div className="flex gap-2">
                  <input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag(); } }}
                    placeholder="Свой тег..."
                    maxLength={20}
                    className="flex-1 min-h-[36px] px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-cyan-500/50"
                  />
                  <button
                    onClick={addCustomTag}
                    disabled={!tagInput.trim() || saving}
                    className="px-3 py-1.5 bg-cyan-500/20 border border-cyan-500/40 rounded-lg text-cyan-400 text-sm hover:bg-cyan-500/30 disabled:opacity-40 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Bookings */}
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-2 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Бронирования ({profile.bookings.length})
                </p>
                {profile.bookings.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)] py-3 text-center">Нет бронирований</p>
                ) : (
                  <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--border)] text-[var(--text-muted)] text-xs">
                          <th className="text-left p-3">Тур</th>
                          <th className="text-left p-3">Дата</th>
                          <th className="text-left p-3">Статус</th>
                          <th className="text-right p-3">Сумма</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profile.bookings.map(b => {
                          const s = STATUS_MAP[b.status] ?? { label: b.status, cls: 'bg-[var(--bg-card)] text-[var(--text-muted)]' };
                          return (
                            <tr key={b.id} className="border-b border-[var(--border)] last:border-0">
                              <td className="p-3 text-[var(--text-secondary)] truncate max-w-[160px]">{b.tourName}</td>
                              <td className="p-3 text-[var(--text-muted)] whitespace-nowrap">{fmtDate(b.createdAt)}</td>
                              <td className="p-3">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                              </td>
                              <td className="p-3 text-right text-[var(--text-secondary)] whitespace-nowrap font-medium">{fmt(b.totalPrice)} ₽</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Reviews */}
              {profile.reviews.length > 0 && (
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-2 flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5" /> Отзывы ({profile.reviews.length})
                  </p>
                  <div className="space-y-2">
                    {profile.reviews.map(r => (
                      <div key={r.id} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-[var(--text-muted)]">{r.tourName}</span>
                          <div className="flex items-center gap-0.5">
                            {[1,2,3,4,5].map(s => (
                              <Star key={s} className={`w-3 h-3 ${s <= r.rating ? 'text-amber-400 fill-amber-400' : 'text-[var(--text-muted)]'}`} />
                            ))}
                          </div>
                        </div>
                        {r.comment && <p className="text-sm text-[var(--text-muted)]">{r.comment}</p>}
                        <p className="text-xs text-[var(--text-muted)] mt-1">{fmtDate(r.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
