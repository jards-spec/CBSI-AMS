import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_KEY = 'vantage_theme';

const applyTheme = (nextTheme: Theme) => {
  const root = document.documentElement;
  const supportsViewTransition =
    typeof (document as any).startViewTransition === 'function';

  if (supportsViewTransition) {
    (document as any).startViewTransition(() => {
      root.classList.toggle('dark', nextTheme === 'dark');
    });
    return;
  }

  // Fallback for browsers without View Transitions support
  root.classList.add('theme-switching');
  root.classList.toggle('dark', nextTheme === 'dark');
  window.setTimeout(() => {
    root.classList.remove('theme-switching');
  }, 220);
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem(THEME_KEY) as Theme | null;
    return stored === 'light' || stored === 'dark' ? stored : 'dark';
  });

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};