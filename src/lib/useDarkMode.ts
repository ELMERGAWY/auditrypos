import { useEffect } from 'react';

export function useDarkMode(enabled: boolean = true) {
  useEffect(() => {
    if (enabled) {
      document.documentElement.classList.add('dark');
    }
    return () => {
      document.documentElement.classList.remove('dark');
    };
  }, [enabled]);
}
