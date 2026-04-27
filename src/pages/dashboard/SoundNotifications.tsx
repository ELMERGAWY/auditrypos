import { useEffect, useRef, useCallback } from 'react';

// Generate notification sounds using Web Audio API
function playSound(type: 'order' | 'waiter') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    if (type === 'order') {
      // Two-tone ascending chime for new order
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(523, ctx.currentTime); // C5
      oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.15); // E5
      oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.3); // G5
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
    } else {
      // Bell-like sound for waiter call
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5
      gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      
      // Second ring
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
      gain2.gain.setValueAtTime(0, ctx.currentTime);
      gain2.gain.setValueAtTime(0.4, ctx.currentTime + 0.2);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc2.start(ctx.currentTime + 0.2);
      osc2.stop(ctx.currentTime + 0.4);
      
      // Third ring
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(1047, ctx.currentTime + 0.45); // C6
      gain3.gain.setValueAtTime(0, ctx.currentTime);
      gain3.gain.setValueAtTime(0.35, ctx.currentTime + 0.45);
      gain3.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.7);
      osc3.start(ctx.currentTime + 0.45);
      osc3.stop(ctx.currentTime + 0.7);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.2);
    }
  } catch {
    // Fallback: silent if AudioContext unavailable
  }
}

export function useOrderNotificationSound() {
  return useCallback(() => playSound('order'), []);
}

export function useWaiterCallSound() {
  return useCallback(() => playSound('waiter'), []);
}
