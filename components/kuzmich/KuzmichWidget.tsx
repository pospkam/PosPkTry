'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { Sparkles, Send, Loader2, X, MessageCircle, Camera, ExternalLink, Fish, Mountain, Droplets, Waves, CheckCircle, Minus, Plus } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useGeo } from '@/contexts/GeoContext';

// Страницы где виджет не нужен
const HIDDEN_PATHS = ['/', '/kuzmich', '/hub/admin', '/hub/operator'];

interface BookingFormData {
  tourId: number;
  tourTitle: string;
  tourPrice: number;
  tourImage: string | null;
  operatorName: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  imagePreview?: string;
  tours?: { id: number; title: string; base_price: number; tour_image: string | null; operator_name: string }[];
  bookingForm?: BookingFormData;
  bookingConfirmed?: { id: number };
}

// ── Компактная форма бронирования для виджета ──────────────────────────────────
function BookingWidget({ data, onDone }: { data: BookingFormData; onDone: (id: number) => void }) {
  const [name,  setName]  = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [date,  setDate]  = useState('');
  const [qty,   setQty]   = useState(1);
  const [busy,  setBusy]  = useState(false);
  const [err,   setErr]   = useState('');
  const [done,  setDone]  = useState(false);
  const [bookingId, setBookingId] = useState<number | null>(null);

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !date) { setErr('Заполните все поля'); return; }
    setBusy(true); setErr('');
    try {
      const res = await fetch('/api/hub/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tour_id: data.tourId,
          tourist_name: name.trim(),
          tourist_phone: phone.trim(),
          tourist_email: email.trim() || undefined,
          participants_count: qty,
          booking_date: date,
        }),
      });
      const json = await res.json() as { id?: number; error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Ошибка сервера');
      const id = json.id!;
      setDone(true);
      setBookingId(id);
      onDone(id);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Попробуйте позже');
    } finally {
      setBusy(false);
    }
  }

  if (done && bookingId) {
    return (
      <div className="rounded-xl border border-[var(--success)]/30 bg-[var(--success)]/5 p-3 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-[var(--success)] text-xs font-medium">
          <CheckCircle size={14} />
          Бронирование #{bookingId} создано
        </div>
        <a href={`/booking-success/${bookingId}`} target="_blank" rel="noopener noreferrer"
          className="text-xs text-center py-2 rounded-lg bg-[var(--accent)] text-white hover:opacity-90 transition-opacity">
          Перейти к оплате
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={e => { void submit(e); }}
      className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3 flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <p className="text-xs font-semibold text-[var(--text-primary)] leading-tight">{data.tourTitle}</p>
        <p className="text-xs text-[var(--accent)]">от {data.tourPrice.toLocaleString('ru-RU')} ₽/чел</p>
      </div>
      <input required value={name} onChange={e => setName(e.target.value)}
        placeholder="Ваше имя"
        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-colors" />
      <input required value={phone} onChange={e => setPhone(e.target.value)}
        placeholder="+7 900 000-00-00" type="tel"
        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-colors" />
      <input value={email} onChange={e => setEmail(e.target.value)}
        placeholder="Email (необязательно)" type="email"
        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-colors" />
      <input required value={date} onChange={e => setDate(e.target.value)}
        type="date" min={minDateStr}
        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] outline-none focus:border-[var(--accent)] transition-colors" />
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--text-secondary)]">Человек:</span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setQty(q => Math.max(1, q - 1))}
            className="w-6 h-6 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:border-[var(--accent)] transition-colors">
            <Minus size={10} />
          </button>
          <span className="text-xs font-medium w-4 text-center text-[var(--text-primary)]">{qty}</span>
          <button type="button" onClick={() => setQty(q => Math.min(20, q + 1))}
            className="w-6 h-6 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:border-[var(--accent)] transition-colors">
            <Plus size={10} />
          </button>
        </div>
      </div>
      {err && <p className="text-xs text-[var(--danger)]">{err}</p>}
      <button type="submit" disabled={busy}
        className="w-full py-2 rounded-lg bg-[var(--accent)] text-white text-xs font-medium disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5">
        {busy ? <><Loader2 size={11} className="animate-spin" /> Отправляем...</> : 'Забронировать'}
      </button>
    </form>
  );
}

export default function KuzmichWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  // Тот же ключ что на /kuzmich — история общая
  const [sessionId] = useState(() => {
    if (typeof window === 'undefined') return `w-${Date.now()}`;
    try {
      const k = 'th_kuzmich_session';
      let s = localStorage.getItem(k) ?? '';
      if (!s) { s = crypto.randomUUID?.() ?? `w-${Date.now()}`; localStorage.setItem(k, s); }
      return s;
    } catch { return `w-${Date.now()}`; }
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pulse, setPulse] = useState(true);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Захватываем UTM/referrer один раз при монтировании
  const utmRef = useRef<Record<string, string>>({});
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = new URLSearchParams(window.location.search);
    const ref = document.referrer;
    utmRef.current = {
      ...(ref ? { referrerSource: ref.slice(0, 255) } : {}),
      ...(p.get('utm_source')   ? { utmSource:   p.get('utm_source')!.slice(0, 100)   } : {}),
      ...(p.get('utm_medium')   ? { utmMedium:   p.get('utm_medium')!.slice(0, 100)   } : {}),
      ...(p.get('utm_campaign') ? { utmCampaign: p.get('utm_campaign')!.slice(0, 100) } : {}),
    };
  }, []);

  // Загружаем историю из БД при первом открытии виджета
  useEffect(() => {
    if (!open || historyLoaded || !sessionId) return;
    setHistoryLoaded(true);
    fetch(`/api/ai/chat?sessionId=${encodeURIComponent(sessionId)}`)
      .then(r => r.json())
      .then(d => {
        const msgs: { role: string; content: string }[] = d?.data?.messages ?? [];
        const visible = msgs.filter(m => m.role === 'user' || m.role === 'assistant');
        if (visible.length > 0) setMessages(visible as Message[]);
      })
      .catch(() => {});
  }, [open, historyLoaded, sessionId]);

  // Отключить pulse после первого открытия
  useEffect(() => {
    if (open) setPulse(false);
  }, [open]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  // Geo: read location from GeoContext (never request permission here)
  const { location, permissionState, mode } = useGeo();

  const send = useCallback(async (text: string) => {
    if ((!text.trim() && !imageFile) || loading) return;

    let imageBase64: string | undefined;
    let imageMimeType: string | undefined;
    let previewUrl: string | undefined;

    if (imageFile && imagePreview) {
      imageBase64 = imagePreview.split(',')[1];
      imageMimeType = imageFile.type;
      previewUrl = imagePreview;
    }

    const userMsg: Message = {
      role: 'user',
      content: text.trim() || '(фото)',
      ...(previewUrl ? { imagePreview: previewUrl } : {}),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    clearImage();
    setLoading(true);

    // Only send location if permission granted AND user is on-site (on Kamchatka)
    const geoPayload = (permissionState === 'granted' && location && mode === 'on-site')
      ? { userLocation: { lat: location.lat, lng: location.lng, accuracy: location.accuracy } }
      : {};

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim() || 'Что на этом фото?',
          sessionId,
          role: 'tourist',
          history: messages.slice(-8).map(m => ({ role: m.role, content: m.content })),
          ...(imageBase64 ? { imageBase64, imageMimeType } : {}),
          ...geoPayload,
          ...utmRef.current,
        }),
      });
      const data = await res.json() as {
        data?: {
          answer?: string;
          tours?: Message['tours'];
          limitReached?: boolean;
          bookingForm?: BookingFormData;
        }
      };

      if (data.data?.limitReached) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Чтобы продолжить — зарегистрируйтесь. Это бесплатно.',
        }]);
        return;
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.data?.answer ?? 'Попробуйте ещё раз.',
        ...(data.data?.tours?.length ? { tours: data.data.tours } : {}),
        ...(data.data?.bookingForm ? { bookingForm: data.data.bookingForm } : {}),
      }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Нет связи. Попробуйте позже.' }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [loading, sessionId, messages, imageFile, imagePreview]);

  // Скрываем на определённых страницах
  if (HIDDEN_PATHS.some(p => pathname?.startsWith(p))) return null;

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5_000_000) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = ev => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <>
      {/* Floating button */}
      <div className={`fixed bottom-6 right-6 z-50 flex-col items-end gap-2 ${open ? 'hidden sm:flex' : 'flex'}`}>
        {/* Подсказка при первом посещении */}
        {!open && messages.length === 0 && pulse && (
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--text-secondary)] shadow-lg max-w-[180px] text-right animate-in fade-in slide-in-from-bottom-2">
            Спросите Кузьмича про туры
          </div>
        )}

        <button
          onClick={() => setOpen(o => !o)}
          className="w-14 h-14 rounded-full bg-[var(--accent)] text-white shadow-lg hover:opacity-90 active:scale-95 transition-all flex items-center justify-center relative"
          aria-label="Чат с Кузьмичом"
        >
          {open
            ? <X size={22} />
            : <MessageCircle size={22} />
          }
          {pulse && !open && (
            <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-[var(--success)] border-2 border-white animate-pulse" />
          )}
        </button>
      </div>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-0 right-0 z-50 w-full h-[92dvh] sm:bottom-24 sm:right-6 sm:w-80 sm:h-[500px] bg-[var(--bg-card)] border border-[var(--border)] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-3">

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-hover)]">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/15 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-[var(--accent)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Кузьмич</p>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
                <p className="text-xs text-[var(--text-muted)]">AI-гид по Камчатке</p>
              </div>
            </div>
            <Link href="/kuzmich" target="_blank"
              className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
              title="Открыть полный чат">
              <ExternalLink size={14} />
            </Link>
            <button onClick={() => setOpen(false)}
              className="sm:hidden p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              aria-label="Закрыть">
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center pt-6">
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Привет! Я Кузьмич — знаю каждый маршрут Камчатки.
                  Спросите про туры, цены, сезон.
                </p>
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {([
                    { icon: Fish,     label: 'Рыбалка',  query: 'Хочу порыбачить на Камчатке' },
                    { icon: Mountain, label: 'Вулканы',  query: 'Туры на вулканы Камчатки' },
                    { icon: Droplets, label: 'Гейзеры',  query: 'Долина гейзеров и термальные источники' },
                    { icon: Waves,    label: 'Океан',    query: 'Туры к океану на Камчатке' },
                  ] as { icon: React.ElementType; label: string; query: string }[]).map(chip => (
                    <button key={chip.label} onClick={() => send(chip.query)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all">
                      <chip.icon size={12} />
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start gap-2'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-md bg-[var(--accent)]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-3 h-3 text-[var(--accent)]" />
                  </div>
                )}
                <div className="flex flex-col gap-1.5 max-w-[85%]">
                  {msg.imagePreview && (
                    <Image src={msg.imagePreview} alt="фото" width={120} height={90}
                      className="rounded-lg object-cover self-end" />
                  )}
                  {msg.content && (
                    <div className={`px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap rounded-xl ${
                      msg.role === 'user'
                        ? 'bg-[var(--accent)] text-white rounded-br-sm'
                        : 'bg-[var(--bg-hover)] text-[var(--text-primary)] rounded-bl-sm'
                    }`}>
                      {msg.content}
                    </div>
                  )}
                  {/* Форма бронирования */}
                  {msg.bookingForm && !msg.bookingConfirmed && (
                    <BookingWidget
                      data={msg.bookingForm}
                      onDone={(id) => {
                        setMessages(prev => prev.map((m, idx) =>
                          idx === i ? { ...m, bookingForm: undefined, bookingConfirmed: { id } } : m
                        ));
                      }}
                    />
                  )}
                  {msg.bookingConfirmed && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--success)]/10 text-[var(--success)] text-xs">
                      <CheckCircle size={13} />
                      Бронирование #{msg.bookingConfirmed.id} создано
                    </div>
                  )}
                  {/* Мини-карточки туров */}
                  {msg.tours?.map(t => (
                    <Link key={t.id} href={`/marketplace/tours/${t.id}`} target="_blank"
                      className="flex items-center gap-2 p-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--accent)] transition-all group">
                      {t.tour_image
                        ? <div className="relative w-10 h-8 rounded overflow-hidden shrink-0">
                            <Image src={t.tour_image} alt={t.title} fill className="object-contain" />
                          </div>
                        : <div className="w-10 h-8 rounded bg-[var(--accent)]/10 shrink-0" />
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--accent)]">{t.title}</p>
                        <p className="text-xs text-[var(--accent)]">от {t.base_price.toLocaleString('ru-RU')} ₽</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-md bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
                  <Sparkles className="w-3 h-3 text-[var(--accent)]" />
                </div>
                <div className="bg-[var(--bg-hover)] rounded-xl rounded-bl-sm px-3 py-2 text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                  <Loader2 size={11} className="animate-spin" /> думаю...
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Превью фото */}
          {imagePreview && (
            <div className="px-3 py-1.5 flex items-center gap-2 border-t border-[var(--border)]">
              <div className="relative">
                <Image src={imagePreview} alt="фото" width={36} height={36}
                  className="rounded object-cover w-9 h-9" />
                <button onClick={clearImage}
                  className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[var(--danger)] flex items-center justify-center">
                  <X className="w-2 h-2 text-white" />
                </button>
              </div>
              <p className="text-xs text-[var(--text-muted)]">Фото готово</p>
            </div>
          )}

          {/* Input */}
          <div className="flex items-center gap-2 p-3 border-t border-[var(--border)]">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
            <button onClick={() => fileRef.current?.click()}
              className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors shrink-0">
              <Camera size={15} />
            </button>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
              placeholder="Спросите про туры..."
              className="flex-1 bg-transparent text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
            />
            <button onClick={() => send(input)}
              disabled={(!input.trim() && !imageFile) || loading}
              className="p-1.5 rounded-lg bg-[var(--accent)] text-white disabled:opacity-40 transition-opacity hover:opacity-90 shrink-0">
              <Send size={13} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
