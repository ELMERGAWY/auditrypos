import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChefHat, CreditCard, Upload, Key, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getCurrentRestaurantId, activateLicense, getRestaurant, updateRestaurant } from '@/lib/store';
import { toast } from 'sonner';

const paymentMethods = [
  { name: 'InstaPay', detail: '01096016070', icon: '💳' },
  { name: 'Vodafone Cash', detail: '01044377070', icon: '📱' },
  { name: 'PayPal', detail: 'abdelsabourmergawy@gmail.com', icon: '🅿️' },
  { name: 'Bank Transfer', detail: 'سيتم إضافة التفاصيل قريباً', icon: '🏦' },
];

const Payment = () => {
  const navigate = useNavigate();
  const [licenseKey, setLicenseKey] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [receiptUploaded, setReceiptUploaded] = useState(false);

  const restaurantId = getCurrentRestaurantId();

  const handleActivate = () => {
    if (!restaurantId || !licenseKey.trim()) {
      toast.error('أدخل مفتاح الترخيص');
      return;
    }
    const result = activateLicense(licenseKey.trim(), restaurantId);
    if (result.success) {
      toast.success(result.message);
      navigate('/dashboard');
    } else {
      toast.error(result.message);
    }
  };

  const handleCopy = (text: string, name: string) => {
    navigator.clipboard.writeText(text);
    setCopied(name);
    toast.success(`تم نسخ ${name}`);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleUploadReceipt = () => {
    if (!restaurantId) return;
    const restaurant = getRestaurant(restaurantId);
    if (!restaurant) return;
    const receipts = [...restaurant.paymentReceipts, {
      id: `rcpt-${Date.now()}`,
      restaurantId,
      restaurantName: restaurant.name,
      imageUrl: 'receipt-placeholder',
      method: 'Manual Upload',
      status: 'pending' as const,
      uploadedAt: new Date().toISOString(),
    }];
    updateRestaurant(restaurantId, { paymentReceipts: receipts });
    setReceiptUploaded(true);
    toast.success('تم رفع الإيصال بنجاح! سيتم مراجعته من الإدارة.');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8" dir="rtl">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 rounded-xl gradient-bg flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold">تفعيل الاشتراك</h1>
          <p className="text-muted-foreground mt-1">اختر طريقة الدفع المناسبة لك</p>
        </div>

        {/* Payment Methods */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="font-display font-bold text-lg">طرق الدفع</h2>
          {paymentMethods.map(method => (
            <div key={method.name} className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
              <span className="text-2xl">{method.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{method.name}</p>
                <p className="text-xs text-muted-foreground truncate">{method.detail}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleCopy(method.detail, method.name)}
                className="shrink-0"
              >
                {copied === method.name ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          ))}
        </div>

        {/* Upload Receipt */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="font-display font-bold text-lg flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" /> رفع إيصال الدفع
          </h2>
          <p className="text-sm text-muted-foreground">بعد التحويل، ارفع صورة الإيصال وسيتم مراجعتها من الإدارة</p>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleUploadReceipt}
            disabled={receiptUploaded}
          >
            {receiptUploaded ? (
              <><Check className="w-4 h-4 ml-2 text-success" /> تم الرفع - قيد المراجعة</>
            ) : (
              <><Upload className="w-4 h-4 ml-2" /> رفع الإيصال</>
            )}
          </Button>
        </div>

        {/* License Key */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="font-display font-bold text-lg flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" /> تفعيل بمفتاح الترخيص
          </h2>
          <div>
            <Label>مفتاح الترخيص</Label>
            <Input
              value={licenseKey}
              onChange={e => setLicenseKey(e.target.value)}
              placeholder="SR-XXXX-XXXX"
              className="font-mono tracking-wider"
            />
          </div>
          <Button onClick={handleActivate} className="w-full gradient-bg text-primary-foreground border-0">
            تفعيل المفتاح
          </Button>
        </div>

        <Button variant="ghost" className="w-full" onClick={() => navigate('/')}>العودة للرئيسية</Button>
      </div>
    </div>
  );
};

export default Payment;
