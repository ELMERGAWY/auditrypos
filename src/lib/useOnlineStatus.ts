import { useState, useEffect, useRef } from 'react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  const prevOnlineRef = useRef(isOnline);
  const justBackRef = useRef(false);

  useEffect(() => {
    const handleOnline = () => {
      if (!prevOnlineRef.current) {
        setWasOffline(true);
        justBackRef.current = true;
        setTimeout(() => {
          setWasOffline(false);
          justBackRef.current = false;
        }, 3000);
      }
      setIsOnline(true);
      prevOnlineRef.current = true;
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      prevOnlineRef.current = false;
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const justBack = justBackRef.current;

  return { isOnline, wasOffline, justBack };
}