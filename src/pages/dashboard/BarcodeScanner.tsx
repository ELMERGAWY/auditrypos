import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, X, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [manualCode, setManualCode] = useState('');
  const [mode, setMode] = useState<'camera' | 'manual'>('camera');
  const [error, setError] = useState('');
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    scanningRef.current = false;
  }, []);

  useEffect(() => {
    if (mode !== 'camera') return;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // Try native BarcodeDetector
        if ('BarcodeDetector' in window) {
          const detector = new (window as any).BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a', 'upc_e']
          });
          scanningRef.current = true;

          const scan = async () => {
            if (!scanningRef.current || !videoRef.current) return;
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes.length > 0) {
                const code = barcodes[0].rawValue;
                stopCamera();
                onScan(code);
                return;
              }
            } catch {}
            if (scanningRef.current) requestAnimationFrame(scan);
          };
          // Wait a bit for camera to initialize
          setTimeout(scan, 500);
        } else {
          setError('متصفحك لا يدعم ماسح الباركود التلقائي. استخدم الإدخال اليدوي.');
          setMode('manual');
        }
      } catch (err) {
        setError('لا يمكن الوصول للكاميرا. تأكد من السماح بالوصول.');
        setMode('manual');
      }
    };

    startCamera();
    return stopCamera;
  }, [mode, onScan, stopCamera]);

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      onScan(manualCode.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center p-4">
      <div className="glass-card p-4 max-w-md w-full space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" /> ماسح الباركود
          </h3>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => { stopCamera(); setMode(mode === 'camera' ? 'manual' : 'camera'); }}>
              {mode === 'camera' ? <Keyboard className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { stopCamera(); onClose(); }}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {mode === 'camera' && (
          <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-32 border-2 border-primary/60 rounded-lg" />
            </div>
            <p className="absolute bottom-2 left-0 right-0 text-center text-xs text-white/70">
              وجّه الكاميرا نحو الباركود
            </p>
          </div>
        )}

        {mode === 'manual' && (
          <div className="space-y-3">
            {error && <p className="text-xs text-warning">{error}</p>}
            <Input
              placeholder="أدخل رقم الباركود يدوياً..."
              value={manualCode}
              onChange={e => setManualCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleManualSubmit()}
              autoFocus
            />
            <Button onClick={handleManualSubmit} className="w-full gradient-bg text-primary-foreground border-0" disabled={!manualCode.trim()}>
              بحث
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
