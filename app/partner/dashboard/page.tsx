'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import WeatherBackground from '@/components/WeatherBackground';

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
  operator: { 
    name: 'Туры', 
    color: 'from-blue-500 to-cyan-500',
    icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7'
  },
  transfer: { 
    name: 'Трансфер', 
    color: 'from-green-500 to-emerald-500',
    icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4'
  },
  stay: { 
    name: 'Размещение', 
    color: 'from-purple-500 to-pink-500',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
  },
  gear: { 
    name: 'Аренда снаряжения', 
    color: 'from-orange-500 to-red-500',
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
  },
};

export default function PartnerDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    loadPartnerData();
  }, []);

  const loadPartnerData = async () => {
    try {
      setCompanyName('Камчатская рыбалка');
      
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
      <div className="min-h-screen flex items-center justify-center">
        <WeatherBackground />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
          <div className="text-white text-xl font-medium">Загрузка...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <WeatherBackground />
      
      <main className="relative z-10 min-h-screen p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2 bg-gradient-to-r from-white to-white/80 bg-clip-text">
                  {companyName}
                </h1>
                <p className="text-white/70 text-sm sm:text-base">Личный кабинет партнера</p>
              </div>
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl hover:bg-white/20 transition-all text-white font-medium"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="hidden sm:inline">На главную</span>
              </button>
            </div>

            {/* Verification Status */}
            <div className="p-4 sm:p-6 bg-yellow-500/10 backdrop-blur-xl border border-yellow-500/30 rounded-2xl">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-bold text-yellow-400 text-base sm:text-lg mb-1">Ожидает верификации</div>
                  <div className="text-sm text-white/70">
                    Ваша заявка на рассмотрении. После одобрения администратором вы сможете публиковать контент.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            {partners.map((partner) => {
              const info = ROLE_INFO[partner.category as keyof typeof ROLE_INFO];
              return (
                <div 
                  key={partner.id} 
                  className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 sm:p-6 hover:bg-white/15 transition-all group"
                >
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${info.color} flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform`}>
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={info.icon} />
                    </svg>
                  </div>
                  <div className="text-xs sm:text-sm text-white/70 mb-1">{info.name}</div>
                  <div className="text-2xl sm:text-3xl font-bold text-white">0</div>
                  <div className="text-xs text-white/50 mt-1">Опубликовано</div>
                </div>
              );
            })}
          </div>

          {/* Main Content - Roles Sections */}
          <div className="space-y-4 sm:space-y-6">
            {/* ТУРЫ */}
            {partners.find(p => p.category === 'operator') && (
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-white">Туры</h2>
                      <p className="text-xs sm:text-sm text-white/70">Рыболовные туры и экскурсии</p>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push('/partner/tours/add')}
                    className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-xl hover:shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Добавить тур
                  </button>
                </div>

                <div className="text-center py-12 text-white/50">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
                    <svg className="w-8 h-8 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-sm sm:text-base">Туров пока нет. Добавьте первый тур!</p>
                </div>
              </div>
            )}

            {/* ТРАНСФЕР */}
            {partners.find(p => p.category === 'transfer') && (
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-white">Трансфер</h2>
                      <p className="text-xs sm:text-sm text-white/70">Транспортные услуги</p>
                    </div>
                  </div>
                  <button
                    onClick={() => alert('Форма добавления трансфера в разработке')}
                    className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-xl hover:shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Добавить маршрут
                  </button>
                </div>

                <div className="text-center py-12 text-white/50">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
                    <svg className="w-8 h-8 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-sm sm:text-base">Маршрутов пока нет</p>
                </div>
              </div>
            )}

            {/* РАЗМЕЩЕНИЕ */}
            {partners.find(p => p.category === 'stay') && (
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-white">Размещение</h2>
                      <p className="text-xs sm:text-sm text-white/70">Базы, домики, гостиницы</p>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(`/partner/accommodation/add?partnerId=${getStayId()}`)}
                    className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Добавить объект
                  </button>
                </div>

                <div className="text-center py-12 text-white/50">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
                    <svg className="w-8 h-8 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-sm sm:text-base">Объектов размещения пока нет</p>
                </div>
              </div>
            )}

            {/* СНАРЯЖЕНИЕ */}
            {partners.find(p => p.category === 'gear') && (
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-white">Аренда снаряжения</h2>
                      <p className="text-xs sm:text-sm text-white/70">Удочки, лодки, экипировка</p>
                    </div>
                  </div>
                  <button
                    onClick={() => alert('Форма добавления снаряжения в разработке')}
                    className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl hover:shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Добавить снаряжение
                  </button>
                </div>

                <div className="text-center py-12 text-white/50">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
                    <svg className="w-8 h-8 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-sm sm:text-base">Снаряжения пока нет</p>
                </div>
              </div>
            )}
          </div>

          {/* Help Section */}
          <div className="mt-6 sm:mt-8 p-4 sm:p-6 bg-blue-500/10 backdrop-blur-xl border border-blue-500/30 rounded-2xl">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-blue-400 text-base sm:text-lg mb-3">Следующие шаги:</h3>
                <ul className="space-y-2 text-xs sm:text-sm text-white/70">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">1.</span>
                    <span>Дождитесь одобрения заявки администратором</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">2.</span>
                    <span>После одобрения добавьте свои туры, объекты размещения и снаряжение</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">3.</span>
                    <span>Загрузите фотографии и подробные описания</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">4.</span>
                    <span>Ваши предложения появятся на главной странице и в поиске</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
