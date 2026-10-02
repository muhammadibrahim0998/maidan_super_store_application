import { useEffect, useRef } from 'react';
import { playBarcodeBeep } from '../utils/soundHelper';

/**
 * Custom hook to detect USB / Bluetooth physical barcode scanners.
 * Handheld barcode scanner guns type characters in rapid succession (< 50ms interval)
 * followed by an 'Enter' key.
 */
export function useBarcodeScanner({ onScan, enabled = true, minLength = 3 }) {
  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // If user is focused on a normal text input or textarea, let normal typing happen UNLESS it's very fast machine typing
      const activeEl = document.activeElement;
      const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable);
      const isBarcodeInput = activeEl && activeEl.dataset && activeEl.dataset.barcodeInput === 'true';
      if (!e || typeof e.key !== 'string') return;

      if (e.key === 'Enter') {
        const scannedCode = bufferRef.current.trim();
        bufferRef.current = '';

        // If buffered code is at least minLength and rapid typing took place
        if (scannedCode.length >= minLength) {
          e.preventDefault();
          playBarcodeBeep('success');
          if (onScan) {
            onScan(scannedCode);
          }
        }
        return;
      }

      // Ignore single modifier keys or non-character keys
      if (e.key.length !== 1) return;

      // If time between keystrokes is too long (human typing > 80ms) and we are not in a dedicated barcode input, reset buffer
      if (timeDiff > 70 && !isBarcodeInput) {
        bufferRef.current = '';
      }

      // If not typing in a normal text input (or typing at machine speed < 60ms), accumulate
      if (!isInput || timeDiff < 60 || isBarcodeInput) {
        bufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, onScan, minLength]);
}

export default useBarcodeScanner;
