import { useState } from 'react';
import { SearchIcon, MoonIcon, SunIcon } from '@heroicons/react/outline';

const KamchatourPage = () => {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const categories = ['Adventure', 'Culture', 'Nature', 'Wildlife'];
    const tours = [
        { title: 'Tour 1', description: 'Adventure in Kamchatka', price: '$100' },
        { title: 'Tour 2', description: 'Cultural Experience', price: '$150' },
        { title: 'Tour 3', description: 'Wildlife Exploration', price: '$200' },
    ];

    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
    };

    const filteredTours = tours.filter(tour =>
        tour.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'} flex flex-col`}>  
            <header className="flex justify-between items-center p-4">  
                <h1 className="text-2xl font-bold">Kamchatour Hub</h1>  
                <button onClick={toggleTheme} className="p-2 rounded-full">  
                    {isDarkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}  
                </button>  
            </header>  
            <div className="flex items-center p-4">  
                <input  
                    type="text"  
                    placeholder="Search tours..."  
                    value={searchTerm}  
                    onChange={(e) => setSearchTerm(e.target.value)}  
                    className="border border-gray-300 rounded-full py-2 px-4 w-full"  
                />  
                <button className="ml-2">  
                    <SearchIcon className="h-5 w-5" />  
                </button>  
            </div>  
            <nav className="flex space-x-4 p-4">  
                {categories.map(category => (  
                    <a key={category} href="#" className="text-blue-500">{category}</a>  
                ))}  
            </nav>  
            <main className="flex flex-col items-center">  
                {filteredTours.length > 0 ? (  
                    filteredTours.map((tour, index) => (  
                        <div key={index} className="border rounded-lg p-4 m-2 bg-gray-100">  
                            <h2 className="font-bold text-xl">{tour.title}</h2>  
                            <p>{tour.description}</p>  
                            <p>{tour.price}</p>  
                        </div>  
                    ))  
                ) : (  
                    <p>No tours found.</p>  
                )}  
            </main>  
            <footer className="mt-auto p-4 border-t">  
                <nav className="flex justify-around">  
                    <a href="#" className="text-blue-500">Home</a>  
                    <a href="#" className="text-blue-500">About</a>  
                    <a href="#" className="text-blue-500">Contact</a>  
                </nav>  
            </footer>  
        </div>  
    );
};

export default KamchatourPage;