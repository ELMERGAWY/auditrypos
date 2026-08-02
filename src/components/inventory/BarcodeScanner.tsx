import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Scan, Barcode, X, Camera, CheckCircle, AlertTriangle,
  Package, Search, RefreshCw, Copy, Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  quantity: number;
  cost_price: number;
  price: number;
  category?: string;
  unit?: string;
}

interface Props {
  restaurantId: string;
  currency: string;
  onProductScanned?: (product: Product) => void;
  onClose?: () => void;
}

export function BarcodeScanner({ restaurantId, currency, onProductScanned, onClose }: Props) {
  const [barcode, setBarcode] = useState('');
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [recentScans, setRecentScans] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const loadProductByBarcode = async (code: string) => {
    if (!code.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .or(`barcode.eq.${code},sku.eq.${code}`)
        .single();

      if (error) throw error;

      if (data) {
        setScannedProduct(data);
        
        // Add to recent scans
        setRecentScans(prev => {
          const filtered = prev.filter(p => p.id !== data.id);
          return [data, ...filtered].slice(0, 10);
        });

        // Call callback if provided
        if (onProductScanned) {
          onProductScanned(data);
        }

        toast.success(`تم العثور على المنتج: ${data.name}`);
      } else {
        setScannedProduct(null);
        toast.error('المنتج غير موجود');
      }
    } catch (error: any) {
      setScannedProduct(null);
      toast.error('فشل البحث عن المنتج');
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadProductByBarcode(barcode);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
      }
    } catch (error) {
      toast.error('فشل تشغيل الكاميرا');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle barcode scanner input (usually ends with Enter)
    if (e.key === 'Enter' && barcode) {
      loadProductByBarcode(barcode);
      setBarcode('');
    }
  };

  const copyBarcode = () => {
    navigator.clipboard.writeText(barcode);
    toast.success('تم نسخ البار كود');
  };

  const exportRecentScans = () => {
    const csv = [
      ['الاسم', 'SKU', 'البار كود', 'الكمية', 'السعر', 'العملة'].join(','),
      ...recentScans.map(p => [
        p.name,
        p.sku || '',
        p.barcode || '',
        p.quantity,
        p.price,
        currency
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recent_scans_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('تم تصدير عمليات المسح الحديثة');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/20 rounded-xl">
            <Scan className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">ماسح البار كود</h1>
            <p className="text-muted-foreground">مسح البار كود للبحث السريع عن المنتجات</p>
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Scanner Input */}
      <Card className="p-6">
        <form onSubmit={handleBarcodeSubmit} className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Barcode className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="امسح البار كود أو أدخل يدوياً..."
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pr-10"
                autoFocus
              />
            </div>
            <Button type="submit" disabled={loading || !barcode}>
              {loading ? 'جاري البحث...' : <Search className="w-4 h-4" />}
            </Button>
            <Button type="button" variant="outline" onClick={copyBarcode} disabled={!barcode}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={cameraActive ? stopCamera : startCamera}
              className="flex-1"
            >
              <Camera className="w-4 h-4 ml-2" />
              {cameraActive ? 'إيقاف الكاميرا' : 'تشغيل الكاميرا'}
            </Button>
          </div>
        </form>

        {/* Camera View */}
        {cameraActive && (
          <div className="mt-4 relative">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-64 object-cover rounded-lg"
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-4 border-white/50 w-48 h-32 rounded-lg" />
            </div>
          </div>
        )}
      </Card>

      {/* Scanned Product */}
      <AnimatePresence>
        {scannedProduct && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="p-6 bg-green-500/10 border-green-500/20">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{scannedProduct.name}</h3>
                    <div className="flex gap-2 mt-2">
                      {scannedProduct.sku && (
                        <Badge variant="outline" className="text-xs">SKU: {scannedProduct.sku}</Badge>
                      )}
                      {scannedProduct.barcode && (
                        <Badge variant="outline" className="text-xs">Barcode: {scannedProduct.barcode}</Badge>
                      )}
                      {scannedProduct.category && (
                        <Badge variant="secondary" className="text-xs">{scannedProduct.category}</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => setScannedProduct(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="text-center p-3 bg-white/5 rounded-lg">
                  <p className="text-xs text-muted-foreground">الكمية</p>
                  <p className="font-bold text-lg">{scannedProduct.quantity} {scannedProduct.unit || ''}</p>
                </div>
                <div className="text-center p-3 bg-white/5 rounded-lg">
                  <p className="text-xs text-muted-foreground">سعر التكلفة</p>
                  <p className="font-bold text-lg">{scannedProduct.cost_price.toLocaleString()} {currency}</p>
                </div>
                <div className="text-center p-3 bg-white/5 rounded-lg">
                  <p className="text-xs text-muted-foreground">سعر البيع</p>
                  <p className="font-bold text-lg text-green-400">{scannedProduct.price.toLocaleString()} {currency}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent Scans */}
      {recentScans.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold flex items-center gap-2">
              <Package className="w-5 h-5" />
              عمليات المسح الحديثة
            </h3>
            <Button variant="outline" size="sm" onClick={exportRecentScans}>
              <Download className="w-4 h-4 ml-2" />
              تصدير
            </Button>
          </div>

          <div className="space-y-2">
            {recentScans.map((product, index) => (
              <div 
                key={product.id}
                className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                onClick={() => {
                  setScannedProduct(product);
                  if (onProductScanned) onProductScanned(product);
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-400">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {product.barcode || product.sku || 'بدون بار كود'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">{product.quantity} {product.unit || ''}</p>
                  <p className="text-xs text-muted-foreground">{product.price.toLocaleString()} {currency}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Instructions */}
      <Card className="p-6 bg-blue-500/10 border-blue-500/20">
        <h3 className="font-bold flex items-center gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 text-blue-400" />
          تعليمات الاستخدام
        </h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 mt-0.5 text-blue-400 flex-shrink-0" />
            <span>استخدم ماسح البار كود اليدوي أو أدخل الرقم يدوياً واضغط Enter</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 mt-0.5 text-blue-400 flex-shrink-0" />
            <span>يمكنك تشغيل الكاميرا لمسح البار كود مباشرة</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 mt-0.5 text-blue-400 flex-shrink-0" />
            <span>يتم حفظ آخر 10 عمليات مسح للرجوع إليها</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 mt-0.5 text-blue-400 flex-shrink-0" />
            <span>يمكنك تصدير عمليات المسح الحديثة كملف CSV</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}
