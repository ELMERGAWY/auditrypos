import { useState, useEffect } from 'react';

export function useDarkMode(defaultDark: boolean = true) {
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem('theme-mode');
    if (stored) return stored === 'dark';
    return defaultDark;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme-mode', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleDarkMode = () => setIsDark(prev => !prev);

  return { isDark, toggleDarkMode };
}
