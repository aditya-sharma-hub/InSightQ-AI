import React, { createContext, useContext, useState, useEffect } from 'https://esm.sh/react@18.2.0';

const ThemeContext = createContext({
  theme: 'light',
  mode: 'system',
  setMode: () => {},
  toggleTheme: () => {}
});

export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState(() => {
    return localStorage.getItem('insightiq_theme_mode') || 'system';
  });

  const [activeTheme, setActiveTheme] = useState('light');

  useEffect(() => {
    const root = document.documentElement;
    localStorage.setItem('insightiq_theme_mode', mode);

    const applyTheme = (themeName) => {
      root.setAttribute('data-theme', themeName);
      setActiveTheme(themeName);
    };

    if (mode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const updateSystemTheme = () => {
        applyTheme(mediaQuery.matches ? 'dark' : 'light');
      };
      updateSystemTheme();
      mediaQuery.addEventListener('change', updateSystemTheme);
      return () => mediaQuery.removeEventListener('change', updateSystemTheme);
    } else {
      applyTheme(mode);
    }
  }, [mode]);

  const toggleTheme = () => {
    setMode(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    React.createElement(ThemeContext.Provider, {
      value: { theme: activeTheme, mode, setMode, toggleTheme }
    }, children)
  );
};

export const useTheme = () => useContext(ThemeContext);
