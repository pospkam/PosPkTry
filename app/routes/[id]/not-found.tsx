import Link from 'next/link';

export default function RouteNotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <div className="text-center max-w-md">
        <p className="text-6xl font-bold mb-4" style={{ color: 'var(--text-muted)' }}>404</p>
        <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          Маршрут не найден
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
          Этот маршрут не существует или был удалён.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/routes" className="ds-btn ds-btn-primary">
            Все маршруты
          </Link>
          <Link href="/" className="ds-btn ds-btn-secondary">
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}
