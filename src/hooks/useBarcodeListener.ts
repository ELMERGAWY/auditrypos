import { useEffect, useRef } from 'react';

/**
 * Global hardware barcode-scanner listener.
 * Detects fast keystroke bursts ending with Enter and reports the buffered code.
 * Ignores typing inside inputs/textareas so manual search keeps working.
 */
export function useBarcodeListener(
  onScan: (code: string) => void,
  options: { enabled?: boolean; minLength?: number; timeoutMs?: number } = {}
) {
  const { enabled = true, minLength = 3, timeoutMs = 60 } = options;
  const bufferRef = useRef('');
  const lastKeyRef = useRef(0);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTyping = tag === 'input' || tag === 'textarea' || target?.isContentEditable;

      const now = Date.now();
      if (now - lastKeyRef.current > timeoutMs * 6) bufferRef.current = '';
      lastKeyRef.current = now;

      if (e.key === 'Enter') {
        const code = bufferRef.current.trim();
        bufferRef.current = '';
        if (code.length >= minLength) {
          if (isTyping) e.preventDefault();
          onScanRef.current(code);
        }
        return;
      }

      if (e.key.length === 1) {
        // only buffer rapid input (scanner speed) when the user is typing manually
        bufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled, minLength, timeoutMs]);
}

export default useBarcodeListener;
