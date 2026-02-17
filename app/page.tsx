import React, { useEffect, useState } from 'react';
import { ThemeProvider, createGlobalStyle } from 'styled-components';
import SearchBar from './components/SearchBar';
import CategoryIcons from './components/CategoryIcons';
import TourCard from './components/TourCard';
import BottomNav from './components/BottomNav';

const GlobalStyle = createGlobalStyle`
  body {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    background: ${(props) => (props.theme.dark ? '#121212' : '#ffffff')};
    color: ${(props) => (props.theme.dark ? '#ffffff' : '#000000')};
    transition: background 0.3s, color 0.3s;
  }
`;

const theme = {
  dark: false,
};

const App = () => {
  const [isDarkMode, setIsDarkMode] = useState(theme.dark);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDarkMode(JSON.parse(savedTheme));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  return (
    <ThemeProvider theme={{ dark: isDarkMode }}>
      <GlobalStyle />
      <header>
        <h1>Kamchatour Hub</h1>
        <button onClick={toggleTheme}>Toggle Theme</button>
        <SearchBar value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </header>
      <CategoryIcons />
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        {[...Array(3)].map((_, i) => (
          <TourCard key={i} image={`image${i + 1}.jpg`} rating={Math.floor(Math.random() * 5) + 1} />
        ))}
      </div>
      <BottomNav />
    </ThemeProvider>
  );
};

export default App;
