import Link from 'next/link';

export default function TourNotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <div className="text-center max-w-md">
        <p className="text-6xl font-bold mb-4" style={{ color: 'var(--text-muted)' }}>404</p>
        <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          Тур не найден
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
          Этот тур больше не доступен или был удалён оператором.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/marketplace" className="ds-btn ds-btn-primary">
            Все туры
          </Link>
          <Link href="/" className="ds-btn ds-btn-secondary">
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}
