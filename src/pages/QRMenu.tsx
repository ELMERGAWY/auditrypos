import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Bell, ChefHat } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MenuItem { id: string; name: string; price: number; category: string; image: string; }

const QRMenu = () => {
  const { restaurantId } = useParams();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCat, setSelectedCat] = useState('all');
  const [search, setSearch] = useState('');
  const [restaurantName, setRestaurantName] = useState('');

  useEffect(() => {
    if (!restaurantId) return;
    const load = async () => {
      const { data: rest } = await supabase.from('restaurants').select('name').eq('id', restaurantId).maybeSingle();
      if (rest) setRestaurantName(rest.name);

      const { data: menuData } = await supabase.from('public_menu_items' as any).select('*').eq('restaurant_id', restaurantId).order('sort_order');
      const menuItems = (menuData || []) as unknown as MenuItem[];
      setItems(menuItems);
      setCategories([...new Set(menuItems.map(i => i.category))]);
    };
    load();
  }, [restaurantId]);

  const filtered = items.filter(i => {
    if (selectedCat !== 'all' && i.category !== selectedCat) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const callWaiter = async () => {
    if (!restaurantId) return;
    const { error } = await supabase.from('waiter_calls').insert({
      restaurant_id: restaurantId,
      table_info: 'عميل من قائمة QR',
    });
    if (error) { toast.error('حدث خطأ'); return; }
    toast.success('تم استدعاء الويتر! سيصلك قريباً');
  };

  return (
    <div className="min-h-screen bg-background pb-24" dir="rtl">
      <div className="gradient-bg p-6 pb-10 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary-foreground/20 flex items-center justify-center"><ChefHat className="w-6 h-6 text-primary-foreground" /></div>
          <div><h1 className="font-display text-xl font-bold text-primary-foreground">{restaurantName || 'القائمة'}</h1><p className="text-sm text-primary-foreground/70">قائمة الطعام الرقمية</p></div>
        </div>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="ابحث عن طبق..." value={search} onChange={e => setSearch(e.target.value)} className="pr-10 bg-background/90 border-0" />
        </div>
      </div>

      <div className="flex gap-2 px-4 -mt-4 overflow-x-auto pb-2">
        <button onClick={() => setSelectedCat('all')} className={`px-4 py-2 rounded-full text-sm whitespace-nowrap shadow-sm transition-colors ${selectedCat === 'all' ? 'gradient-bg text-primary-foreground' : 'bg-card text-card-foreground border border-border'}`}>الكل</button>
        {categories.map(cat => <button key={cat} onClick={() => setSelectedCat(cat)} className={`px-4 py-2 rounded-full text-sm whitespace-nowrap shadow-sm transition-colors ${selectedCat === cat ? 'gradient-bg text-primary-foreground' : 'bg-card text-card-foreground border border-border'}`}>{cat}</button>)}
      </div>

      <div className="px-4 mt-4 space-y-3">
        {filtered.map((item, i) => (
          <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card p-4 flex items-center gap-4">
            <div className="text-4xl w-14 h-14 flex items-center justify-center rounded-xl bg-secondary">{item.image}</div>
            <div className="flex-1 min-w-0"><h3 className="font-medium">{item.name}</h3><p className="text-xs text-muted-foreground">{item.category}</p></div>
            <div className="text-left"><p className="font-display font-bold text-primary">{item.price} ج.م</p></div>
          </motion.div>
        ))}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-12">لا توجد نتائج</p>}
      </div>

      <motion.button whileTap={{ scale: 0.9 }} onClick={callWaiter} className="floating-btn flex items-center gap-2">
        <Bell className="w-6 h-6" /><span className="font-bold text-sm">استدعاء ويتر</span>
      </motion.button>
    </div>
  );
};

export default QRMenu;
