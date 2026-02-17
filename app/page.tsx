import React, { useEffect, useState } from "react";
import "./styles.css"; // Define your CSS styles here

const App = () => {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme) {
      setTheme(storedTheme);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  return (
    <div className={theme}>
      <header>
        <h1>Welcome to Our Page</h1>
        <button onClick={toggleTheme}>
          Switch to {theme === "light" ? "Dark" : "Light"} Theme
        </button>
      </header>
      <main>
        <div className="animation-container">
          <img src="/path/to/KH_logo.png" alt="KH Logo" className="logo" />
          <div className="stars-animation" />
        </div>
      </main>
      <footer>
        <p>Footer Content</p>
      </footer>
    </div>
  );
};

export default App;