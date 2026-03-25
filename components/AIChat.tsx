'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Itinerary {
  day: number;
  activity: string;
  zone: string;
  duration_h: number;
  price_per_person: number;
  notes?: string;
}

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Привет! Я Кузмич — ваш помощник в планировании приключений на Камчатке. Что вам интересно?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [itinerary, setItinerary] = useState<{
    itinerary: Itinerary[];
    total_per_person: number;
    summary: string;
    draft_booking_id: number;
  } | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [groupSize, setGroupSize] = useState(2);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/planner/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      });

      const data = await res.json();

      if (data.success && data.itinerary) {
        setItinerary(data);
        const assistantMsg: Message = {
          role: 'assistant',
          content: `✨ Готов тур на ${data.itinerary.length} дней! ${data.summary}`,
        };
        setMessages(prev => [...prev, assistantMsg]);
      } else if (data.warning) {
        const assistantMsg: Message = {
          role: 'assistant',
          content: `⚠️ ${data.warning}. ${data.suggestion}`,
        };
        setMessages(prev => [...prev, assistantMsg]);
      } else {
        const assistantMsg: Message = {
          role: 'assistant',
          content: 'Не удалось составить тур. Попробуйте другие активности.',
        };
        setMessages(prev => [...prev, assistantMsg]);
      }
    } catch (error) {
      const assistantMsg: Message = {
        role: 'assistant',
        content: 'Ошибка подключения. Попробуйте ещё раз.',
      };
      setMessages(prev => [...prev, assistantMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async () => {
    if (!itinerary) return;

    const token = localStorage.getItem('auth_token');
    if (!token) {
      alert('Пожалуйста, войдите в систему');
      return;
    }

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          draft_booking_id: itinerary.draft_booking_id,
          group_size: groupSize,
        }),
      });

      const data = await res.json();

      if (data.success) {
        const successMsg: Message = {
          role: 'assistant',
          content: `🎉 Бронирование создано! Ваш ID: ${data.booking.id}. Статус: ${data.status}`,
        };
        setMessages(prev => [...prev, successMsg]);
        setShowBookingForm(false);
        setItinerary(null);
      } else {
        alert('Ошибка: ' + data.error);
      }
    } catch (error) {
      alert('Ошибка бронирования');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      {/* Chat messages */}
      <div className="h-96 overflow-y-auto mb-4 space-y-4 bg-gray-50 rounded p-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs p-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white rounded-br-none'
                  : 'bg-gray-300 text-gray-900 rounded-bl-none'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-200 p-3 rounded-lg rounded-bl-none animate-pulse">
              Кузмич думает...
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Itinerary display */}
      {itinerary && !showBookingForm && (
        <div className="bg-amber-50 border-2 border-amber-200 p-4 rounded mb-4">
          <h3 className="font-bold mb-2 text-lg">Ваш итинерарий</h3>
          {itinerary.itinerary.map((day, i) => (
            <div key={i} className="text-sm mb-2 pb-2 border-b border-amber-100 last:border-0">
              <strong>День {day.day}:</strong> {day.activity} ({day.zone}, {day.duration_h}ч)
              <br />
              <span className="text-xs text-gray-600">{day.notes}</span>
              <br />
              <span className="font-semibold text-orange-600">₽{day.price_per_person}/чел</span>
            </div>
          ))}
          <div className="mt-3 pt-3 border-t-2 border-amber-300">
            <strong>Итого на человека: ₽{itinerary.total_per_person}</strong>
            <button
              onClick={() => setShowBookingForm(true)}
              className="w-full mt-3 bg-orange-600 text-white px-4 py-2 rounded font-semibold hover:bg-orange-700"
            >
              Забронировать
            </button>
          </div>
        </div>
      )}

      {/* Booking form */}
      {itinerary && showBookingForm && (
        <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded mb-4">
          <h3 className="font-bold mb-3">Размер группы</h3>
          <input
            type="number"
            min="1"
            max="20"
            value={groupSize}
            onChange={e => setGroupSize(parseInt(e.target.value))}
            className="w-full border px-3 py-2 rounded mb-3"
          />
          <p className="text-sm text-gray-600 mb-3">
            Итого: <strong>₽{itinerary.total_per_person * groupSize}</strong> для {groupSize} чел
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleBooking}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded font-semibold hover:bg-green-700"
            >
              Подтвердить
            </button>
            <button
              onClick={() => setShowBookingForm(false)}
              className="flex-1 bg-gray-300 text-gray-900 px-4 py-2 rounded font-semibold hover:bg-gray-400"
            >
              Отменить
            </button>
          </div>
        </div>
      )}

      {/* Input form */}
      <form onSubmit={handleSendMessage} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Например: 'Выходные с рыбалкой и вулканом'"
          className="flex-1 border border-gray-300 rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-blue-600 text-white px-6 py-3 rounded font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '...' : 'Отправить'}
        </button>
      </form>
    </div>
  );
}