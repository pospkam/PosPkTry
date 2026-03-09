"use client";
import useSWR from "swr";
import Image from "next/image";
import Link from "next/link";

interface Tour {
  id: string;
  title: string;
  price: number;
  images: string[];
  location: string;
  rating: number;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function PopularTours() {
  const { data, isLoading, error } = useSWR<Tour[]>("/api/tours/popular?priceMin=true&limit=6", fetcher, { refreshInterval: 600000 });

  if (isLoading) return <div className="text-center text-gray-400 py-8">Загрузка туров…</div>;
  if (error) return <div className="text-center text-red-500 py-8">Ошибка загрузки туров</div>;
  if (!data || data.length === 0) return null;

  return (
    <section aria-label="Популярные туры" className="w-full max-w-5xl mx-auto py-8">
      <h2 className="text-2xl font-bold text-center mb-6 text-white" style={{ fontFamily: 'var(--font-playfair)' }}>
        Популярные туры от {data[0]?.price?.toLocaleString('ru-RU')} ₽
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {data.map((tour) => (
          <Link
            key={tour.id}
            href={`/tours/${tour.id}`}
            className="group bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl overflow-hidden hover:border-premium-gold/50 transition-all duration-300 hover:shadow-xl hover:shadow-premium-gold/10 flex flex-col"
          >
            {/* Изображение */}
            <div className="relative aspect-[4/3] overflow-hidden">
              <Image
                src={tour.images[0] || '/placeholder-tour.jpg'}
                alt={tour.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              {/* Рейтинг */}
              <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
                <span className="text-yellow-400 text-xs">★</span>
                <span className="text-white text-xs font-bold">{tour.rating.toFixed(1)}</span>
              </div>
            </div>

            {/* Контент */}
            <div className="p-4 flex-1 flex flex-col gap-1">
              <h3
                className="font-bold text-base text-white line-clamp-2 group-hover:text-premium-gold transition-colors"
                style={{ fontFamily: 'var(--font-playfair)' }}
              >
                {tour.title}
              </h3>
              <div className="text-xs text-white/60">{tour.location}</div>
              <div className="mt-auto pt-3 border-t border-white/10">
                <span className="text-lg font-black text-premium-gold">
                  от {tour.price.toLocaleString('ru-RU')} ₽
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
