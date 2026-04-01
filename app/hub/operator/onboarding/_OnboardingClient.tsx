'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2, Phone, Globe, FileText, Check,
  ChevronRight, Loader2, CreditCard, Shield
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OperatorProfile {
  id: string;
  company_name: string;
  category: string;
  description: string | null;
  short_description: string | null;
  profile_status: string;
  onboarding_completed: boolean;
  contacts: Record<string, string> | null;
  payout_method: string | null;
  payout_verified: boolean;
}

// ─── Step 1 — Профиль компании ────────────────────────────────────────────────

function Step1Profile({
  profile,
  onNext,
}: {
  profile: OperatorProfile;
  onNext: () => void;
}) {
  const [description,       setDescription]       = useState(profile.description ?? '');
  const [short_description, setShortDescription]  = useState(profile.short_description ?? '');
  const [phone,             setPhone]              = useState(profile.contacts?.phone    ?? '');
  const [telegram,          setTelegram]           = useState(profile.contacts?.telegram ?? '');
  const [website,           setWebsite]            = useState(profile.contacts?.website  ?? '');
  const [saving,            setSaving]             = useState(false);
  const [error,             setError]              = useState('');

  async function save() {
    if (!description.trim()) { setError('Заполните описание компании'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/hub/operator/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, short_description, phone, telegram, website }),
      });
      const j: unknown = await res.json();
      if (typeof j === 'object' && j !== null && 'success' in j && (j as { success: boolean }).success) {
        onNext();
      } else {
        const err = (j as { error?: string }).error;
        setError(err ?? 'Ошибка сохранения');
      }
    } catch {
      setError('Сетевая ошибка');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full px-3 py-2.5 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors';
  const labelCls = 'block text-sm font-medium text-[var(--text-secondary)] mb-1.5';

  return (
    <div className="space-y-5">
      <div>
        <label className={labelCls}>Описание компании <span className="text-[var(--danger)]">*</span></label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Расскажите о вашей компании: опыт, специализация, что делает вас особенными..."
          rows={5}
          maxLength={2000}
          className={`${inputCls} resize-none`}
        />
        <p className="text-[10px] text-[var(--text-muted)] mt-1">{description.length}/2000</p>
      </div>

      <div>
        <label className={labelCls}>Краткое описание</label>
        <input
          value={short_description}
          onChange={e => setShortDescription(e.target.value)}
          placeholder="1–2 предложения для карточки в каталоге"
          maxLength={300}
          className={inputCls}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}><Phone className="w-3.5 h-3.5 inline mr-1" />Телефон</label>
          <input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+7 (900) 000-00-00"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Telegram</label>
          <input
            value={telegram}
            onChange={e => setTelegram(e.target.value)}
            placeholder="@username"
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label className={labelCls}><Globe className="w-3.5 h-3.5 inline mr-1" />Сайт</label>
        <input
          value={website}
          onChange={e => setWebsite(e.target.value)}
          placeholder="https://yoursite.ru"
          className={inputCls}
        />
      </div>

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      <button
        onClick={save}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 py-3 bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Сохранить и продолжить
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Step 2 — Реквизиты для выплат ───────────────────────────────────────────

type PayoutMethod = 'sbp' | 'bank';

function Step2Payout({ onFinish }: { onFinish: () => void }) {
  const [method,  setMethod]  = useState<PayoutMethod>('sbp');
  const [phone,   setPhone]   = useState('');
  const [inn,     setInn]     = useState('');
  const [bik,     setBik]     = useState('');
  const [account, setAccount] = useState('');
  const [name,    setName]    = useState('');
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  async function save() {
    setSaving(true);
    setError('');
    try {
      const details =
        method === 'sbp'
          ? { method: 'sbp', phone }
          : { method: 'bank', inn, bik, account, name };

      const payRes = await fetch('/api/hub/operator/payouts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(details),
      });
      const pj: unknown = await payRes.json();
      if (typeof pj === 'object' && pj !== null && 'success' in pj && (pj as { success: boolean }).success) {
        // Mark onboarding complete
        await fetch('/api/hub/operator/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ complete_onboarding: true }),
        });
        onFinish();
      } else {
        const err = (pj as { error?: string }).error;
        setError(err ?? 'Ошибка сохранения');
      }
    } catch {
      setError('Сетевая ошибка');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full px-3 py-2.5 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors';
  const labelCls = 'block text-sm font-medium text-[var(--text-secondary)] mb-1.5';

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        {(['sbp', 'bank'] as const).map(m => (
          <button
            key={m}
            onClick={() => setMethod(m)}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg border transition-colors ${
              method === m
                ? 'bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent)]'
                : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]/50'
            }`}
          >
            {m === 'sbp' ? 'СБП' : 'Расчётный счёт'}
          </button>
        ))}
      </div>

      {method === 'sbp' ? (
        <div>
          <label className={labelCls}>Телефон СБП</label>
          <input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+79001234567"
            className={inputCls}
          />
          <p className="text-[10px] text-[var(--text-muted)] mt-1">Формат: +7XXXXXXXXXX</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Название организации / ФИО ИП</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="ООО «Компания»" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>ИНН</label>
              <input value={inn} onChange={e => setInn(e.target.value)} placeholder="1234567890" maxLength={12} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>БИК</label>
              <input value={bik} onChange={e => setBik(e.target.value)} placeholder="044525225" maxLength={9} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Расчётный счёт (20 цифр)</label>
            <input value={account} onChange={e => setAccount(e.target.value)} placeholder="40702810000000000000" maxLength={20} className={inputCls} />
          </div>
        </div>
      )}

      <div className="flex items-start gap-2 p-3 bg-[var(--ocean)]/5 border border-[var(--ocean)]/15 rounded-lg">
        <Shield className="w-4 h-4 text-[var(--ocean)] mt-0.5 shrink-0" />
        <p className="text-xs text-[var(--text-secondary)]">
          Реквизиты хранятся в зашифрованном виде. Выплата проводится после верификации.
        </p>
      </div>

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={async () => {
            await fetch('/api/hub/operator/profile', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ complete_onboarding: true }),
            }).catch(() => {});
            onFinish();
          }}
          className="flex-1 py-3 border border-[var(--border)] text-[var(--text-secondary)] rounded-lg text-sm hover:text-[var(--text-primary)] transition-colors"
        >
          Пропустить
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Завершить настройку
        </button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const STEPS = [
  { icon: Building2, label: 'Профиль компании' },
  { icon: CreditCard, label: 'Реквизиты' },
];

export default function OnboardingClient() {
  const router = useRouter();
  const [step, setStep]       = useState(0);
  const [profile, setProfile] = useState<OperatorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/hub/operator/profile')
      .then(r => r.json())
      .then((j: unknown) => {
        if (typeof j === 'object' && j !== null && 'data' in j) {
          const data = (j as { data: OperatorProfile }).data;
          setProfile(data);
          // If already done, redirect to hub
          if (data?.onboarding_completed) router.replace('/hub/operator');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  function finish() {
    router.replace('/hub/operator');
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20 text-[var(--text-secondary)]">Профиль не найден</div>
    );
  }

  const StepIcon = STEPS[step].icon;

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold font-playfair text-[var(--text-primary)] mb-2">
          Настройка профиля
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          {profile.company_name} · Заявка {profile.profile_status === 'pending' ? 'на рассмотрении' : 'одобрена'}
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center mb-8">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = i < step;
          const active = i === step;
          return (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <div className={`flex items-center gap-2 ${active ? 'text-[var(--accent)]' : done ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                  active ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                  : done  ? 'border-[var(--success)] bg-[var(--success)]/10'
                  : 'border-[var(--border)]'
                }`}>
                  {done
                    ? <Check className="w-4 h-4 text-[var(--success)]" />
                    : <Icon className="w-4 h-4" />
                  }
                </div>
                <span className="text-xs font-medium hidden sm:block">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px mx-3 transition-colors ${done ? 'bg-[var(--success)]' : 'bg-[var(--border)]'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <StepIcon className="w-5 h-5 text-[var(--accent)]" />
          <h2 className="font-semibold text-[var(--text-primary)]">{STEPS[step].label}</h2>
        </div>

        {step === 0 && (
          <Step1Profile profile={profile} onNext={() => setStep(1)} />
        )}
        {step === 1 && (
          <Step2Payout onFinish={finish} />
        )}
      </div>

      {/* Status notice */}
      {profile.profile_status === 'pending' && (
        <div className="mt-4 flex items-start gap-2 p-3 bg-[var(--warning)]/5 border border-[var(--warning)]/20 rounded-lg">
          <FileText className="w-4 h-4 text-[var(--warning)] mt-0.5 shrink-0" />
          <p className="text-xs text-[var(--text-secondary)]">
            Ваша заявка на рассмотрении. После одобрения профиль станет публичным.
            Вы можете настроить профиль уже сейчас.
          </p>
        </div>
      )}
    </div>
  );
}
