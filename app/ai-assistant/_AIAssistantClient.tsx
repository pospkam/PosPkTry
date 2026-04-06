'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Bot, Send, Loader2, User, Sun, Moon, MapPin, ChevronRight } from 'lucide-react';
import Logo from '@/components/shared/Logo';
import { useTheme } from '@/contexts/ThemeContext';
import BottomNav from '@/components/shared/BottomNav';
import Link from 'next/link';
import Image from 'next/image';

interface TourSuggestion {
  id: number;
  title: string;
  description: string | null;
  base_price: number;
  activity_type: string | null;
  location: string | null;
  tour_image: string | null;
  operator_name: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  tours?: TourSuggestion[];
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function isTourSuggestion(v: unknown): v is TourSuggestion {
  return isRecord(v) && typeof v.id === 'number' && typeof v.title === 'string';
}

function formatPrice(p: number): string {
  return new Intl.NumberFormat('ru-RU').format(p) + ' ₽';
}

function TourCard({ tour }: { tour: TourSuggestion }) {
  return (
    <Link
      href={`/marketplace/tours/${tour.id}`}
      className="group flex items-start gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] hover:border-[var(--accent)]/40 hover:bg-[var(--bg-hover)] transition-all"
    >
      <div className="relative w-16 h-16 rounded-md overflow-hidden shrink-0 bg-[var(--bg-hover)]">
        {tour.tour_image ? (
          <Image
            src={tour.tour_image}
            alt={tour.title}
            fill
            sizes="64px"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin className="w-5 h-5 text-[var(--text-muted)]" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{tour.title}</p>
        <p className="text-xs text-[var(--text-secondary)] truncate">{tour.operator_name}</p>
        {tour.description && (
          <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">{tour.description}</p>
        )}
        <p className="text-xs font-medium text-[var(--accent)] mt-1">от {formatPrice(tour.base_price)}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)] shrink-0 mt-1 transition-colors" />
    </Link>
  );
}

function AIAssistantContent({ initialQuery }: { initialQuery: string | null }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => {
    if (typeof window === 'undefined') return '';
    const key = 'th_ai_assistant_session';
    let id = localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(key, id);
    }
    return id;
  });
  const [limitReached, setLimitReached] = useState(false);
  const [remainingFree, setRemainingFree] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const { isDark, toggleTheme } = useTheme();

  // Auto-send query from hero search bar (?q=...)
  useEffect(() => {
    if (!initialQuery) return;
    setInput(initialQuery);
    const t = setTimeout(() => {
      void sendMessage(initialQuery);
    }, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendMessage(text: string) {
    if (!text.trim() || loading || limitReached) return;
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          sessionId,
          role: 'tourist',
        }),
      });
      const data: unknown = await res.json();

      if (isRecord(data) && isRecord(data.data) && data.data.limitReached === true) {
        setLimitReached(true);
        const dd = data.data;
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: typeof dd.message === 'string'
            ? dd.message
            : 'Вы использовали все бесплатные сообщения. Зарегистрируйтесь, чтобы продолжить.',
        }]);
        return;
      }

      let reply = 'Извините, не удалось получить ответ. Попробуйте позже.';
      let tours: TourSuggestion[] | undefined;

      if (isRecord(data) && isRecord(data.data)) {
        const answer = data.data.answer;
        if (typeof answer === 'string') reply = answer;

        const rawTours = data.data.tours;
        if (Array.isArray(rawTours)) {
          tours = rawTours.filter(isTourSuggestion);
        }

        if (typeof data.data.remainingFree === 'number') {
          setRemainingFree(data.data.remainingFree);
        }
      }

      setMessages(prev => [...prev, { role: 'assistant', content: reply, tours }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Сервер недоступен. При опасности звоните 112 (МЧС).',
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }

  return (
    <div className="min-h-screen pb-24 md:pb-0">
      {/* Standard header */}
      <header style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <Logo size={28} />
          </Link>
          <h1 className="text-lg font-bold text-[var(--text-primary)] hidden sm:block">AI Ассистент</h1>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors" aria-label="Переключить тему">
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <Link href="/profile" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors" aria-label="Личный кабинет">
              <User size={20} />
            </Link>
          </div>
        </div>
      </header>

    <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col h-[calc(100vh-8rem)] bg-transparent">
      <div className="flex items-center gap-3 mb-6">
        <Bot className="w-8 h-8 text-[var(--ocean)]" />
        <div>
          <h1 className="font-serif text-2xl font-bold text-[var(--text-primary)]">AI Помощник</h1>
          <p className="text-sm text-[var(--text-secondary)]">Спросите о турах, погоде, безопасности на Камчатке</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {messages.length === 0 && (
          <div className="text-center py-16 text-[var(--text-muted)]">
            <Bot className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="mb-4">Задайте вопрос о Камчатке</p>
            <div className="flex flex-wrap justify-center gap-2">
              {['Какие вулканы посетить?', 'Лучшее время для рыбалки', 'Что взять в поход?'].map(q => (
                <button
                  key={q}
                  onClick={() => { setInput(q); }}
                  className="px-3 py-2 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] text-sm hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors min-h-[44px]"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={`${msg.role}-${i}`} className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} w-full`}>
              {msg.role === 'assistant' && <Bot className="w-5 h-5 text-[var(--ocean)] mt-1 shrink-0" />}
              <div className={`max-w-[80%] px-4 py-3 text-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-[var(--accent)]/20 text-[var(--text-primary)] rounded-lg rounded-br-sm'
                  : 'bg-[var(--bg-card)] text-[var(--text-primary)] rounded-lg rounded-bl-sm'
              }`}>
                {msg.content}
              </div>
              {msg.role === 'user' && <User className="w-5 h-5 text-[var(--text-muted)] mt-1 shrink-0" />}
            </div>

            {/* Tour suggestion cards */}
            {msg.role === 'assistant' && msg.tours && msg.tours.length > 0 && (
              <div className="ml-7 w-full max-w-[80%] space-y-2">
                <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Подходящие туры</p>
                {msg.tours.map(tour => (
                  <TourCard key={tour.id} tour={tour} />
                ))}
                <Link
                  href="/marketplace"
                  className="block text-xs text-[var(--ocean)] hover:underline pt-1"
                >
                  Все туры на Камчатке
                </Link>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Думаю...
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-0 bg-[var(--bg-primary)] border-t border-[var(--border)] -mx-4 px-4 py-3">
        <form onSubmit={e => { e.preventDefault(); void sendMessage(input.trim()); }} className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Спросите о Камчатке..."
            disabled={loading}
            className="flex-1 min-h-[44px] px-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="min-h-[44px] min-w-[44px] px-4 bg-[var(--accent)] text-[var(--text-primary)] rounded-xl disabled:opacity-50 flex items-center justify-center hover:bg-[var(--accent-hover)] transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>

      <BottomNav activePath="/" />
    </div>
  );
}

function AIAssistantPageInner() {
  const searchParams = useSearchParams();
  return <AIAssistantContent initialQuery={searchParams.get('q')} />;
}

export default function AIAssistantPage() {
  return (
    <Suspense fallback={<AIAssistantContent initialQuery={null} />}>
      <AIAssistantPageInner />
    </Suspense>
  );
}
