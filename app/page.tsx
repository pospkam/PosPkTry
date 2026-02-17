import { useState } from 'react';
import { Sun, Moon, Star } from 'lucide-react';

const Page = () => {
  const [darkMode, setDarkMode] = useState(false);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-white'} transition-all`}>
      {/* Background Stars Effect */}
      <div className="fixed inset-0 bg-[url('/path-to-volcano-background.jpg')] bg-cover bg-center z-0" />
      <div className="fixed inset-0 bg-black opacity-50 z-10" />
      
      <div className="relative z-20 p-5">
        {/* Theme Toggle Button */}
        <button onClick={toggleTheme} className="mb-4">
          {darkMode ? <Sun /> : <Moon />}
        </button>

        {/* Categories Section */}
        <h2 className="text-2xl">Categories</h2>
        <ul className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <li className="bg-gray-200 p-4">Category 1</li>
          <li className="bg-gray-200 p-4">Category 2</li>
          <li className="bg-gray-200 p-4">Category 3</li>
          <li className="bg-gray-200 p-4">Category 4</li>
        </ul>
        
        {/* Tours Section */}
        <h2 className="text-2xl mt-6">Tours</h2>
        <div className="mt-4">
          <div className="border p-4 mb-4">Tour 1</div>
          <div className="border p-4 mb-4">Tour 2</div>
        </div>
        
        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800">
          <ul className="flex justify-around py-2">
            <li><Star /></li>
            {/* Add more navigation icons here */}
          </ul>
        </nav>
      </div>
    </div>
  );
};

export default Page;