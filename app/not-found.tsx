import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-4">404</h1>
        <h2 className="text-2xl font-bold text-white mb-4">Страница не найдена</h2>
        <p className="text-white/70 mb-8">Извините, запрашиваемая страница не существует.</p>
        <Link 
          href="/" 
          className="px-6 py-3 bg-premium-gold text-premium-black font-bold rounded-xl hover:bg-premium-gold/90 transition-colors"
        >
          Вернуться на главную
        </Link>
      </div>
    </div>
  );
}