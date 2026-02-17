import React, { useState } from 'react';
import { Transition } from '@headlessui/react';

const KamchatourHome = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  return (
    <div className={`h-screen flex flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-white'} transition-colors duration-500`}>  
      <header className="p-4 flex justify-between items-center">
        <h1 className={`text-4xl ${isDarkMode ? 'text-white' : 'text-black'}`}>Kamchatour</h1>
        <button onClick={toggleTheme} className="bg-gray-300 rounded-full p-2">
          {isDarkMode ? 'Light Mode' : 'Dark Mode'}
        </button>
      </header>

      <main className="flex-grow overflow-y-auto p-4">
        <Transition
          show={true}
          enter="transition-opacity duration-1000"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-1000"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <section className="my-10">
            <h2 className={`text-2xl ${isDarkMode ? 'text-white' : 'text-black'}`}>Explore Categories</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="p-4 border rounded-lg shadow-lg backdrop-blur-lg">
                <h3 className={isDarkMode ? 'text-yellow-400' : 'text-blue-500'}>Category 1</h3>
              </div>
              <div className="p-4 border rounded-lg shadow-lg backdrop-blur-lg">
                <h3 className={isDarkMode ? 'text-yellow-400' : 'text-blue-500'}>Category 2</h3>
              </div>
              <div className="p-4 border rounded-lg shadow-lg backdrop-blur-lg">
                <h3 className={isDarkMode ? 'text-yellow-400' : 'text-blue-500'}>Category 3</h3>
              </div>
            </div>
          </section>
        </Transition>

        <footer className="mt-auto p-4">
          <nav className="flex justify-between bg-gray-200 rounded-full p-2">
            <button className={`px-4 py-2 rounded-full ${isDarkMode ? 'text-white bg-blue-700' : 'text-black bg-gray-300'}`}>Home</button>
            <button className={`px-4 py-2 rounded-full ${isDarkMode ? 'text-white bg-blue-700' : 'text-black bg-gray-300'}`}>Tours</button>
            <button className={`px-4 py-2 rounded-full ${isDarkMode ? 'text-white bg-blue-700' : 'text-black bg-gray-300'}`}>Contact</button>
          </nav>
        </footer>
      </main>

      <style jsx>{`
        .volcano-bg {
          background-image: url('/path-to-your-volcano-image.jpg');
          background-size: cover;
          background-position: center;
        }
      `}</style>
    </div>
  );
};

export default KamchatourHome;