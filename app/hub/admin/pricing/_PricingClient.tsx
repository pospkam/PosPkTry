'use client';

import { useState, useEffect, useCallback } from 'react';
import { Protected } from '@/components/auth/Protected';
import {
  TrendingUp, Plus, Trash2, Loader2, ChevronDown,
  Sun, Snowflake, Clock, Zap, Users, Calendar, Star,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PricingRule {
  id: number;
  operator_tour_id: number;
  tour_title: string;
  operator_name: string;
  rule_type: RuleType;
  multiplier: string;
  date_from: string | null;
  date_to:   string | null;
  days_before_min: number | null;
  days_before_max: number | null;
  occupancy_min:   number | null;
  guests_min:      number | null;
  is_active: boolean;
}

interface Tour {
  id: number;
  title: string;
  operator_name: string;
  base_price: string;
}

type RuleType =
  | 'season_peak' | 'season_low'
  | 'early_bird'  | 'last_minute'
  | 'occupancy_high' | 'group_discount' | 'weekend';

// ─── Конфиг правил ────────────────────────────────────────────────────────────

const RULE_CONFIG: Record<RuleType, {
  label: string;
  icon: React.ElementType;
  color: string;
  hint: string;
  fields: ('dateRange' | 'daysBefore' | 'occupancy' | 'guests')[];
}> = {
  season_peak:     { label: 'Пик сезона',         icon: Sun,      color: 'text-[var(--warning)]',  hint: 'Надбавка в высокий сезон (июнь–сентябрь)',    fields: ['dateRange'] },
  season_low:      { label: 'Низкий сезон',        icon: Snowflake,color: 'text-[var(--ocean)]',   hint: 'Скидка в межсезонье',                          fields: ['dateRange'] },
  early_bird:      { label: 'Раннее бронирование', icon: Clock,    color: 'text-[var(--success)]', hint: 'Скидка за бронирование заранее',               fields: ['daysBefore'] },
  last_minute:     { label: 'Горящий тур',         icon: Zap,      color: 'text-[var(--accent)]',  hint: 'Надбавка / скидка за последние дни',           fields: ['daysBefore'] },
  occupancy_high:  { label: 'Высокая загрузка',    icon: TrendingUp,color:'text-[var(--accent)]',  hint: 'Надбавка когда почти всё продано',             fields: ['occupancy'] },
  group_discount:  { label: 'Скидка группе',       icon: Users,    color: 'text-[var(--ocean)]',   hint: 'Скидка при бронировании N+ человек',           fields: ['guests'] },
  weekend:         { label: 'Выходные',            icon: Calendar, color: 'text-[var(--warning)]', hint: 'Надбавка в пятницу–воскресенье',               fields: [] },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(m: string | number) {
  const v = (Number(m) - 1) * 100;
  return v >= 0 ? `+${v.toFixed(0)}%` : `${v.toFixed(0)}%`;
}

function pctColor(m: string | number) {
  return Number(m) >= 1
    ? 'text-[var(--accent)]'
    : 'text-[var(--success)]';
}

// ─── Create Form ──────────────────────────────────────────────────────────────

function CreateForm({
  tours,
  onCreated,
  onCancel,
}: {
  tours: Tour[];
  onCreated: (rule: PricingRule) => void;
  onCancel: () => void;
}) {
  const [tourId,         setTourId]         = useState('');
  const [ruleType,       setRuleType]       = useState<RuleType>('season_peak');
  const [multiplier,     setMultiplier]     = useState('1.20');
  const [dateFrom,       setDateFrom]       = useState('');
  const [dateTo,         setDateTo]         = useState('');
  const [daysBeforeMin,  setDaysBeforeMin]  = useState('');
  const [daysBeforeMax,  setDaysBeforeMax]  = useState('');
  const [occupancyMin,   setOccupancyMin]   = useState('');
  const [guestsMin,      setGuestsMin]      = useState('');
  const [saving,         setSaving]         = useState(false);
  const [error,          setError]          = useState('');

  const cfg = RULE_CONFIG[ruleType];

  async function save() {
    if (!tourId) { setError('Выберите тур'); return; }
    const m = parseFloat(multiplier);
    if (isNaN(m) || m < 0.5 || m > 3.0) { setError('Множитель: 0.50–3.00'); return; }
    setSaving(true); setError('');
    try {
      const body: Record<string, unknown> = {
        operatorTourId: Number(tourId),
        ruleType,
        multiplier: m,
      };
      if (dateFrom)      body.dateFrom      = dateFrom;
      if (dateTo)        body.dateTo        = dateTo;
      if (daysBeforeMin) body.daysBeforeMin = Number(daysBeforeMin);
      if (daysBeforeMax) body.daysBeforeMax = Number(daysBeforeMax);
      if (occupancyMin)  body.occupancyMin  = Number(occupancyMin);
      if (guestsMin)     body.guestsMin     = Number(guestsMin);

      const res = await fetch('/api/admin/pricing-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await res.json() as { success: boolean; data?: PricingRule; error?: string };
      if (j.success && j.data) {
        onCreated(j.data);
      } else {
        setError(j.error ?? 'Ошибка');
      }
    } catch { setError('Сетевая ошибка'); }
    finally  { setSaving(false); }
  }

  const inp = 'w-full px-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]';
  const lbl = 'block text-xs font-medium text-[var(--text-secondary)] mb-1';

  const multPct = (() => {
    const v = (parseFloat(multiplier) - 1) * 100;
    return isNaN(v) ? '' : v >= 0 ? `+${v.toFixed(0)}%` : `${v.toFixed(0)}%`;
  })();

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--accent)]/20 rounded-xl p-5 space-y-4">
      <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
        <Plus className="w-4 h-4 text-[var(--accent)]" /> Новое правило
      </h3>

      {/* Тур */}
      <div>
        <label className={lbl}>Тур *</label>
        <select value={tourId} onChange={e => setTourId(e.target.value)} className={inp}>
          <option value="">— выберите тур —</option>
          {tours.map(t => (
            <option key={t.id} value={t.id}>
              {t.title} ({t.operator_name}) — {Number(t.base_price).toLocaleString('ru')} ₽
            </option>
          ))}
        </select>
      </div>

      {/* Тип правила */}
      <div>
        <label className={lbl}>Тип правила *</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(Object.entries(RULE_CONFIG) as [RuleType, typeof RULE_CONFIG[RuleType]][]).map(([key, c]) => {
            const Icon = c.icon;
            return (
              <button
                key={key}
                onClick={() => setRuleType(key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors text-left ${
                  ruleType === key
                    ? 'border-[var(--accent)] bg-[var(--accent)]/5 text-[var(--text-primary)]'
                    : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)]/40'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${c.color}`} />
                {c.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-1.5">{cfg.hint}</p>
      </div>

      {/* Множитель */}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className={lbl}>Множитель (1.20 = +20%, 0.90 = −10%)</label>
          <input
            type="number" step="0.05" min="0.5" max="3.0"
            value={multiplier}
            onChange={e => setMultiplier(e.target.value)}
            className={inp}
          />
        </div>
        {multPct && (
          <div className={`px-3 py-2 rounded-lg bg-[var(--bg-primary)] text-sm font-bold border border-[var(--border)] ${Number(multiplier) >= 1 ? 'text-[var(--accent)]' : 'text-[var(--success)]'}`}>
            {multPct}
          </div>
        )}
      </div>

      {/* Условные поля */}
      {cfg.fields.includes('dateRange') && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Дата начала (мм-дд)</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={inp} />
          </div>
          <div>
            <label className={lbl}>Дата конца (мм-дд)</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={inp} />
          </div>
        </div>
      )}

      {cfg.fields.includes('daysBefore') && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Дней до тура (мин)</label>
            <input type="number" min="0" value={daysBeforeMin} onChange={e => setDaysBeforeMin(e.target.value)} placeholder="напр. 30" className={inp} />
          </div>
          <div>
            <label className={lbl}>Дней до тура (макс)</label>
            <input type="number" min="0" value={daysBeforeMax} onChange={e => setDaysBeforeMax(e.target.value)} placeholder="напр. 90" className={inp} />
          </div>
        </div>
      )}

      {cfg.fields.includes('occupancy') && (
        <div>
          <label className={lbl}>Минимальная загрузка (%)</label>
          <input type="number" min="1" max="100" value={occupancyMin} onChange={e => setOccupancyMin(e.target.value)} placeholder="напр. 70" className={inp} />
        </div>
      )}

      {cfg.fields.includes('guests') && (
        <div>
          <label className={lbl}>Минимум гостей для скидки</label>
          <input type="number" min="1" value={guestsMin} onChange={e => setGuestsMin(e.target.value)} placeholder="напр. 5" className={inp} />
        </div>
      )}

      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Сохранить
        </button>
        <button onClick={onCancel} className="px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
          Отмена
        </button>
      </div>
    </div>
  );
}

// ─── Rule Row ─────────────────────────────────────────────────────────────────

function RuleRow({
  rule,
  onDelete,
}: {
  rule: PricingRule;
  onDelete: (id: number) => void;
}) {
  const cfg = RULE_CONFIG[rule.rule_type];
  const Icon = cfg?.icon ?? Star;
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  function conditions() {
    const parts: string[] = [];
    if (rule.date_from)       parts.push(`с ${rule.date_from.slice(5)} по ${rule.date_to?.slice(5)}`);
    if (rule.days_before_min !== null) parts.push(`за ${rule.days_before_min}–${rule.days_before_max ?? '∞'} дн.`);
    if (rule.occupancy_min   !== null) parts.push(`загрузка ≥ ${rule.occupancy_min}%`);
    if (rule.guests_min      !== null) parts.push(`гостей ≥ ${rule.guests_min}`);
    return parts.join(', ') || 'всегда';
  }

  async function del() {
    if (!confirm('Удалить правило?')) return;
    setDeleting(true);
    await fetch(`/api/admin/pricing-rules?id=${rule.id}`, { method: 'DELETE' }).catch(() => {});
    onDelete(rule.id);
  }

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <Icon className={`w-4 h-4 shrink-0 ${cfg?.color ?? ''}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--text-primary)] truncate">{rule.tour_title}</p>
          <p className="text-xs text-[var(--text-muted)]">{cfg?.label ?? rule.rule_type} · {rule.operator_name}</p>
        </div>
        <span className={`text-sm font-bold tabular-nums ${pctColor(rule.multiplier)}`}>
          {pct(rule.multiplier)}
        </span>
        {expanded ? <ChevronDown className="w-4 h-4 text-[var(--text-muted)] rotate-180 transition-transform" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted)] transition-transform" />}
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-[var(--border)] pt-3 space-y-2">
          <p className="text-xs text-[var(--text-secondary)]">
            <span className="text-[var(--text-muted)]">Условие:</span> {conditions()}
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            <span className="text-[var(--text-muted)]">Множитель:</span>{' '}
            <code className="font-mono">{rule.multiplier}</code>
            {' → '}
            <span className={`font-bold ${pctColor(rule.multiplier)}`}>{pct(rule.multiplier)}</span>
          </p>
          <button
            onClick={del}
            disabled={deleting}
            className="flex items-center gap-1.5 mt-2 px-3 py-1.5 text-xs border border-[var(--danger)]/20 text-[var(--danger)] hover:bg-[var(--danger)]/5 rounded-lg transition-colors disabled:opacity-50"
          >
            {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
            Удалить
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PricingClient() {
  const [rules,    setRules]    = useState<PricingRule[]>([]);
  const [tours,    setTours]    = useState<Tour[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter,   setFilter]   = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rulesRes, toursRes] = await Promise.all([
        fetch('/api/admin/pricing-rules').then(r => r.json()) as Promise<{ success: boolean; data: PricingRule[] }>,
        fetch('/api/admin/operator-tours?limit=200').then(r => r.json()) as Promise<{ success: boolean; data: { tours?: Tour[] } }>,
      ]);
      if (rulesRes.success) setRules(rulesRes.data);
      if (toursRes.success) setTours((toursRes.data.tours ?? []) as Tour[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleCreated(rule: PricingRule) {
    setRules(prev => [rule, ...prev]);
    setShowForm(false);
  }

  const filtered = filter === 'all'
    ? rules
    : rules.filter(r => r.rule_type === filter);

  const RULE_TYPES = Object.keys(RULE_CONFIG) as RuleType[];

  // Статистика
  const peakRules  = rules.filter(r => r.rule_type === 'season_peak').length;
  const discounts  = rules.filter(r => Number(r.multiplier) < 1).length;
  const surcharges = rules.filter(r => Number(r.multiplier) > 1).length;

  return (
    <Protected roles={['admin']}>
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-[var(--accent)]" />
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Динамические цены</h1>
              <p className="text-sm text-[var(--text-muted)]">Правила автоматически применяются в OCTO API для OTA-партнёров</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            {showForm ? 'Отмена' : 'Добавить правило'}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Всего правил',  value: rules.length },
            { label: 'Надбавки',      value: surcharges, color: 'text-[var(--accent)]' },
            { label: 'Скидки',        value: discounts,  color: 'text-[var(--success)]' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${color ?? 'text-[var(--text-primary)]'}`}>{value}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Как работает */}
        {rules.length === 0 && !showForm && (
          <div className="mb-6 p-4 bg-[var(--ocean)]/5 border border-[var(--ocean)]/20 rounded-xl text-sm text-[var(--text-secondary)] space-y-1">
            <p className="font-medium text-[var(--text-primary)]">Как работает</p>
            <p>Правила перемножаются. Пример: пик сезона ×1.25 + высокая загрузка ×1.15 = итого ×1.4375 (+44%).</p>
            <p>OTA (Tiqets, Headout) автоматически получают скорректированные цены через OCTO API.</p>
          </div>
        )}

        {/* Create form */}
        {showForm && (
          <div className="mb-6">
            <CreateForm tours={tours} onCreated={handleCreated} onCancel={() => setShowForm(false)} />
          </div>
        )}

        {/* Filter tabs */}
        {rules.length > 0 && (
          <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
            {['all', ...RULE_TYPES].map(t => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  filter === t
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {t === 'all' ? `Все (${rules.length})` : RULE_CONFIG[t as RuleType].label}
              </button>
            ))}
          </div>
        )}

        {/* Rules list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <TrendingUp className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
            <p className="text-[var(--text-secondary)]">
              {rules.length === 0 ? 'Нет правил. Добавьте первое.' : 'Нет правил этого типа.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(rule => (
              <RuleRow
                key={rule.id}
                rule={rule}
                onDelete={id => setRules(prev => prev.filter(r => r.id !== id))}
              />
            ))}
          </div>
        )}

        {/* Пример */}
        {peakRules === 0 && rules.length === 0 && (
          <div className="mt-6 p-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl">
            <p className="text-xs font-medium text-[var(--text-secondary)] mb-3">Примеры правил для Камчатки</p>
            <div className="space-y-2 text-xs text-[var(--text-muted)]">
              <p><span className="text-[var(--accent)] font-medium">Пик сезона</span> — июнь–сентябрь, ×1.25 (+25%)</p>
              <p><span className="text-[var(--success)] font-medium">Низкий сезон</span> — ноябрь–март, ×0.85 (−15%)</p>
              <p><span className="text-[var(--success)] font-medium">Раннее бронирование</span> — за 60+ дней, ×0.90 (−10%)</p>
              <p><span className="text-[var(--accent)] font-medium">Высокая загрузка</span> — от 80%, ×1.15 (+15%)</p>
              <p><span className="text-[var(--success)] font-medium">Группа</span> — от 6 человек, ×0.92 (−8%)</p>
            </div>
          </div>
        )}
      </div>
    </Protected>
  );
}
