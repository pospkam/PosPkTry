'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Calendar, Users, Phone, Mail, Shield, AlertTriangle, Download, ArrowLeft, Plus, Trash2, CheckCircle, Loader2 } from 'lucide-react';

type Step = 1 | 2 | 3 | 4;

interface GroupMember {
  name: string;
  phone: string;
  birth_year: string;
}

export default function RegisterRoutePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Шаг 1: Маршрут
  const [routeName, setRouteName] = useState('');
  const [routeDescription, setRouteDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [region, setRegion] = useState('Камчатский край');

  // Шаг 2: Группа
  const [groupSize, setGroupSize] = useState(1);
  const [members, setMembers] = useState<GroupMember[]>([{ name: '', phone: '', birth_year: '' }]);

  // Шаг 3: Руководитель + экстренный контакт
  const [leaderName, setLeaderName] = useState('');
  const [leaderPhone, setLeaderPhone] = useState('');
  const [leaderEmail, setLeaderEmail] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');
  const [emergencyTelegram, setEmergencyTelegram] = useState('');
  const [emergencyEmail, setEmergencyEmail] = useState('');
  const [contactConsent, setContactConsent] = useState(false);

  // Шаг 4: Disclaimer
  const [accepted, setAccepted] = useState(false);

  const canNext1 = routeName.trim() && startDate && endDate && new Date(endDate) >= new Date(startDate);
  const canNext2 = groupSize >= 1 && groupSize <= 30;
  const canNext3 = leaderName.trim() && leaderPhone.trim() && emergencyName.trim() && emergencyPhone.trim();
  const canSubmit = canNext1 && canNext2 && canNext3 && accepted && contactConsent;

  const addMember = () => {
    if (members.length < groupSize) {
      setMembers([...members, { name: '', phone: '', birth_year: '' }]);
    }
  };

  const removeMember = (idx: number) => {
    setMembers(members.filter((_, i) => i !== idx));
  };

  const updateMember = (idx: number, field: keyof GroupMember, value: string) => {
    const updated = [...members];
    updated[idx] = { ...updated[idx], [field]: value };
    setMembers(updated);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        route_name: routeName.trim(),
        route_description: routeDescription.trim() || undefined,
        start_date: startDate,
        end_date: endDate,
        region,
        group_size: groupSize,
        group_members: members.filter(m => m.name.trim()).map(m => ({
          name: m.name.trim(),
          phone: m.phone.trim() || undefined,
          birth_year: m.birth_year ? parseInt(m.birth_year) : undefined,
        })),
        leader_name: leaderName.trim(),
        leader_phone: leaderPhone.trim(),
        leader_email: leaderEmail.trim() || undefined,
        emergency_contact_name: emergencyName.trim(),
        emergency_contact_phone: emergencyPhone.trim(),
        emergency_contact_relation: emergencyRelation.trim() || undefined,
        emergency_contact_telegram_chat_id: emergencyTelegram.trim() || undefined,
        emergency_contact_email: emergencyEmail.trim() || undefined,
        emergency_contact_consent: contactConsent,
        accepted_disclaimer: true as const,
      };

      // Сначала сохраняем
      const res = await fetch('/api/safety/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || 'Ошибка сохранения');
        setSubmitting(false);
        return;
      }

      setRegistrationId(json.registration_id);

      // Теперь скачиваем PDF
      const pdfRes = await fetch('/api/safety/register?pdf=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (pdfRes.ok) {
        const blob = await pdfRes.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tourhab-registration-${json.registration_id.slice(0, 8)}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }

      setSubmitted(true);
    } catch {
      setError('Ошибка сети. Проверьте подключение.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-[100dvh] bg-[#0a0a0a] text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Маршрут зарегистрирован</h1>
          <p className="text-white/60 mb-6 text-sm">
            PDF-заявка скачана. Подайте её в МЧС одним из способов:
          </p>

          <div className="space-y-3 mb-6 text-left">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="font-semibold text-sm mb-1">📱 Через Госуслуги</p>
              <p className="text-xs text-white/50">Подайте электронное заявление на gosuslugi.ru</p>
              <a href="https://www.gosuslugi.ru" target="_blank" rel="noopener noreferrer"
                 className="text-[var(--accent)] text-xs font-medium mt-2 inline-block hover:underline">
                Открыть Госуслуги →
              </a>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="font-semibold text-sm mb-1">📞 По телефону МЧС</p>
              <p className="text-xs text-white/50">+7 (4152) 23-53-62 — Главное управление МЧС по Камчатскому краю</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="font-semibold text-sm mb-1">🏢 Лично</p>
              <p className="text-xs text-white/50">г. Петропавловск-Камчатский, ул. Ленинская, 28</p>
            </div>
          </div>

          <button
            onClick={() => router.push('/map')}
            className="w-full py-3 rounded-xl bg-[var(--accent)] text-white font-semibold text-sm hover:opacity-90"
          >
            Вернуться к карте
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0a] text-white">
      {/* Шапка */}
      <div className="sticky top-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => step > 1 ? setStep((step - 1) as Step) : router.back()}
                  className="p-1 rounded-lg hover:bg-white/10">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-sm">Регистрация маршрута</h1>
            <p className="text-[10px] text-white/40">Шаг {step} из 4</p>
          </div>
          {/* Прогресс */}
          <div className="flex gap-1">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className={`w-6 h-1 rounded-full transition-colors ${
                s <= step ? 'bg-[var(--accent)]' : 'bg-white/10'
              }`} />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Шаг 1: Маршрут */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[var(--accent)]" />
              Маршрут
            </h2>

            <div>
              <label className="text-xs text-white/40 mb-1 block">Название маршрута *</label>
              <input
                type="text"
                value={routeName}
                onChange={e => setRouteName(e.target.value)}
                placeholder="Авачинский перевал"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm
                  focus:border-[var(--accent)] focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="text-xs text-white/40 mb-1 block">Описание (необязательно)</label>
              <textarea
                value={routeDescription}
                onChange={e => setRouteDescription(e.target.value)}
                placeholder="Пиначево → Таловский кордон → Авачинский перевал"
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm
                  focus:border-[var(--accent)] focus:outline-none transition-colors resize-none"
              />
            </div>

            <div>
              <label className="text-xs text-white/40 mb-1 block">Регион</label>
              <input
                type="text"
                value={region}
                onChange={e => setRegion(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm
                  focus:border-[var(--accent)] focus:outline-none transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/40 mb-1 block">Дата выхода *</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm
                    focus:border-[var(--accent)] focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Дата возврата *</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  min={startDate}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm
                    focus:border-[var(--accent)] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!canNext1}
              className="w-full py-3 rounded-xl bg-[var(--accent)] text-white font-semibold text-sm
                disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              Далее
            </button>
          </div>
        )}

        {/* Шаг 2: Группа */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-[var(--accent)]" />
              Группа
            </h2>

            <div>
              <label className="text-xs text-white/40 mb-1 block">Количество человек (1-30) *</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const newSize = Math.max(1, groupSize - 1);
                    setGroupSize(newSize);
                    if (members.length > newSize) setMembers(members.slice(0, newSize));
                  }}
                  className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 text-xl font-bold
                    hover:bg-white/10 transition-colors"
                >
                  −
                </button>
                <span className="text-3xl font-bold flex-1 text-center">{groupSize}</span>
                <button
                  onClick={() => {
                    const newSize = Math.min(30, groupSize + 1);
                    setGroupSize(newSize);
                    if (members.length < newSize) addMember();
                  }}
                  className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 text-xl font-bold
                    hover:bg-white/10 transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Участники */}
            <p className="text-xs text-white/30">Участники (необязательно, но полезно для МЧС)</p>
            {members.map((m, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/30 w-5">#{idx + 1}</span>
                  {members.length > 1 && (
                    <button onClick={() => removeMember(idx)} className="ml-auto p-1 text-white/30 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={m.name}
                  onChange={e => updateMember(idx, 'name', e.target.value)}
                  placeholder="ФИО"
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm
                    focus:border-[var(--accent)] focus:outline-none"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="tel"
                    value={m.phone}
                    onChange={e => updateMember(idx, 'phone', e.target.value)}
                    placeholder="Телефон"
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm
                      focus:border-[var(--accent)] focus:outline-none"
                  />
                  <input
                    type="number"
                    value={m.birth_year}
                    onChange={e => updateMember(idx, 'birth_year', e.target.value)}
                    placeholder="Год рождения"
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm
                      focus:border-[var(--accent)] focus:outline-none"
                  />
                </div>
              </div>
            ))}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-semibold text-sm
                  hover:bg-white/10 transition-colors"
              >
                Назад
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-[2] py-3 rounded-xl bg-[var(--accent)] text-white font-semibold text-sm
                  hover:opacity-90 transition-opacity"
              >
                Далее
              </button>
            </div>
          </div>
        )}

        {/* Шаг 3: Руководитель + экстренный контакт */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Phone className="w-5 h-5 text-[var(--accent)]" />
              Контакты
            </h2>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
              <p className="text-xs text-[var(--accent)] font-semibold uppercase tracking-wider">Руководитель группы</p>
              <input
                type="text"
                value={leaderName}
                onChange={e => setLeaderName(e.target.value)}
                placeholder="ФИО *"
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm
                  focus:border-[var(--accent)] focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="tel"
                  value={leaderPhone}
                  onChange={e => setLeaderPhone(e.target.value)}
                  placeholder="Телефон *"
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm
                    focus:border-[var(--accent)] focus:outline-none"
                />
                <input
                  type="email"
                  value={leaderEmail}
                  onChange={e => setLeaderEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm
                    focus:border-[var(--accent)] focus:outline-none"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
              <p className="text-xs text-red-400 font-semibold uppercase tracking-wider">
                Экстренный контакт <span className="text-white/30">(получит уведомление если не вернулись)</span>
              </p>
              <input
                type="text"
                value={emergencyName}
                onChange={e => setEmergencyName(e.target.value)}
                placeholder="ФИО *"
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm
                  focus:border-[var(--accent)] focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="tel"
                  value={emergencyPhone}
                  onChange={e => setEmergencyPhone(e.target.value)}
                  placeholder="Телефон *"
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm
                    focus:border-[var(--accent)] focus:outline-none"
                />
                <input
                  type="text"
                  value={emergencyRelation}
                  onChange={e => setEmergencyRelation(e.target.value)}
                  placeholder="Кем приходится"
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm
                    focus:border-[var(--accent)] focus:outline-none"
                />
              </div>
              <input
                type="text"
                value={emergencyTelegram}
                onChange={e => setEmergencyTelegram(e.target.value)}
                placeholder="Telegram chat_id (необязательно)"
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm
                  focus:border-[var(--accent)] focus:outline-none"
              />
              <p className="text-[10px] text-white/30">Для Telegram-уведомлений. Можно узнать через @userinfobot</p>
              <input
                type="email"
                value={emergencyEmail}
                onChange={e => setEmergencyEmail(e.target.value)}
                placeholder="Email (необязательно)"
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm
                  focus:border-[var(--accent)] focus:outline-none"
              />
              <label className="flex items-start gap-3 cursor-pointer mt-2">
                <input
                  type="checkbox"
                  checked={contactConsent}
                  onChange={e => setContactConsent(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded accent-[var(--accent)]"
                />
                <span className="text-xs text-white/60">
                  Контакт <strong>{emergencyName || '___'}</strong> согласен получать уведомления
                  от TourHab о статусе маршрута (Telegram / Email).
                </span>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-semibold text-sm
                  hover:bg-white/10 transition-colors"
              >
                Назад
              </button>
              <button
                onClick={() => setStep(4)}
                disabled={!canNext3}
                className="flex-[2] py-3 rounded-xl bg-[var(--accent)] text-white font-semibold text-sm
                  disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                Далее
              </button>
            </div>
          </div>
        )}

        {/* Шаг 4: Disclaimer + отправка */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Shield className="w-5 h-5 text-[var(--accent)]" />
              Подтверждение
            </h2>

            {/* Сводка */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2 text-sm">
              <p><span className="text-white/40">Маршрут:</span> {routeName}</p>
              <p><span className="text-white/40">Даты:</span> {startDate} — {endDate}</p>
              <p><span className="text-white/40">Группа:</span> {groupSize} чел.</p>
              <p><span className="text-white/40">Руководитель:</span> {leaderName}</p>
              <p><span className="text-white/40">Экстренный контакт:</span> {emergencyName} ({emergencyPhone})</p>
            </div>

            {/* Disclaimer */}
            <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-yellow-400 mb-1">Важно</p>
                  <p className="text-xs text-white/60 leading-relaxed">
                    TourHub помогает <strong>подготовить заявку</strong> по форме МЧС.
                    Данная заявка <strong>не является подтверждением</strong> регистрации в МЧС.
                    Для официальной регистрации подайте заявление через портал Госуслуг
                    или лично в Главное управление МЧС России по Камчатскому краю.
                  </p>
                  <p className="text-xs text-white/40 mt-2">
                    TourHab не гарантирует получение уведомления экстренным контактом
                    и не несёт ответственности за реакцию третьих лиц.
                  </p>
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={e => setAccepted(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded accent-[var(--accent)]"
                />
                <span className="text-xs text-white/60">
                  Я понимаю что это <strong>не официальная регистрация</strong> и
                 TourHab <strong>не является службой спасения</strong>.
                  Я самостоятельно подам заявку в МЧС.
                </span>
              </label>
            </div>

            {error && (
              <p className="text-sm text-red-400 text-center">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-semibold text-sm
                  hover:bg-white/10 transition-colors"
              >
                Назад
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                className="flex-[2] py-3 rounded-xl bg-[var(--accent)] text-white font-semibold text-sm
                  disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity
                  flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Сохраняю...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Создать и скачать PDF
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        <div className="h-8" />
      </div>
    </div>
  );
}
// rebuild trigger Mon Apr 27 22:22:34 UTC 2026
