"use client";
import useSWR from "swr";
import Image from "next/image";

interface Review {
  id: string;
  rating: number;
  text: string;
  tourist: { name: string; avatarUrl?: string };
  photos?: string[];
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function FeaturedReviews() {
  const { data, isLoading, error } = useSWR<Review[]>("/api/reviews?top=4", fetcher, { refreshInterval: 600000 });

  if (isLoading) return <div className="text-center text-[var(--text-muted)] py-8">Загрузка отзывов…</div>;
  if (error) return <div className="text-center text-red-500 py-8">Ошибка загрузки отзывов</div>;
  if (!data || data.length === 0) return null;

  return (
    <section aria-label="Отзывы туристов" className="w-full max-w-2xl mx-auto py-8">
      <h2 className="text-2xl font-bold text-center mb-6 text-[var(--text-primary)]" style={{fontFamily:'var(--font-playfair)'}}>Отзывы путешественников</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data.map((review) => (
          <div key={review.id} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5 flex flex-col gap-3">
            <div className="flex items-center gap-3 mb-2">
              {review.tourist.avatarUrl ? (
                <Image src={review.tourist.avatarUrl} alt={review.tourist.name} width={40} height={40} className="rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[var(--bg-hover)] flex items-center justify-center text-[var(--text-primary)] font-bold">{review.tourist.name[0]}</div>
              )}
              <span className="font-semibold text-[var(--text-primary)]">{review.tourist.name}</span>
              <span className="ml-auto text-yellow-400 font-bold">{'★'.repeat(review.rating)}</span>
            </div>
            <div className="text-[var(--text-secondary)] text-base mb-2">{review.text}</div>
            {review.photos && review.photos.length > 0 && (
              <div className="flex gap-2 mt-2">
                {review.photos.slice(0,2).map((url, i) => (
                  <Image key={url} src={url} alt="Фото отзыва" width={80} height={80} className="rounded-lg object-cover" />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
