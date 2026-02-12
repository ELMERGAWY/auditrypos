import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, Key, Users, FileText, Download, Trash2, Check, X,
  Play, Pause, Copy, ChefHat, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  getRestaurants, saveRestaurants, updateRestaurant, deleteRestaurant,
  getLicenseKeys, generateLicenseKey, exportDatabase,
  type Restaurant, type LicenseKey
} from '@/lib/store';
import { toast } from 'sonner';

type Tab = 'restaurants' | 'licenses' | 'receipts' | 'backup';

const SuperAdmin = () => {
  const [tab, setTab] = useState<Tab>('restaurants');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [licenses, setLicenses] = useState<LicenseKey[]>([]);
  const [duration, setDuration] = useState(30);

  const load = () => {
    setRestaurants(getRestaurants());
    setLicenses(getLicenseKeys());
  };

  useEffect(() => { load(); }, []);

  const handleStatusChange = (id: string, status: Restaurant['status']) => {
    updateRestaurant(id, { status });
    load();
    toast.success('تم تحديث الحالة');
  };

  const handleDelete = (id: string) => {
    deleteRestaurant(id);
    load();
    toast.success('تم حذف المطعم');
  };

  const handleGenerate = () => {
    const key = generateLicenseKey(duration);
    load();
    navigator.clipboard.writeText(key);
    toast.success(`تم إنشاء المفتاح: ${key} (تم النسخ)`);
  };

  const handleExport = () => {
    const data = exportDatabase();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smartresto-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('تم تحميل النسخة الاحتياطية');
  };

  const handleApproveReceipt = (restaurantId: string, receiptId: string) => {
    const r = restaurants.find(r => r.id === restaurantId);
    if (!r) return;
    const receipts = r.paymentReceipts.map(rc =>
      rc.id === receiptId ? { ...rc, status: 'approved' as const } : rc
    );
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    updateRestaurant(restaurantId, { paymentReceipts: receipts, status: 'active', subscriptionEnd: endDate.toISOString() });
    load();
    toast.success('تم الموافقة وتفعيل المطعم');
  };

  const allReceipts = restaurants.flatMap(r => r.paymentReceipts.map(rc => ({ ...rc, restaurantName: r.name })));

  const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: 'restaurants', label: 'المطاعم', icon: Users },
    { id: 'licenses', label: 'مفاتيح الترخيص', icon: Key },
    { id: 'receipts', label: 'إيصالات الدفع', icon: FileText },
    { id: 'backup', label: 'النسخ الاحتياطي', icon: Download },
  ];

  return (
    <div className="min-h-screen bg-background dark" dir="rtl">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center">
            <Shield className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg">لوحة المدير العام</h1>
            <p className="text-xs text-muted-foreground">SmartResto Super Admin</p>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 mt-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                tab === t.id ? 'gradient-bg text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-secondary'
              }`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Restaurants */}
        {tab === 'restaurants' && (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-bold">المطاعم المسجلة ({restaurants.length})</h2>
            {restaurants.map(r => (
              <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shrink-0">
                      <ChefHat className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold truncate">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.email} — {r.ownerName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={r.status === 'active' ? 'status-active' : r.status === 'suspended' ? 'status-suspended' : 'status-pending'}>
                          {r.status === 'active' ? 'نشط' : r.status === 'suspended' ? 'موقوف' : 'معلق'}
                        </Badge>
                        {r.subscriptionEnd && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(r.subscriptionEnd).toLocaleDateString('ar-EG')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => handleStatusChange(r.id, 'active')}>
                      <Play className="w-3 h-3 ml-1" /> تفعيل
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleStatusChange(r.id, 'suspended')}>
                      <Pause className="w-3 h-3 ml-1" /> إيقاف
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => handleDelete(r.id)}>
                      <Trash2 className="w-3 h-3 ml-1" /> حذف
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
            {restaurants.length === 0 && <p className="text-muted-foreground text-center py-12">لا توجد مطاعم مسجلة</p>}
          </div>
        )}

        {/* License Keys */}
        {tab === 'licenses' && (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h2 className="font-display text-xl font-bold mb-4">إنشاء مفتاح ترخيص جديد</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={duration}
                  onChange={e => setDuration(Number(e.target.value))}
                  className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground border border-border"
                >
                  <option value={30}>30 يوم</option>
                  <option value={180}>180 يوم</option>
                  <option value={365}>365 يوم</option>
                </select>
                <Button onClick={handleGenerate} className="gradient-bg text-primary-foreground border-0">
                  <Key className="w-4 h-4 ml-2" /> إنشاء مفتاح
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-display font-bold">المفاتيح ({licenses.length})</h3>
              {licenses.map(lic => (
                <div key={lic.key} className="glass-card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <code className="font-mono text-sm text-primary flex-1">{lic.key}</code>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">{lic.duration} يوم</span>
                    <Badge className={lic.used ? 'status-suspended' : 'status-active'}>
                      {lic.used ? 'مُستخدم' : 'متاح'}
                    </Badge>
                    {lic.usedBy && <span className="text-xs text-muted-foreground">({lic.usedBy})</span>}
                    <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(lic.key); toast.success('تم النسخ'); }}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
              {licenses.length === 0 && <p className="text-muted-foreground text-center py-8">لا توجد مفاتيح بعد</p>}
            </div>
          </div>
        )}

        {/* Receipts */}
        {tab === 'receipts' && (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-bold">إيصالات الدفع ({allReceipts.length})</h2>
            {allReceipts.map(rc => (
              <div key={rc.id} className="glass-card p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">{rc.restaurantName}</p>
                  <p className="text-xs text-muted-foreground">{new Date(rc.uploadedAt).toLocaleString('ar-EG')}</p>
                  <p className="text-xs text-muted-foreground">{rc.method}</p>
                </div>
                <Badge className={rc.status === 'approved' ? 'status-active' : rc.status === 'rejected' ? 'status-suspended' : 'status-pending'}>
                  {rc.status === 'approved' ? 'معتمد' : rc.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                </Badge>
                {rc.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button size="sm" className="gradient-bg text-primary-foreground border-0" onClick={() => handleApproveReceipt(rc.restaurantId, rc.id)}>
                      <Check className="w-3 h-3 ml-1" /> موافقة
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive">
                      <X className="w-3 h-3 ml-1" /> رفض
                    </Button>
                  </div>
                )}
              </div>
            ))}
            {allReceipts.length === 0 && <p className="text-muted-foreground text-center py-12">لا توجد إيصالات</p>}
          </div>
        )}

        {/* Backup */}
        {tab === 'backup' && (
          <div className="glass-card p-8 text-center max-w-md mx-auto">
            <Download className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="font-display text-xl font-bold mb-2">نسخة احتياطية</h2>
            <p className="text-muted-foreground mb-6">تحميل نسخة كاملة من قاعدة البيانات بصيغة JSON</p>
            <Button onClick={handleExport} className="gradient-bg text-primary-foreground border-0" size="lg">
              <Download className="w-5 h-5 ml-2" /> تحميل النسخة الاحتياطية
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default SuperAdmin;
