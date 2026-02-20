'use client';

import { useState } from 'react';
import { PublicNav } from '@/components/shared/PublicNav';

export const metadata = {
  title: 'Туры | Kamhub',
  description: 'Управление турами в личном кабинете',
};

export default function ToursPage() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = e.currentTarget;
    const dates = (f.elements.namedItem('dates') as HTMLInputElement).value;
    const guests = (f.elements.namedItem('guests') as HTMLInputElement).value;
    const interests = (f.elements.namedItem('interests') as HTMLInputElement).value;
    const budget = (f.elements.namedItem('budget') as HTMLInputElement).value;
    
    setLoading(true);
    setText('');
    
    const prompt = `Составь 2-дневный план по Камчатке. Даты: ${dates}. Гостей: ${guests}. Интересы: ${interests}. Бюджет: ${budget} RUB.`;
    const r = await fetch('/api/ai/groq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'llama-3.1-70b', prompt })
    });
    const j = await r.json();
    setText(j.itinerary || j.error || '');
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-premium-black text-white">
      <PublicNav />
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-black mb-6">Туры по Камчатке</h1>
        
        <button 
          onClick={() => setOpen(true)} 
          className="bg-premium-gold text-premium-black px-6 py-3 rounded-lg font-bold hover:bg-premium-gold/80 transition-colors"
        >
          AI.KAM - Подобрать маршрут
        </button>

        {open && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-[#0b0b0b] border border-white/20 rounded-xl p-6 w-[520px] max-w-[90vw]">
              <div className="flex justify-between items-center mb-4">
                <b className="text-lg">ai.Kam · подбор маршрута</b>
                <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white text-xl">
                  ✕
                </button>
              </div>
              
              <form onSubmit={onSubmit} className="space-y-3">
                <input 
                  name="dates" 
                  placeholder="Даты" 
                  className="w-full px-4 py-3 rounded-lg bg-white text-black"
                />
                <input 
                  name="guests" 
                  placeholder="Гостей" 
                  type="number" 
                  min={1} 
                  defaultValue={2} 
                  className="w-full px-4 py-3 rounded-lg bg-white text-black"
                />
                <input 
                  name="interests" 
                  placeholder="Интересы (вулканы, рыбалка...)" 
                  className="w-full px-4 py-3 rounded-lg bg-white text-black"
                />
                <input 
                  name="budget" 
                  placeholder="Бюджет (RUB)" 
                  type="number" 
                  className="w-full px-4 py-3 rounded-lg bg-white text-black"
                />
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full bg-premium-gold text-premium-black px-4 py-3 rounded-lg font-bold disabled:opacity-50"
                >
                  {loading ? 'Генерация...' : 'Получить маршрут'}
                </button>
                
                {text && (
                  <div className="whitespace-pre-wrap bg-white/5 p-4 rounded-lg min-h-[80px]">
                    {text}
                  </div>
                )}
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

