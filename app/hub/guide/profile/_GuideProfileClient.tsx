'use client';

import { useEffect, useState } from 'react';
import { Protected } from '@/components/Protected';
import { User, Save, Loader2, Languages, Award, Mountain } from 'lucide-react';

interface ProfileForm {
  name: string;
  bio: string;
  specializations: string;
  languages: string;
  phone: string;
  email: string;
}

export default function GuideProfileClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProfileForm>({
    name: '', bio: '', specializations: '', languages: '', phone: '', email: '',
  });

  useEffect(() => {
    // Загрузка профиля гида
    setTimeout(() => {
      setForm({
        name: 'Иван Петров',
        bio: 'Сертифицированный горный гид с 10-летним опытом на Камчатке',
        specializations: 'Вулканы, Треккинг, Рыбалка',
        languages: 'Русский, English',
        phone: '+7 914-000-00-00',
        email: 'guide@example.com',
      });
      setLoading(false);
    }, 500);
  }, []);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => setSaving(false), 1000);
  }

  const inputCls = 'w-full min-h-[44px] px-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]';

  return (
    <Protected roles={['guide', 'admin']}>
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <User className="w-6 h-6 text-[var(--accent)]" />
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Профиль гида</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" /></div>
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
              <label className="block">
                <span className="text-sm text-[var(--text-secondary)] flex items-center gap-1.5 mb-1.5"><User className="w-4 h-4" /> ФИО</span>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputCls} />
              </label>
              <label className="block">
                <span className="text-sm text-[var(--text-secondary)] flex items-center gap-1.5 mb-1.5"><Mountain className="w-4 h-4" /> О себе</span>
                <textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} className={`${inputCls} min-h-[80px]`} />
              </label>
              <label className="block">
                <span className="text-sm text-[var(--text-secondary)] flex items-center gap-1.5 mb-1.5"><Award className="w-4 h-4" /> Специализации</span>
                <input value={form.specializations} onChange={e => setForm(p => ({ ...p, specializations: e.target.value }))} className={inputCls} placeholder="Вулканы, Треккинг, Рыбалка" />
              </label>
              <label className="block">
                <span className="text-sm text-[var(--text-secondary)] flex items-center gap-1.5 mb-1.5"><Languages className="w-4 h-4" /> Языки</span>
                <input value={form.languages} onChange={e => setForm(p => ({ ...p, languages: e.target.value }))} className={inputCls} placeholder="Русский, English" />
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm text-[var(--text-secondary)] mb-1.5 block">Телефон</span>
                  <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className={inputCls} />
                </label>
                <label className="block">
                  <span className="text-sm text-[var(--text-secondary)] mb-1.5 block">Email</span>
                  <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className={inputCls} />
                </label>
              </div>
            </div>

            <button type="submit" disabled={saving} className="min-h-[44px] px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl font-medium inline-flex items-center gap-2 disabled:opacity-50 transition-colors">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Сохранить
            </button>
          </form>
        )}
      </div>
    </Protected>
  );
}
