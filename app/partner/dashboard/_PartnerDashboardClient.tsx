'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mountain, Bus, Building2, Backpack, Loader2, ClipboardList, Lightbulb, Clock } from 'lucide-react';

interface Partner {
  id: string;
  name: string;
  category: string;
  email: string;
  phone: string;
  description: string;
  isVerified: boolean;
  createdAt: string;
}

const ROLE_INFO = {
  operator: { name: 'Туры', color: 'blue', Icon: Mountain },
  transfer: { name: 'Трансфер', color: 'green', Icon: Bus },
  stay: { name: 'Размещение', color: 'purple', Icon: Building2 },
  gear: { name: 'Аренда снаряжения', color: 'orange', Icon: Backpack },
};

export default function PartnerDashboardClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    // В реальном проекте здесь будет проверка сессии и загрузка данных партнера
    // Для демо берем последнего зарегистрированного
    loadPartnerData();
  }, []);

  const loadPartnerData = async () => {
    try {
      // Временно: загружаем всех партнеров с email "info@kamchatka-fishing.ru"
      // В production здесь будет API endpoint с авторизацией
      setCompanyName('Камчатская рыбалка');
      
      // Для демо показываем 4 роли
      setPartners([
        {
          id: 'e570f6c0-81e6-4ea0-9796-af9015a593e6',
          name: 'Камчатская рыбалка',
          category: 'operator',
          email: 'info@kamchatka-fishing.ru',
          phone: '+7 (4152) 123-456',
          description: 'Рыболовные туры на Камчатке',
          isVerified: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'c34efe30-34dd-4a1a-b78c-94d328d85f2c',
          name: 'Камчатская рыбалка',
          category: 'transfer',
          email: 'info@kamchatka-fishing.ru',
          phone: '+7 (4152) 123-456',
          description: 'Доставка к местам рыбалки',
          isVerified: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: '877c6f39-2f4a-469c-8551-8fce54bc7220',
          name: 'Камчатская рыбалка',
          category: 'stay',
          email: 'info@kamchatka-fishing.ru',
          phone: '+7 (4152) 123-456',
          description: 'Базы и домики для проживания',
          isVerified: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: '9889e86e-a010-4ccb-a0a8-2e4229b7767f',
          name: 'Камчатская рыбалка',
          category: 'gear',
          email: 'info@kamchatka-fishing.ru',
          phone: '+7 (4152) 123-456',
          description: 'Аренда снаряжения',
          isVerified: false,
          createdAt: new Date().toISOString(),
        },
      ]);
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading partner data:', error);
      setLoading(false);
    }
  };

  const getOperatorId = () => {
    return partners.find(p => p.category === 'operator')?.id || '';
  };

  const getStayId = () => {
    return partners.find(p => p.category === 'stay')?.id || '';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-white text-xl flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          Загрузка...
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-transparent text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                {companyName}
              </h1>
              <p className="text-white/70">Личный кабинет партнера</p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-white/15 border border-white/15 rounded-xl hover:bg-white/10 transition-colors"
            >
              ← На главную
            </button>
          </div>

          {/* Verification Status */}
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8" />
              <div>
                <div className="font-bold text-yellow-400">Ожидает верификации</div>
                <div className="text-sm text-white/70">
                  Ваша заявка на рассмотрении. После одобрения администратором вы сможете публиковать контент.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          {partners.map((partner) => {
            const info = ROLE_INFO[partner.category as keyof typeof ROLE_INFO];
            return (
              <div key={partner.id} className="bg-white/15 border border-white/15 rounded-xl p-6">
                <div className="text-3xl mb-2">{React.createElement(info.Icon, { className: 'w-8 h-8' })}</div>
                <div className="text-sm text-white/70 mb-1">{info.name}</div>
                <div className="text-2xl font-bold">0</div>
                <div className="text-xs text-white/50">Опубликовано</div>
              </div>
            );
          })}
        </div>

        {/* Main Content - Roles Sections */}
        <div className="space-y-6">
          {/* ТУРЫ */}
          {partners.find(p => p.category === 'operator') && (
            <div className="bg-white/15 border border-white/15 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Mountain className="w-8 h-8 text-white/70" />
                  <div>
                    <h2 className="text-2xl font-bold">Туры</h2>
                    <p className="text-sm text-white/70">Рыболовные туры и экскурсии</p>
                  </div>
                </div>
                <button
                  onClick={() => router.push('/partner/tours/add')}
                  className="px-6 py-3 bg-premium-gold text-premium-black font-bold rounded-xl hover:bg-premium-gold/90 transition-colors"
                >
                  + Добавить тур
                </button>
              </div>

              <div className="text-center py-12 text-white/50">
                <div className="text-4xl mb-2"><ClipboardList className="w-10 h-10 mx-auto text-white/50" /></div>
                <p>Туров пока нет. Добавьте первый тур!</p>
              </div>
            </div>
          )}

          {/* ТРАНСФЕР */}
          {partners.find(p => p.category === 'transfer') && (
            <div className="bg-white/15 border border-white/15 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Bus className="w-8 h-8 text-white/70" />
                  <div>
                    <h2 className="text-2xl font-bold">Трансфер</h2>
                    <p className="text-sm text-white/70">Транспортные услуги</p>
                  </div>
                </div>
                <button
                  onClick={() => alert('Форма добавления трансфера в разработке')}
                  className="px-6 py-3 bg-premium-gold text-premium-black font-bold rounded-xl hover:bg-premium-gold/90 transition-colors"
                >
                  + Добавить маршрут
                </button>
              </div>

              <div className="text-center py-12 text-white/50">
                <div className="text-4xl mb-2"><ClipboardList className="w-10 h-10 mx-auto text-white/50" /></div>
                <p>Маршрутов пока нет</p>
              </div>
            </div>
          )}

          {/* РАЗМЕЩЕНИЕ */}
          {partners.find(p => p.category === 'stay') && (
            <div className="bg-white/15 border border-white/15 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Building2 className="w-8 h-8 text-white/70" />
                  <div>
                    <h2 className="text-2xl font-bold">Размещение</h2>
                    <p className="text-sm text-white/70">Базы, домики, гостиницы</p>
                  </div>
                </div>
                <button
                  onClick={() => router.push(`/partner/accommodation/add?partnerId=${getStayId()}`)}
                  className="px-6 py-3 bg-premium-gold text-premium-black font-bold rounded-xl hover:bg-premium-gold/90 transition-colors"
                >
                  + Добавить объект
                </button>
              </div>

              <div className="text-center py-12 text-white/50">
                <div className="text-4xl mb-2"><ClipboardList className="w-10 h-10 mx-auto text-white/50" /></div>
                <p>Объектов размещения пока нет</p>
              </div>
            </div>
          )}

          {/* СНАРЯЖЕНИЕ */}
          {partners.find(p => p.category === 'gear') && (
            <div className="bg-white/15 border border-white/15 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Backpack className="w-8 h-8 text-white/70" />
                  <div>
                    <h2 className="text-2xl font-bold">Аренда снаряжения</h2>
                    <p className="text-sm text-white/70">Удочки, лодки, экипировка</p>
                  </div>
                </div>
                <button
                  onClick={() => alert('Форма добавления снаряжения в разработке')}
                  className="px-6 py-3 bg-premium-gold text-premium-black font-bold rounded-xl hover:bg-premium-gold/90 transition-colors"
                >
                  + Добавить снаряжение
                </button>
              </div>

              <div className="text-center py-12 text-white/50">
                <div className="text-4xl mb-2"><ClipboardList className="w-10 h-10 mx-auto text-white/50" /></div>
                <p>Снаряжения пока нет</p>
              </div>
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="mt-8 p-6 bg-blue-500/10 border border-blue-500/30 rounded-xl">
          <div className="flex items-start gap-4">
            <Lightbulb className="w-8 h-8 text-blue-400 shrink-0" />
            <div>
              <h3 className="font-bold text-blue-400 mb-2">Следующие шаги:</h3>
              <ul className="space-y-1 text-sm text-white/70">
                <li>1. Дождитесь одобрения заявки администратором</li>
                <li>2. После одобрения добавьте свои туры, объекты размещения и снаряжение</li>
                <li>3. Загрузите фотографии и подробные описания</li>
                <li>4. Ваши предложения появятся на главной странице и в поиске</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
