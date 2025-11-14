'use client';

import Link from 'next/link';

// Простые SVG иконки вместо lucide-react
const User = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
);
const Briefcase = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
);
const ArrowRight = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
);
const Sparkles = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M9.5 2l1.5 5.5L16 9l-5 1.5L9.5 16 8 10.5 3 9l5.5-1.5L9.5 2zm5 8l1 3.5 3.5 1-3.5 1-1 3.5-1-3.5-3.5-1 3.5-1 1-3.5z" /></svg>
);

export default function RegistrationButtons() {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-12">
      <h2 className="text-center text-4xl font-bold text-white mb-12 text-shadow-soft">
        Начните свое путешествие
      </h2>

      <div className="grid md:grid-cols-2 gap-8">
        {/* ТУРИСТ - Голубая кнопка */}
        <Link
          href="/auth/register?type=tourist"
          className="group relative overflow-hidden rounded-3xl transition-all duration-500 hover:scale-105 hover:shadow-2xl"
        >
          {/* Анимированный фон */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-cyan-400 to-blue-500 opacity-90 group-hover:opacity-100 transition-opacity" />
          
          {/* Светящийся эффект */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

          {/* Контент */}
          <div className="relative p-12 flex flex-col items-center text-center space-y-6">
            {/* Иконка */}
            <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500 border-4 border-white/30">
              <User className="w-12 h-12 text-white" />
            </div>

            {/* Заголовок */}
            <div className="space-y-2">
              <h3 className="text-3xl font-bold text-white">
                Я Турист
              </h3>
              <p className="text-white/90 text-lg">
                Хочу путешествовать по Камчатке
              </p>
            </div>

            {/* Преимущества */}
            <ul className="text-white/80 text-left space-y-2 w-full">
              <li className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-300" />
                Умный поиск туров
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-300" />
                AI-помощник
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-300" />
                Онлайн бронирование
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-300" />
                Система лояльности
              </li>
            </ul>

            {/* Кнопка */}
            <div className="flex items-center gap-2 bg-white text-blue-500 px-8 py-4 rounded-full font-bold text-lg group-hover:gap-4 transition-all">
              Зарегистрироваться
              <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </div>
          </div>

          {/* Декоративные элементы */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
        </Link>

        {/* БИЗНЕС - Золотая кнопка */}
        <Link
          href="/auth/register?type=business"
          className="group relative overflow-hidden rounded-3xl transition-all duration-500 hover:scale-105 hover:shadow-2xl"
        >
          {/* Анимированный фон */}
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500 via-amber-500 to-orange-500 opacity-90 group-hover:opacity-100 transition-opacity" />
          
          {/* Светящийся эффект */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

          {/* Контент */}
          <div className="relative p-12 flex flex-col items-center text-center space-y-6">
            {/* Иконка */}
            <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500 border-4 border-white/30">
              <Briefcase className="w-12 h-12 text-white" />
            </div>

            {/* Заголовок */}
            <div className="space-y-2">
              <h3 className="text-3xl font-bold text-white">
                Я Бизнес
              </h3>
              <p className="text-white/90 text-lg">
                Предоставляю туристические услуги
              </p>
            </div>

            {/* Преимущества */}
            <ul className="text-white/80 text-left space-y-2 w-full">
              <li className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-300" />
                Автоматизация бронирований
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-300" />
                CRM и аналитика
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-300" />
                Финансовый контроль
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-300" />
                Управление командой
              </li>
            </ul>

            {/* Кнопка */}
            <div className="flex items-center gap-2 bg-white text-amber-600 px-8 py-4 rounded-full font-bold text-lg group-hover:gap-4 transition-all">
              Зарегистрироваться
              <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </div>
          </div>

          {/* Декоративные элементы */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
        </Link>
      </div>

      {/* Дополнительная информация */}
      <div className="mt-8 text-center">
        <p className="text-white/70 text-sm">
          Уже есть аккаунт?{' '}
          <Link href="/auth/login" className="text-white hover:underline font-bold">
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}
