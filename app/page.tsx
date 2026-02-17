import React from 'react';
import Image from 'next/image';
import { 
  Mountain, Bear, Fish, Wind, Footprints, Helicopter, Waves, Music,
  Home, Search, MapPin, Heart, User 
} from 'lucide-react';

const categories = [
  <Mountain key="mountain"/>, <Bear key="bear"/>, <Fish key="fish"/>, 
  <Wind key="wind"/>, <Footprints key="footprints"/>, <Helicopter key="helicopter"/>, 
  <Waves key="waves"/>, <Music key="music"/>
];

const popularTours = [
  { title: "Tour 1", image: "/images/tour1.jpg", price: "от 5000 ₽", rating: 4.5 },
  { title: "Tour 2", image: "/images/tour2.jpg", price: "от 6000 ₽", rating: 4.7 },
  { title: "Tour 3", image: "/images/tour3.jpg", price: "от 7000 ₽", rating: 4.8 },
];

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0F172A] to-[#1E293B]">
      <header className="flex justify-end p-4">
        <Image src="/images/kuzmich-avatar.jpg" alt="Kuzmich Avatar" width={64} height={64} className="rounded-full" />
      </header>
      <main className="p-4">
        <div className="flex items-center space-x-2">
          <input type="text" placeholder="Search..." className="flex-grow p-2 rounded-lg bg-white" />
          <button className="bg-[#FF7043] p-2 rounded-lg">🎤</button>
        </div>
        <button className="w-full py-3 mt-2 bg-[#FF7043] rounded-lg">Find</button>
        <div className="flex overflow-x-auto space-x-4 mt-4">
          {categories.map(category => (
            <div key={category.key} className="w-20 h-20 flex justify-center items-center bg-white rounded-full">
              {category}
            </div>
          ))}
        </div>
        <div className="space-y-4 mt-4">
          {popularTours.map(tour => (
            <div key={tour.title} className="bg-[#F8F9FA] rounded-lg p-4 shadow">
              <Image src={tour.image} alt={tour.title} width={300} height={200} priority />
              <h2 className="mt-2">{tour.title}</h2>
              <p>{tour.price}</p>
              <p>{"⭐".repeat(Math.round(tour.rating))}</p>
            </div>
          ))}
        </div>
      </main>
      <footer className="fixed bottom-0 left-0 right-0 flex justify-around bg-[#1E293B] p-4">
        <Home />
        <Search />
        <MapPin />
        <Heart />
        <User />
      </footer>
    </div>
  );
};

export default LandingPage;
