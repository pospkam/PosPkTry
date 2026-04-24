'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Sparkles, Send, Loader2, ArrowLeft, Bot, ArrowRight,
  Camera, X, MapPin, Users, Calendar, Phone, User, Mail,
  CheckCircle, ExternalLink,
  Fish, Mountain, Droplets, Waves, Backpack, Binoculars, Thermometer, Map,
  type LucideIcon,
} from 'lucide-react';

// ── Типы ──────────────────────────────────────────────────────────

interface TourCard {
  id: number;
  title: string;
  base_price: number;
  tour_image: string | null;
  operator_name: string;
  activity_type: string | null;
  location: string | null;
}

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
  imagePreview?: string;       // превью фото пользователя
  tours?: TourCard[];          // карточки туров от Кузьмича
  bookingForm?: BookingFormData; // inline-форма бронирования
  bookingConfirmed?: { id: number; tour: string };
}

// ── Быстрые чипы ──────────────────────────────────────────────────

const CHIPS: { icon: LucideIcon; text: string }[] = [
  { icon: Fish,        text: 'Хочу 3 дня: рыбалка + вулкан' },
  { icon: Binoculars,  text: 'Увидеть медведей, бюджет 50 тыс' },
  { icon: Thermometer, text: 'Горячие источники на выходные' },
  { icon: Backpack,    text: 'Треккинг для новичка' },
  { icon: Map,         text: 'Что посмотреть за 5 дней?' },
  { icon: Droplets,    text: 'Вертолёт на Долину гейзеров' },
  { icon: Fish,        text: 'Рыбалка на чавычу в июле' },
  { icon: Users,       text: 'Семейный тур с детьми' },
];

// ── BookingFormCard ────────────────────────────────────────────────

function BookingFormCard({
  data,
  onConfirmed,
}: {
  data: BookingFormData;
  onConfirmed: (bookingId: number, tourTitle: string) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState('');
  const [participants, setParticipants] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [qr, setQr] = useState<{ qrCode: string; qrLink: string; amount: number; bookingId: number } | null>(null);
  const [pollPaid, setPollPaid] = useState(false);

  const total = (data.tourPrice * participants).toLocaleString('ru-RU');
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];

  // Polling статуса оплаты каждые 3 сек
  useEffect(() => {
    if (!qr || pollPaid) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/tochka/qr?bookingId=${qr.bookingId}`);
        const json = await res.json() as { paid?: boolean };
        if (json.paid) {
          setPollPaid(true);
          clearInterval(interval);
          onConfirmed(qr.bookingId, data.tourTitle);
        }
      } catch { /* ignore */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [qr, pollPaid, onConfirmed, data.tourTitle]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      // 1. Создаём бронирование
      const bookRes = await fetch('/api/hub/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tour_id: data.tourId,
          tourist_name: name.trim(),
          tourist_email: email.trim(),
          tourist_phone: phone.trim(),
          participants_count: participants,
          booking_date: date,
        }),
      });
      const bookJson = await bookRes.json() as { id?: number; error?: string };
      if (!bookRes.ok) throw new Error(bookJson.error ?? 'Ошибка сервера');
      const bookingId = bookJson.id!;

      // 2. Запрашиваем СБП QR от Точки
      const qrRes = await fetch('/api/payments/tochka/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      });

      if (qrRes.ok) {
        const qrJson = await qrRes.json() as { qrCode: string; qrLink: string; amount: number };
        setQr({ ...qrJson, bookingId });
      } else {
        // Точка недоступна — бронь всё равно создана, оператор позвонит
        onConfirmed(bookingId, data.tourTitle);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Попробуйте ещё раз');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden shadow-sm">
      {/* Фото тура */}
      {data.tourImage && (
        <div className="relative h-36 w-full bg-[var(--bg-hover)]">
          <Image src={data.tourImage} alt={data.tourTitle} fill className="object-contain" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-2 left-3 right-3">
            <p className="text-white text-sm font-semibold leading-tight line-clamp-2">{data.tourTitle}</p>
            <p className="text-white/80 text-xs mt-0.5">{data.operatorName}</p>
          </div>
        </div>
      )}
      {!data.tourImage && (
        <div className="px-4 pt-3 pb-1">
          <p className="font-semibold text-[var(--text-primary)] text-sm">{data.tourTitle}</p>
          <p className="text-xs text-[var(--text-muted)]">{data.operatorName}</p>
        </div>
      )}

      {/* QR-экран оплаты */}
      {qr && (
        <div className="p-4 flex flex-col items-center gap-3">
          <p className="text-sm font-semibold text-[var(--text-primary)]">Оплатите через СБП</p>
          <p className="text-xs text-[var(--text-muted)] text-center">
            Откройте приложение банка → отсканируйте QR или нажмите кнопку
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/png;base64,${qr.qrCode}`}
            alt="СБП QR-код"
            className="w-48 h-48 rounded-lg border border-[var(--border)]"
          />
          <p className="text-lg font-bold text-[var(--accent)]">
            {qr.amount.toLocaleString('ru-RU')} ₽
          </p>
          <a
            href={qr.qrLink}
            className="ds-btn ds-btn-primary w-full text-sm py-2.5 text-center"
          >
            Открыть в приложении банка
          </a>
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <Loader2 className="w-3 h-3 animate-spin" />
            Ожидаем оплату...
          </div>
        </div>
      )}

      {!qr && <form onSubmit={submit} className="p-4 space-y-3">
        {/* Имя */}
        <div>
          <label className="ds-label mb-1 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" /> Ваше имя
          </label>
          <input
            required value={name} onChange={e => setName(e.target.value)}
            placeholder="Иван Петров"
            className="ds-input w-full text-sm py-2"
          />
        </div>

        {/* Email */}
        <div>
          <label className="ds-label mb-1 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5" /> Email
          </label>
          <input
            required type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="mail@example.com"
            className="ds-input w-full text-sm py-2"
          />
        </div>

        {/* Дата + Участники */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="ds-label mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Дата
            </label>
            <input
              required type="date" value={date} min={minDateStr}
              onChange={e => setDate(e.target.value)}
              className="ds-input w-full text-sm py-2"
            />
          </div>
          <div>
            <label className="ds-label mb-1 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Человек
            </label>
            <div className="flex items-center border border-[var(--border)] rounded-lg overflow-hidden">
              <button type="button" onClick={() => setParticipants(p => Math.max(1, p - 1))}
                className="px-3 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors text-sm">-</button>
              <span className="flex-1 text-center text-sm text-[var(--text-primary)]">{participants}</span>
              <button type="button" onClick={() => setParticipants(p => Math.min(50, p + 1))}
                className="px-3 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors text-sm">+</button>
            </div>
          </div>
        </div>

        {/* Телефон */}
        <div>
          <label className="ds-label mb-1 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5" /> Телефон
          </label>
          <input
            required value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="+7 900 000-00-00"
            className="ds-input w-full text-sm py-2"
          />
        </div>

        {/* Итог */}
        <div className="flex items-center justify-between text-sm pt-1 border-t border-[var(--border)]">
          <span className="text-[var(--text-muted)]">Итого:</span>
          <span className="font-semibold text-[var(--text-primary)]">{total} р.</span>
        </div>

        <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
          Перед оплатой проверьте даты, состав программы и условия участия. Если что-то не подходит, заявку можно скорректировать.
        </p>

        {error && <p className="text-xs text-[var(--danger)]">{error}</p>}

        <button
          type="submit" disabled={submitting}
          className="ds-btn ds-btn-primary w-full text-sm py-2.5 disabled:opacity-50"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Оставить заявку и перейти к оплате'}
        </button>
      </form>}
    </div>
  );
}

// ── TourMiniCard ───────────────────────────────────────────────────

function TourMiniCard({ tour }: { tour: TourCard }) {
  return (
    <Link href={`/marketplace/tours/${tour.id}`} target="_blank"
      className="flex gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--accent)] transition-all group">
      {tour.tour_image ? (
        <div className="relative w-16 h-14 rounded-lg overflow-hidden shrink-0">
          <Image src={tour.tour_image} alt={tour.title} fill className="object-contain" />
        </div>
      ) : (
        <div className="w-16 h-14 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
          <MapPin className="w-5 h-5 text-[var(--accent)]" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-[var(--text-primary)] line-clamp-2 leading-tight group-hover:text-[var(--accent)] transition-colors">
          {tour.title}
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">{tour.operator_name}</p>
        <p className="text-xs font-medium text-[var(--accent)] mt-1">
          от {tour.base_price.toLocaleString('ru-RU')} ₽
        </p>
      </div>
      <ExternalLink className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0 mt-0.5 group-hover:text-[var(--accent)] transition-colors" />
    </Link>
  );
}

// ── Основной компонент ─────────────────────────────────────────────

export default function KuzmichClient() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    const key = 'th_kuzmich_session';
    let sid = '';
    try { sid = localStorage.getItem(key) ?? ''; } catch { /* ok */ }
    if (!sid) {
      sid = crypto?.randomUUID?.() ?? `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      try { localStorage.setItem(key, sid); } catch { /* ok */ }
    }
    setSessionId(sid);

    // Загружаем историю из БД
    fetch(`/api/ai/chat?sessionId=${encodeURIComponent(sid)}`)
      .then(r => r.json())
      .then(d => {
        const msgs: { role: string; content: string }[] = d?.data?.messages ?? [];
        const visible = msgs.filter(m => m.role === 'user' || m.role === 'assistant');
        if (visible.length > 0) setMessages(visible as Message[]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Выбор изображения
  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5_000_000) { alert('Максимальный размер фото — 5 МБ'); return; }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = ev => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // Отправка сообщения
  const send = useCallback(async (text: string) => {
    if ((!text.trim() && !imageFile) || loading) return;

    // Конвертируем изображение в base64
    let imageBase64: string | undefined;
    let imageMimeType: string | undefined;
    let previewUrl: string | undefined;

    if (imageFile && imagePreview) {
      const base64Data = imagePreview.split(',')[1];
      imageBase64 = base64Data;
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

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim() || 'Что на этом фото?',
          sessionId,
          role: 'tourist',
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
          ...(imageBase64 ? { imageBase64, imageMimeType } : {}),
          ...utmRef.current,
        }),
      });
      const data = await res.json() as {
        data?: {
          answer?: string;
          tours?: TourCard[];
          bookingForm?: BookingFormData;
        };
      };

      const assistantMsg: Message = {
        role: 'assistant',
        content: data.data?.answer ?? 'Попробуйте ещё раз.',
        ...(data.data?.tours?.length ? { tours: data.data.tours } : {}),
        ...(data.data?.bookingForm ? { bookingForm: data.data.bookingForm } : {}),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Нет связи. Попробуйте позже.' }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [loading, sessionId, messages, imageFile, imagePreview]);

  // Подтверждение бронирования
  function onBookingConfirmed(msgIndex: number, bookingId: number, tourTitle: string) {
    setMessages(prev => prev.map((m, i) => {
      if (i !== msgIndex) return m;
      return { ...m, bookingForm: undefined, bookingConfirmed: { id: bookingId, tour: tourTitle } };
    }));
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `Заявка создана. Номер #${bookingId}.\n\nПроверьте детали тура на странице бронирования перед оплатой. Оператор получит уведомление автоматически.`,
    }]);
  }

  const hasMessages = messages.length > 0;

  return (
    <main className="flex-1 flex flex-col max-w-3xl w-full mx-auto px-4 pb-6 pt-20">

      {/* Навигация */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/" className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
          <ArrowLeft className="w-4 h-4" /> Главная
        </Link>
        <div className="flex-1" />
        <Link href="/request" className="flex items-center gap-1.5 text-sm text-[var(--ocean)] hover:underline">
          Оставить заявку <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Личность Кузьмича */}
      {!hasMessages && (
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--accent)]/10 mb-4">
            <Bot className="w-8 h-8 text-[var(--accent)]" />
          </div>
          <div className="inline-flex items-center gap-2 bg-[var(--success)]/10 rounded-full px-3 py-1 mb-3">
            <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
            <span className="text-xs font-medium text-[var(--success)]">Кузьмич онлайн</span>
          </div>
          <h1 className="font-playfair text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-3">
            Спросите что угодно
          </h1>
          <p className="text-[var(--text-secondary)] text-sm md:text-base max-w-md mx-auto">
            Кузьмич помогает спланировать поездку по-честному: маршрут, риски, сезон и реальные туры.
          </p>
        </div>
      )}

      {/* Чат */}
      <div className={`flex-1 flex flex-col bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden ${hasMessages ? 'min-h-[400px]' : ''}`}>

        {/* Сообщения */}
        {hasMessages && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start gap-3'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
                  </div>
                )}

                <div className="flex flex-col gap-2 max-w-[85%]">
                  {/* Фото пользователя */}
                  {msg.imagePreview && (
                    <div className="self-end">
                      <Image
                        src={msg.imagePreview} alt="Фото"
                        width={200} height={150}
                        className="rounded-xl object-cover max-h-40"
                      />
                    </div>
                  )}

                  {/* Текст */}
                  {msg.content && (
                    <div className={`px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap rounded-xl ${
                      msg.role === 'user'
                        ? 'bg-[var(--accent)] text-white rounded-br-sm self-end'
                        : 'bg-[var(--bg-hover)] text-[var(--text-primary)] rounded-bl-sm'
                    }`}>
                      {msg.content}
                    </div>
                  )}

                  {/* Карточки туров */}
                  {msg.tours && msg.tours.length > 0 && (
                    <div className="flex flex-col gap-2 w-full">
                      {msg.tours.map(tour => (
                        <TourMiniCard key={tour.id} tour={tour} />
                      ))}
                    </div>
                  )}

                  {/* Форма бронирования */}
                  {msg.bookingForm && (
                    <BookingFormCard
                      data={msg.bookingForm}
                      onConfirmed={(bookingId, tourTitle) => onBookingConfirmed(i, bookingId, tourTitle)}
                    />
                  )}

                  {/* Подтверждение */}
                  {msg.bookingConfirmed && (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[var(--success)]/10 text-[var(--success)] text-sm">
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      Бронирование #{msg.bookingConfirmed.id} создано
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
                </div>
                <div className="bg-[var(--bg-hover)] rounded-xl rounded-bl-sm px-4 py-3 text-sm text-[var(--text-muted)] flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" /> думаю...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Чипы — до первого сообщения */}
        {!hasMessages && (
          <div className="p-5 flex-1 flex flex-col justify-end">
            <p className="text-xs text-[var(--text-muted)] mb-3 text-center">Быстрые запросы:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {CHIPS.map(chip => (
                <button key={chip.text} type="button" onClick={() => send(chip.text)}
                  className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] border border-[var(--border)] rounded-full px-4 py-2 hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all">
                  <chip.icon size={13} />
                  {chip.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Превью фото */}
        {imagePreview && (
          <div className="px-4 pt-3 flex items-center gap-2">
            <div className="relative">
              <Image src={imagePreview} alt="Фото" width={56} height={56} className="rounded-lg object-cover h-14 w-14" />
              <button onClick={clearImage}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--danger)] flex items-center justify-center">
                <X className="w-2.5 h-2.5 text-white" />
              </button>
            </div>
            <p className="text-xs text-[var(--text-muted)]">Фото будет отправлено Кузьмичу</p>
          </div>
        )}

        {/* Ввод */}
        <div className="flex items-center gap-3 p-4 border-t border-[var(--border)]">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFileChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors shrink-0"
            title="Отправить фото"
          >
            <Camera size={18} />
          </button>

          <Sparkles className="w-5 h-5 text-[var(--accent)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
            placeholder={imagePreview ? 'Добавьте вопрос или просто отправьте фото...' : 'Опишите мечту о путешествии...'}
            className="flex-1 bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm outline-none"
          />
          <button type="button" onClick={() => send(input)} disabled={(!input.trim() && !imageFile) || loading}
            className="p-2 rounded-lg bg-[var(--accent)] text-white disabled:opacity-40 transition-opacity hover:opacity-90">
            <Send size={16} />
          </button>
        </div>
      </div>

      {/* Подсказка */}
      <p className="text-center text-xs text-[var(--text-muted)] mt-4">
        Предпочитаете живое общение?{' '}
        <Link href="/request" className="text-[var(--ocean)] hover:underline">
          Оставьте заявку
        </Link>{' '}
        — менеджер перезвонит в течение часа.
      </p>
    </main>
  );
}
