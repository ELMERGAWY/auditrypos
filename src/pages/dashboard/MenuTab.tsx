import { useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Upload, Plus, Save, Trash2, Edit, ToggleLeft, ToggleRight, FileSpreadsheet, Image } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { MenuItem, Restaurant } from './types';
import { AnimatePresence, motion } from 'framer-motion';
import { getItemIconOptions, getDefaultItemIcon, type BusinessType, BUSINESS_TYPES } from '@/lib/businessTypes';

interface Props {
  restaurant: Restaurant;
  menuItems: MenuItem[];
  setMenuItems: (items: MenuItem[]) => void;
  menuForm: { name: string; price: string; category: string; image: string };
  setMenuForm: (f: { name: string; price: string; category: string; image: string }) => void;
  showAddItem: boolean;
  setShowAddItem: (v: boolean) => void;
  editingItem: MenuItem | null;
  setEditingItem: (item: MenuItem | null) => void;
  loadData: () => void;
}

export function MenuTab({
  restaurant, menuItems, setMenuItems,
  menuForm, setMenuForm, showAddItem, setShowAddItem,
  editingItem, setEditingItem, loadData
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const businessType = (restaurant.business_type || 'restaurant') as BusinessType;
  const btConfig = BUSINESS_TYPES[businessType];
  const EMOJI_OPTIONS = getItemIconOptions(businessType);
  const defaultIcon = getDefaultItemIcon(businessType);

  const categories = [...new Set(menuItems.map(i => i.category))];

  const resetForm = () => {
    setMenuForm({ name: '', price: '', category: '', image: '🍔' });
    setShowAddItem(false);
    setEditingItem(null);
  };

  const handleSaveItem = async () => {
    if (!menuForm.name || !menuForm.price || !menuForm.category) {
      toast.error('يرجى ملء جميع الحقول');
      return;
    }
    if (editingItem) {
      const { error } = await supabase.from('menu_items').update({
        name: menuForm.name,
        price: Number(menuForm.price),
        category: menuForm.category,
        image: menuForm.image,
      }).eq('id', editingItem.id);
      if (error) { toast.error('خطأ في التحديث'); return; }
      toast.success('تم تحديث العنصر');
    } else {
      const { error } = await supabase.from('menu_items').insert({
        restaurant_id: restaurant.id,
        name: menuForm.name,
        price: Number(menuForm.price),
        category: menuForm.category,
        image: menuForm.image,
      });
      if (error) { toast.error('خطأ في الإضافة'); return; }
      toast.success('تم إضافة العنصر');
    }
    resetForm();
    loadData();
  };

  const handleDeleteItem = async (id: string) => {
    await supabase.from('menu_items').delete().eq('id', id);
    setMenuItems(menuItems.filter(i => i.id !== id));
    toast.success('تم حذف العنصر');
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    await supabase.from('menu_items').update({ available: !item.available }).eq('id', item.id);
    setMenuItems(menuItems.map(i => i.id === item.id ? { ...i, available: !i.available } : i));
  };

  const startEdit = (item: MenuItem) => {
    setEditingItem(item);
    setMenuForm({ name: item.name, price: String(item.price), category: item.category, image: item.image });
    setShowAddItem(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Bulk import via Excel/CSV
  const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    toast.info('جاري قراءة الملف...');
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<Record<string, string>>(ws);

    if (!data.length) { toast.error('الملف فارغ'); return; }

    // Accept columns: name/الاسم, price/السعر, category/الفئة, image/الايقونة
    const items = data.map(row => ({
      restaurant_id: restaurant.id,
      name: String(row['name'] || row['الاسم'] || row['Name'] || '').trim(),
      price: Number(row['price'] || row['السعر'] || row['Price'] || 0),
      category: String(row['category'] || row['الفئة'] || row['Category'] || 'عام').trim(),
      image: String(row['image'] || row['الايقونة'] || row['Image'] || '🍽️').trim(),
    })).filter(i => i.name && i.price > 0);

    if (!items.length) {
      toast.error('لم يتم العثور على بيانات صالحة. تأكد من وجود أعمدة: name, price, category');
      return;
    }

    const { error } = await supabase.from('menu_items').insert(items);
    if (error) { toast.error('خطأ في الاستيراد: ' + error.message); return; }

    toast.success(`تم استيراد ${items.length} عنصر بنجاح! 🎉`);
    loadData();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Logo upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop();
    const path = `logos/${restaurant.id}.${ext}`;

    toast.info('جاري رفع الشعار...');
    const { error: uploadError } = await supabase.storage.from('restaurant-assets').upload(path, file, { upsert: true });
    if (uploadError) { toast.error('خطأ في رفع الشعار'); return; }

    const { data: { publicUrl } } = supabase.storage.from('restaurant-assets').getPublicUrl(path);
    const { error } = await supabase.from('restaurants').update({ logo_url: publicUrl }).eq('id', restaurant.id);
    if (error) { toast.error('خطأ في حفظ الشعار'); return; }

    toast.success('تم رفع شعار المطعم بنجاح! 🎉');
    // Refresh page to show new logo
    setTimeout(() => loadData(), 500);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['name', 'price', 'category', 'image'],
      ['برجر كلاسيك', 45, 'برجر', '🍔'],
      ['بيتزا مارجريتا', 65, 'بيتزا', '🍕'],
      ['سلطة سيزر', 35, 'سلطات', '🥗'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Menu');
    XLSX.writeFile(wb, 'menu-template.xlsx');
  };

  return (
    <div className="p-4">
      {/* Logo Section */}
      <div className="glass-card p-4 mb-4 flex items-center gap-4">
        <div className="w-20 h-20 rounded-xl bg-secondary/50 flex items-center justify-center overflow-hidden border-2 border-dashed border-border">
          {restaurant.logo_url ? (
            <img src={restaurant.logo_url} alt="logo" className="w-full h-full object-contain" />
          ) : (
            <Image className="w-8 h-8 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1">
          <p className="font-bold mb-1">شعار المطعم</p>
          <p className="text-xs text-muted-foreground mb-2">يظهر في الفاتورة وواجهة QR</p>
          <Button size="sm" variant="outline" onClick={() => logoInputRef.current?.click()}>
            <Upload className="w-3 h-3 ml-1" /> رفع شعار
          </Button>
          <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
        </div>
      </div>

      {/* Bulk Import */}
      <div className="glass-card p-4 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <FileSpreadsheet className="w-5 h-5 text-primary" />
          <div>
            <p className="font-bold">استيراد المنيو بالجملة</p>
            <p className="text-xs text-muted-foreground">ارفع ملف Excel أو CSV يحتوي على: name, price, category, image</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={downloadTemplate}>
            <FileSpreadsheet className="w-3 h-3 ml-1" /> تحميل نموذج Excel
          </Button>
          <Button size="sm" className="gradient-bg text-primary-foreground border-0" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-3 h-3 ml-1" /> رفع ملف
          </Button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleBulkImport} />
        </div>
      </div>

      {/* Add/Edit Form */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl font-bold">إدارة القائمة ({menuItems.length} عنصر)</h2>
        <Button onClick={() => { resetForm(); setShowAddItem(true); }} className="gradient-bg text-primary-foreground border-0">
          <Plus className="w-4 h-4 ml-1" /> إضافة عنصر
        </Button>
      </div>

      <AnimatePresence>
        {showAddItem && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="glass-card p-4 mb-4 space-y-3">
              <h3 className="font-display font-bold">{editingItem ? 'تعديل العنصر' : 'إضافة عنصر جديد'}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>اسم العنصر</Label><Input value={menuForm.name} onChange={e => setMenuForm({ ...menuForm, name: e.target.value })} placeholder="مثال: برجر كلاسيك" /></div>
                <div><Label>السعر ({restaurant.currency || 'ج.م'})</Label><Input type="number" value={menuForm.price} onChange={e => setMenuForm({ ...menuForm, price: e.target.value })} placeholder="0" /></div>
                <div>
                  <Label>الفئة</Label>
                  <Input value={menuForm.category} onChange={e => setMenuForm({ ...menuForm, category: e.target.value })} placeholder="مثال: Burgers" list="cat-list" />
                  <datalist id="cat-list">{categories.map(c => <option key={c} value={c} />)}</datalist>
                </div>
                <div>
                  <Label>الأيقونة</Label>
                  <div className="flex gap-1 flex-wrap mt-1">
                    {EMOJI_OPTIONS.map(e => (
                      <button key={e} onClick={() => setMenuForm({ ...menuForm, image: e })}
                        className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-colors ${menuForm.image === e ? 'bg-primary/20 ring-2 ring-primary' : 'bg-secondary'}`}>{e}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveItem} className="gradient-bg text-primary-foreground border-0">
                  <Save className="w-4 h-4 ml-1" /> {editingItem ? 'حفظ التعديلات' : 'إضافة'}
                </Button>
                <Button variant="outline" onClick={resetForm}>إلغاء</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {menuItems.map(item => (
          <div key={item.id} className="glass-card p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{item.image}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{item.name}</p>
                <p className="text-xs text-muted-foreground">{item.category}</p>
                <p className="text-sm text-primary font-bold">{item.price} {restaurant.currency || 'ج.م'}</p>
              </div>
              <Badge className={item.available ? 'status-active' : 'status-suspended'}>{item.available ? 'متاح' : 'غير متاح'}</Badge>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => startEdit(item)}><Edit className="w-3 h-3 ml-1" /> تعديل</Button>
              <Button size="sm" variant="outline" onClick={() => handleToggleAvailability(item)}>
                {item.available ? <ToggleRight className="w-3 h-3 ml-1" /> : <ToggleLeft className="w-3 h-3 ml-1" />}
                {item.available ? 'إخفاء' : 'إظهار'}
              </Button>
              <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteItem(item.id)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
