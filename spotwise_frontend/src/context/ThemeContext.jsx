// src/context/ThemeContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

export const THEMES = {
  INDIGO: "indigo",
  EMERALD: "emerald",
  ROSE: "rose",
  DARK: "dark",
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem("spotwise_theme") || THEMES.INDIGO;
  });

  const setTheme = (newTheme) => {
    if (Object.values(THEMES).includes(newTheme)) {
      setThemeState(newTheme);
      localStorage.setItem("spotwise_theme", newTheme);
    }
  };

  useEffect(() => {
    const root = document.documentElement;
    
    // Clean up previous themes
    Object.values(THEMES).forEach((t) => {
      root.classList.remove(`theme-${t}`);
    });
    root.classList.remove("dark");

    // Add new theme class and attribute
    root.setAttribute("data-theme", theme);
    root.classList.add(`theme-${theme}`);

    // If it's the dark theme, also trigger Tailwind's standard dark mode class
    if (theme === THEMES.DARK) {
      root.classList.add("dark");
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
