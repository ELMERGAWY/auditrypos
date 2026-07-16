import { useCallback } from 'react';

// ──────────────────────────────────────────────
// Helper: play a single tone burst
// ──────────────────────────────────────────────
function playTone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  gainPeak: number,
  type: OscillatorType = 'sine'
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.03);
  gain.gain.setValueAtTime(gainPeak, startTime + duration - 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

// ──────────────────────────────────────────────
// NEW ORDER – loud urgent alarm (3 × ding-ding-DONG)
// Total ≈ 2.4 s, near-max volume (gain 0.9)
// ──────────────────────────────────────────────
function playOrderAlarm() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const GAIN = 0.9;
    const t = ctx.currentTime;

    // Attention grabber square beep at the very start
    playTone(ctx, 1047, t, 0.08, 0.75, 'square');

    // 3 repetitions of: ding (C5) → ding (E5) → DONG (G5)
    for (let rep = 0; rep < 3; rep++) {
      const base = t + rep * 0.8;
      playTone(ctx, 523, base,       0.18, GAIN, 'triangle'); // ding
      playTone(ctx, 659, base + 0.2, 0.18, GAIN, 'triangle'); // ding
      playTone(ctx, 784, base + 0.4, 0.35, GAIN, 'sine');     // DONG
    }
  } catch {
    // AudioContext not available
  }
}

// ──────────────────────────────────────────────
// WAITER CALL – softer triple bell
// ──────────────────────────────────────────────
function playWaiterAlarm() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const t = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      playTone(ctx, 880, t + i * 0.22, 0.18, 0.5, 'sine');
    }
    playTone(ctx, 1047, t + 0.66, 0.25, 0.4, 'sine');
  } catch {
    // silent fallback
  }
}

// ──────────────────────────────────────────────
// Browser Notification helpers
// ──────────────────────────────────────────────
export async function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
}

export function showBrowserNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    const n = new Notification(title, {
      body,
      icon: '/favicon.ico',
      requireInteraction: true, // stays on screen until dismissed
      tag: 'new-order',
    });
    setTimeout(() => n.close(), 15000);
  }
}

// ──────────────────────────────────────────────
// Exported hooks
// ──────────────────────────────────────────────
export function useOrderNotificationSound() {
  return useCallback(() => playOrderAlarm(), []);
}

export function useWaiterCallSound() {
  return useCallback(() => playWaiterAlarm(), []);
}
