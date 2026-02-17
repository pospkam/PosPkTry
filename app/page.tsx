import Image from 'next/image';
import { Search, Home, MapPin, Heart, User, Mountain, Bear, Fish, Wind, Footprints, Helicopter, Waves, Music } from 'lucide-react';

const categories = [
  { icon: Mountain, alt: 'Mountain' },
  { icon: Bear, alt: 'Bear' },
  { icon: Fish, alt: 'Fish' },
  { icon: Wind, alt: 'Wind' },
  { icon: Footprints, alt: 'Footprints' },
  { icon: Helicopter, alt: 'Helicopter' },
  { icon: Waves, alt: 'Waves' },
  { icon: Music, alt: 'Music' },
];

const tours = [
  { image: '/path/to/image1.jpg', name: 'Tour 1', price: 'от 85 000 ₽' },
  { image: '/path/to/image2.jpg', name: 'Tour 2', price: 'от 85 000 ₽' },
  { image: '/path/to/image3.jpg', name: 'Tour 3', price: 'от 85 000 ₽' },
];

export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-r from-[#F0F7FF] to-[#BBDEFB] flex flex-col">
      <header className="flex justify-between items-center p-4">
        <h1 className="text-2xl font-bold">Kamchatour Hub</h1>
        <Image src="/path/to/avatar.jpg" alt="Avatar" width={64} height={64} className="rounded-full" />
      </header>
      <div className="flex justify-center p-4">
        <input type="text" placeholder="Куда едем?" className="flex-1 p-2 border-2 border-gray-300 rounded-l-md" />
        <button className="bg-orange-500 text-white p-2 rounded-r-md">
          <Search />
        </button>
      </div>
      <div className="overflow-x-auto whitespace-nowrap p-4 space-x-4">
        {categories.map((category, index) => (
          <div key={index} className="inline-block w-20 h-20 flex justify-center items-center">
            <category.icon size={70} />
          </div>
        ))}
      </div>
      <div className="overflow-x-auto space-x-4 p-4">
        {tours.map((tour, index) => (
          <div key={index} className="inline-block border rounded-lg shadow-lg p-4 m-2">
            <Image src={tour.image} alt={tour.name} width={300} height={200} className="rounded-lg" loading="lazy" />
            <h2 className="font-bold mt-2">{tour.name}</h2>
            <p className="text-orange-500">{tour.price}</p>
            <div className="flex mt-1">
              {[...Array(5)].map((_, starIndex) => (
                <span key={starIndex} className="text-yellow-500">★</span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <nav className="fixed bottom-0 left-0 right-0 bg-white p-4 flex justify-around">
        <Home />
        <Search />
        <MapPin />
        <Heart />
        <User />
      </nav>
    </div>
  );
}
