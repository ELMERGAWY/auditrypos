import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChefHat, CreditCard, Upload, Key, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const paymentMethods = [
  { name: 'InstaPay', detail: '01096016070', icon: '💳' },
  { name: 'Vodafone Cash', detail: '01044377070', icon: '📱' },
  { name: 'PayPal', detail: 'abdelsabourmergawy@gmail.com', icon: '🅿️' },
  { name: 'Bank Transfer', detail: 'سيتم إضافة التفاصيل قريباً', icon: '🏦' },
];

const Payment = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [licenseKey, setLicenseKey] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [receiptUploaded, setReceiptUploaded] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('restaurants').select('id').eq('owner_id', user.id).limit(1).then(({ data }) => {
      if (data?.[0]) setRestaurantId(data[0].id);
    });
  }, [user]);

  const handleActivate = async () => {
    if (!restaurantId || !licenseKey.trim()) { toast.error('أدخل مفتاح الترخيص'); return; }
    
    // Find the license key
    const { data: keyData } = await supabase.from('license_keys').select('*').eq('key', licenseKey.trim()).eq('used', false).maybeSingle();
    if (!keyData) { toast.error('مفتاح غير صالح أو مستخدم بالفعل'); return; }

    // Mark key as used
    await supabase.from('license_keys').update({ used: true, used_by: restaurantId, used_at: new Date().toISOString() }).eq('id', keyData.id);

    // Activate restaurant
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + keyData.duration_days);
    await supabase.from('restaurants').update({ status: 'active', subscription_end: endDate.toISOString(), license_key: licenseKey.trim() }).eq('id', restaurantId);

    toast.success(`تم التفعيل بنجاح لمدة ${keyData.duration_days} يوم`);
    navigate('/dashboard');
  };

  const handleCopy = (text: string, name: string) => {
    navigator.clipboard.writeText(text);
    setCopied(name);
    toast.success(`تم نسخ ${name}`);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleUploadReceipt = async () => {
    if (!restaurantId) return;
    await supabase.from('payment_receipts').insert({ restaurant_id: restaurantId, method: 'Manual Upload', status: 'pending' });
    setReceiptUploaded(true);
    toast.success('تم رفع الإيصال بنجاح! سيتم مراجعته من الإدارة.');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8" dir="rtl">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 rounded-xl gradient-bg flex items-center justify-center mx-auto mb-4"><CreditCard className="w-8 h-8 text-primary-foreground" /></div>
          <h1 className="font-display text-2xl font-bold">تفعيل الاشتراك</h1>
          <p className="text-muted-foreground mt-1">اختر طريقة الدفع المناسبة لك</p>
        </div>
        <div className="glass-card p-6 space-y-4">
          <h2 className="font-display font-bold text-lg">طرق الدفع</h2>
          {paymentMethods.map(method => (
            <div key={method.name} className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
              <span className="text-2xl">{method.icon}</span>
              <div className="flex-1 min-w-0"><p className="font-medium text-sm">{method.name}</p><p className="text-xs text-muted-foreground truncate">{method.detail}</p></div>
              <Button size="sm" variant="ghost" onClick={() => handleCopy(method.detail, method.name)} className="shrink-0">
                {copied === method.name ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          ))}
        </div>
        <div className="glass-card p-6 space-y-4">
          <h2 className="font-display font-bold text-lg flex items-center gap-2"><Upload className="w-5 h-5 text-primary" /> رفع إيصال الدفع</h2>
          <p className="text-sm text-muted-foreground">بعد التحويل، ارفع صورة الإيصال وسيتم مراجعتها من الإدارة</p>
          <Button variant="outline" className="w-full" onClick={handleUploadReceipt} disabled={receiptUploaded || !restaurantId}>
            {receiptUploaded ? <><Check className="w-4 h-4 ml-2 text-success" /> تم الرفع - قيد المراجعة</> : <><Upload className="w-4 h-4 ml-2" /> رفع الإيصال</>}
          </Button>
        </div>
        <div className="glass-card p-6 space-y-4">
          <h2 className="font-display font-bold text-lg flex items-center gap-2"><Key className="w-5 h-5 text-primary" /> تفعيل بمفتاح الترخيص</h2>
          <div><Label>مفتاح الترخيص</Label><Input value={licenseKey} onChange={e => setLicenseKey(e.target.value)} placeholder="SR-XXXX-XXXX" className="font-mono tracking-wider" /></div>
          <Button onClick={handleActivate} className="w-full gradient-bg text-primary-foreground border-0" disabled={!restaurantId}>تفعيل المفتاح</Button>
        </div>
        <Button variant="ghost" className="w-full" onClick={() => navigate('/')}>العودة للرئيسية</Button>
      </div>
    </div>
  );
};

export default Payment;
