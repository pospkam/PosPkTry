'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface PartnerConfig {
  name: string;
  greeting: string;
  accentColor: string;
  logo: string | null;
}

export default function LeadFormPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [config, setConfig] = useState<PartnerConfig | null>(null);
  const [name, setName]       = useState('');
  const [phone, setPhone]     = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/widget/partner/${slug}`)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) setConfig(d.data);
      })
      .catch(() => {});
  }, [slug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          comment: comment.trim() || undefined,
          source_data: {
            source:       'partner_widget',
            partner_slug: slug,
          },
        }),
      });
      const data: unknown = await res.json();
      if (res.ok && (data as { success?: boolean }).success) {
        setSuccess(true);
        if (typeof window !== 'undefined') {
          window.parent.postMessage('th:success', '*');
        }
      } else {
        setError((data as { error?: string }).error ?? 'Ошибка. Попробуйте ещё раз.');
      }
    } catch {
      setError('Ошибка соединения. Попробуйте ещё раз.');
    } finally {
      setSubmitting(false);
    }
  }

  const accent = config?.accentColor ?? '#D44A0C';

  if (success) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        fontFamily: "'Outfit', system-ui, sans-serif",
        background: '#F5F0EB',
        textAlign: 'center',
      }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: '#3FB950',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
          fontSize: 24,
        }}>
          ✓
        </div>
        <p style={{ fontWeight: 700, fontSize: 18, color: '#1A1714', marginBottom: 8 }}>
          Заявка принята!
        </p>
        <p style={{ fontSize: 14, color: '#6B6560', lineHeight: 1.5 }}>
          Менеджер свяжется с вами в ближайшее время.
        </p>
        <button
          onClick={() => window.parent.postMessage('th:close', '*')}
          style={{
            marginTop: 24,
            padding: '10px 24px',
            background: accent,
            color: '#fff',
            border: 'none',
            borderRadius: 24,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Закрыть
        </button>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Outfit', system-ui, sans-serif",
      background: '#F5F0EB',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        background: '#FFFFFF',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        {config?.logo && (
          <img
            src={config.logo}
            alt={config.name}
            style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }}
          />
        )}
        <div>
          <p style={{ fontWeight: 600, fontSize: 14, color: '#1A1714', lineHeight: 1.2 }}>
            {config?.name ?? 'Заявка на тур'}
          </p>
          <p style={{ fontSize: 11, color: '#9A9590' }}>
            Powered by TourHub
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <p style={{ fontSize: 14, color: '#6B6560', marginBottom: 20, lineHeight: 1.5 }}>
          {config?.greeting ?? 'Оставьте заявку — менеджер свяжется с вами сегодня.'}
        </p>

        <label style={{ fontSize: 12, fontWeight: 600, color: '#6B6560', marginBottom: 4, display: 'block' }}>
          Ваше имя *
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Иван Иванов"
          required
          minLength={2}
          maxLength={120}
          style={inputStyle}
        />

        <label style={{ fontSize: 12, fontWeight: 600, color: '#6B6560', marginBottom: 4, marginTop: 14, display: 'block' }}>
          Телефон *
        </label>
        <input
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="+7 900 000-00-00"
          required
          minLength={7}
          maxLength={30}
          style={inputStyle}
        />

        <label style={{ fontSize: 12, fontWeight: 600, color: '#6B6560', marginBottom: 4, marginTop: 14, display: 'block' }}>
          Что интересует? (необязательно)
        </label>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Маршрут, даты, количество человек..."
          maxLength={500}
          rows={3}
          style={{ ...inputStyle, resize: 'none' }}
        />

        {error && (
          <p style={{ fontSize: 12, color: '#DC2626', marginTop: 10 }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting || !name.trim() || !phone.trim()}
          style={{
            marginTop: 'auto',
            paddingTop: 16,
            padding: '12px 20px',
            background: submitting || !name.trim() || !phone.trim() ? '#E0DBD5' : accent,
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 700,
            cursor: submitting ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            transition: 'background 0.15s',
          }}
        >
          {submitting ? 'Отправляем...' : 'Отправить заявку'}
        </button>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '10px 14px',
  border: '1px solid rgba(0,0,0,0.12)',
  borderRadius: 8,
  fontSize: 14,
  fontFamily: "'Outfit', system-ui, sans-serif",
  color: '#1A1714',
  background: '#FFFFFF',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};
