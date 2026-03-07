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
      <h2 className="text-2xl font-bold text-center mb-6 text-white" style={{fontFamily:'var(--font-playfair)'}}>Популярные туры от {data[0]?.price?.toLocaleString('ru-RU')} ₽</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {data.map((tour) => (
          <Link key={tour.id} href={`/tours/${tour.id}`} className="group bg-white/10 border border-white/20 rounded-2xl overflow-hidden shadow-lg hover:-translate-y-2 hover:shadow-2xl transition-transform duration-300 flex flex-col">
            <div className="relative w-full h-48">
              <Image src={tour.images[0] || '/placeholder-tour.jpg'} alt={tour.title} fill className="object-cover rounded-t-2xl" sizes="(max-width: 768px) 100vw, 33vw" priority />
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <h3 className="font-bold text-lg text-white mb-1" style={{fontFamily:'var(--font-playfair)'}}>{tour.title}</h3>
              <div className="text-sm text-white/70 mb-2">{tour.location}</div>
              <div className="flex items-center gap-2 mt-auto">
                <span className="text-yellow-400 font-bold">{'★'.repeat(Math.round(tour.rating))}</span>
                <span className="ml-auto text-moss font-bold">от {tour.price.toLocaleString('ru-RU')} ₽</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
