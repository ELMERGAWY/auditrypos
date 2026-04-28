import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BUSINESS_TYPES, type BusinessType } from '@/lib/businessTypes';

interface Props {
  userId: string;
  onCreated: () => void;
}

export function CreateRestaurantForm({ userId, onCreated }: Props) {
  const [name, setName] = useState('');
  const [bizType, setBizType] = useState<BusinessType>('restaurant');
  const [loading, setLoading] = useState(false);

  // Check localStorage for pending business from registration
  useEffect(() => {
    const pending = localStorage.getItem('pending_business');
    if (pending) {
      try {
        const { name: bName, type } = JSON.parse(pending);
        if (bName) setName(bName);
        if (type) setBizType(type as BusinessType);
        localStorage.removeItem('pending_business');
      } catch {}
    }
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 14);
      const { error } = await supabase.from('restaurants').insert({
        owner_id: userId,
        name,
        status: 'active',
        subscription_end: trialEnd.toISOString(),
        business_type: bizType,
      });
      
      if (error) {
        toast.error('حدث خطأ أثناء الإنشاء: ' + error.message);
        console.error('Create restaurant error:', error);
        return;
      }
      
      onCreated();
    } catch (err: any) {
      toast.error('خطأ غير متوقع: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {(Object.entries(BUSINESS_TYPES) as [BusinessType, typeof BUSINESS_TYPES[BusinessType]][]).slice(0, 8).map(([key, bt]) => (
          <button key={key} onClick={() => setBizType(key)}
            className={`p-2 rounded-lg text-center transition-all text-xs ${bizType === key ? 'gradient-bg text-primary-foreground' : 'bg-secondary'}`}>
            <span className="text-lg block">{bt.icon}</span>
            {bt.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="اسم النشاط" />
        <Button onClick={handleCreate} disabled={loading} className="gradient-bg text-primary-foreground border-0">
          {loading ? '...' : 'إنشاء'}
        </Button>
      </div>
    </div>
  );
}
