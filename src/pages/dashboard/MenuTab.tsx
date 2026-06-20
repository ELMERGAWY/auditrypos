import { useRef, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Upload, Plus, Save, Trash2, Edit, ToggleLeft, ToggleRight, FileSpreadsheet, Image, ChefHat, Package } from 'lucide-react';
import { RecipeManager } from './RecipeManager';
import * as XLSX from 'xlsx';
import type { MenuItem, Restaurant } from './types';
import { AnimatePresence, motion } from 'framer-motion';
import { getItemIconOptions, getDefaultItemIcon, isInventoryDrivenBusiness, type BusinessType, BUSINESS_TYPES } from '@/lib/businessTypes';

export interface MenuFormState {
  name: string;
  price: string;
  category: string;
  image: string;
  icon_url: string;
  product_type: string;
  pricing_method: string;
  profit_margin_percent: string;
  product_id?: string;
}

interface Props {
  restaurant: Restaurant;
  menuItems: MenuItem[];
  setMenuItems: (items: MenuItem[]) => void;
  loadData: () => void;
}

export function MenuTab({
  restaurant, menuItems, setMenuItems, loadData
}: Props) {
  if (!restaurant) return <div className="p-8 text-center">جاري تحميل بيانات النشاط...</div>;
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const businessType = (restaurant.business_type || 'restaurant') as BusinessType;
  const btConfig = BUSINESS_TYPES[businessType] || BUSINESS_TYPES.other;
  const EMOJI_OPTIONS = getItemIconOptions(businessType);
  const defaultIcon = getDefaultItemIcon(businessType);

  const categories = [...new Set(menuItems.map(i => i.category))];

  // Local state for the form
  const [showAddItem, setShowAddItem] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [menuForm, setMenuForm] = useState<MenuFormState>({
    name: '',
    price: '',
    category: '',
    image: defaultIcon,
    icon_url: '',
    product_type: 'inventory',
    pricing_method: 'fixed',
    profit_margin_percent: '30',
    product_id: ''
  });

  // Inventory products for auto-complete
  const [inventoryProducts, setInventoryProducts] = useState<Array<{id: string; name: string; price: number; cost_price: number; unit: string; category: string}>>([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  // Load inventory products when form opens
  useEffect(() => {
    if (showAddItem && menuForm.product_type === 'inventory') {
      loadInventoryProducts();
    }
  }, [showAddItem, menuForm.product_type]);

  const loadInventoryProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('id, name, price, cost_price, unit, category')
      .eq('restaurant_id', restaurant.id)
      .eq('available', true)
      .order('name');
    setInventoryProducts(data || []);
  };

  const selectInventoryProduct = (product: typeof inventoryProducts[0]) => {
    setMenuForm({
      ...menuForm,
      name: product.name,
      price: String(product.price),
      category: product.category || 'عام',
      product_id: product.id,
      // If pricing_method is cost_plus, calculate from cost_price
      ...(menuForm.pricing_method === 'cost_plus' && {
        price: String(product.cost_price * (1 + Number(menuForm.profit_margin_percent) / 100))
      })
    });
    setShowProductDropdown(false);
    setProductSearch('');
  };

  const resetForm = () => {
    setMenuForm({
      name: '',
      price: '',
      category: '',
      image: defaultIcon,
      icon_url: '',
      product_type: 'inventory',
      pricing_method: 'fixed',
      profit_margin_percent: '30',
      product_id: ''
    });
    setShowAddItem(false);
    setEditingItem(null);
    setProductSearch('');
    setShowProductDropdown(false);
  };

  const handleSaveItem = async () => {
    if (!menuForm.name || !menuForm.price || !menuForm.category) {
      toast.error('يرجى ملء جميع الحقول');
      return;
    }

    const isInventoryBusiness = isInventoryDrivenBusiness(businessType);
    const targetTable = isInventoryBusiness ? 'products' : 'menu_items';

    const payload = {
      name: menuForm.name,
      price: Number(menuForm.price),
      category: menuForm.category,
      image: menuForm.image,
      icon_url: menuForm.icon_url || null,
      available: true,
      ...(isInventoryBusiness ? {
        cost_price: menuForm.product_type === 'inventory' ? (inventoryProducts.find(p => p.id === menuForm.product_id)?.cost_price || 0) : 0,
        restaurant_id: restaurant.id
      } : {
        restaurant_id: restaurant.id,
        product_type: menuForm.product_type,
        pricing_method: menuForm.pricing_method,
        profit_margin_percent: Number(menuForm.profit_margin_percent),
        product_id: (menuForm.product_type === 'inventory' && menuForm.product_id) ? menuForm.product_id : null,
      })
    };

    if (editingItem) {
      const { error } = await supabase.from(targetTable).update(payload).eq('id', editingItem.id);
      if (error) { 
        console.error('Save error:', error);
        toast.error('خطأ في التحديث: ' + error.message); 
        return; 
      }
      toast.success('تم تحديث العنصر');
    } else {
      const { error } = await supabase.from(targetTable).insert(payload);
      if (error) { 
        console.error('Save error:', error);
        toast.error('خطأ في الإضافة: ' + error.message); 
        return; 
      }
      toast.success('تم إضافة العنصر');
    }
    resetForm();
    loadData();
  };

  const handleDeleteItem = async (id: string) => {
    const isInventoryBusiness = isInventoryDrivenBusiness(businessType);
    const targetTable = isInventoryBusiness ? 'products' : 'menu_items';
    
    await supabase.from(targetTable).delete().eq('id', id);
    setMenuItems(menuItems.filter(i => i.id !== id));
    toast.success('تم حذف العنصر');
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    const isInventoryBusiness = isInventoryDrivenBusiness(businessType);
    const targetTable = isInventoryBusiness ? 'products' : 'menu_items';
    
    await supabase.from(targetTable).update({ available: !item.available }).eq('id', item.id);
    setMenuItems(menuItems.map(i => i.id === item.id ? { ...i, available: !i.available } : i));
  };

  const startEdit = (item: MenuItem) => {
    setEditingItem(item);
    setMenuForm({
      name: item.name,
      price: String(item.price),
      category: item.category,
      image: item.image,
      icon_url: (item as any).icon_url || '',
      product_type: (item as any).product_type || 'inventory',
      pricing_method: (item as any).pricing_method || 'fixed',
      profit_margin_percent: String((item as any).profit_margin_percent || 30),
      product_id: (item as any).product_id || ''
    });
    setShowAddItem(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Recipe Manager
  const [recipeModalItem, setRecipeModalItem] = useState<MenuItem | null>(null);

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
          <p className="font-bold mb-1">شعار {btConfig?.label || 'النشاط'}</p>
          <p className="text-xs text-muted-foreground mb-2">يظهر في الفاتورة وواجهة المتجر</p>
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
        <h2 className="font-display text-xl font-bold">إدارة {btConfig?.labels?.menu || 'القائمة'} ({menuItems.length} {btConfig?.labels?.item || 'عنصر'})</h2>
        <Button onClick={() => { resetForm(); setShowAddItem(true); }} className="gradient-bg text-primary-foreground border-0">
          <Plus className="w-4 h-4 ml-1" /> إضافة {btConfig?.labels?.item || 'عنصر'}
        </Button>
      </div>

      <AnimatePresence>
        {showAddItem && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="glass-card p-4 mb-4 space-y-3">
              <h3 className="font-display font-bold">{editingItem ? `تعديل ${btConfig?.labels?.item || 'العنصر'}` : `إضافة ${btConfig?.labels?.item || 'عنصر'} جديد`}</h3>
              {/* STEP 1: Product Type - AT THE TOP */}
              <div className="bg-primary/5 rounded-lg p-3 mb-4">
                <Label className="font-bold text-primary">نوع المنتج *</Label>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setMenuForm({ ...menuForm, product_type: 'inventory' })}
                    className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                      menuForm.product_type === 'inventory' 
                        ? 'border-primary bg-primary text-primary-foreground' 
                        : 'border-border bg-background hover:border-primary/50'
                    }`}
                  >
                    📦 منتج من المخزون
                  </button>
                  <button
                    type="button"
                    onClick={() => setMenuForm({ ...menuForm, product_type: 'manufactured' })}
                    className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                      menuForm.product_type === 'manufactured' 
                        ? 'border-primary bg-primary text-primary-foreground' 
                        : 'border-border bg-background hover:border-primary/50'
                    }`}
                  >
                    🏭 منتج مصنع (Recipe)
                  </button>
                </div>
              </div>

              {/* STEP 2: Inventory Product Selector (if inventory type) */}
              {menuForm.product_type === 'inventory' && (
                <div className="mb-4 relative">
                  <Label className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" />
                    اختر منتج من المخزون
                  </Label>
                  <div className="relative">
                    <Input
                      value={productSearch}
                      onChange={e => {
                        setProductSearch(e.target.value);
                        setShowProductDropdown(true);
                      }}
                      onFocus={() => setShowProductDropdown(true)}
                      placeholder="اكتب اسم المنتج..."
                      className="mt-1"
                    />
                    {showProductDropdown && inventoryProducts.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {inventoryProducts
                          .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                          .slice(0, 10)
                          .map(product => (
                            <button
                              key={product.id}
                              onClick={() => selectInventoryProduct(product)}
                              className="w-full px-4 py-2 text-right hover:bg-primary/10 transition-colors flex items-center justify-between"
                            >
                              <div>
                                <p className="font-medium">{product.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  تكلفة: {product.cost_price} ج | بيع: {product.price} ج
                                </p>
                              </div>
                              <span className="text-xs bg-primary/10 px-2 py-1 rounded">
                                {product.unit}
                              </span>
                            </button>
                          ))}
                        {inventoryProducts.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).length === 0 && (
                          <p className="px-4 py-2 text-muted-foreground text-center">لا توجد منتجات مطابقة</p>
                        )}
                      </div>
                    )}
                  </div>
                  {menuForm.product_id && (
                    <p className="text-xs text-success mt-1">
                      ✅ تم ربط المنتج بالمخزون (ID: {menuForm.product_id.slice(0, 8)}...)
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Name - now readonly if inventory product selected */}
                <div>
                  <Label>اسم {btConfig?.labels?.item || 'العنصر'}</Label>
                  <Input 
                    value={menuForm.name} 
                    onChange={e => setMenuForm({ ...menuForm, name: e.target.value })} 
                    placeholder={`مثال: ${businessType === 'services' ? 'غسيل وكوي' : businessType === 'pharmacy' ? 'باراسيتامول' : 'منتج جديد'}`}
                    readOnly={menuForm.product_type === 'inventory' && !!menuForm.product_id}
                    className={menuForm.product_type === 'inventory' && !!menuForm.product_id ? 'bg-muted' : ''}
                  />
                </div>

                <div><Label>السعر ({restaurant.currency || 'ج.م'})</Label><Input type="number" value={menuForm.price} onChange={e => setMenuForm({ ...menuForm, price: e.target.value })} placeholder="0" /></div>
                <div>
                  <Label>الفئة</Label>
                  <Input value={menuForm.category} onChange={e => setMenuForm({ ...menuForm, category: e.target.value })} placeholder="مثال: Burgers" list="cat-list" />
                  <datalist id="cat-list">{categories.map(c => <option key={c} value={c} />)}</datalist>
                </div>
                <div>
                  <Label>الأيقونة (اختياري)</Label>
                  <div className="flex gap-1 flex-wrap mt-1">
                    {EMOJI_OPTIONS.map(e => (
                      <button key={e} onClick={() => setMenuForm({ ...menuForm, image: e })}
                        className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-colors ${menuForm.image === e ? 'bg-primary/20 ring-2 ring-primary' : 'bg-secondary'}`}>{e}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>أيقونة مخصصة (اختياري)</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={menuForm.icon_url}
                      onChange={e => setMenuForm({ ...menuForm, icon_url: e.target.value })}
                      placeholder="رابط صورة الأيقونة"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = async (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (!file) return;

                          const ext = file.name.split('.').pop();
                          const path = `product-icons/${restaurant.id}/${Date.now()}.${ext}`;

                          toast.info('جاري رفع الأيقونة...');
                          const { error: uploadError } = await supabase.storage.from('restaurant-assets').upload(path, file);
                          if (uploadError) {
                            toast.error('خطأ في رفع الأيقونة');
                            return;
                          }

                          const { data: { publicUrl } } = supabase.storage.from('restaurant-assets').getPublicUrl(path);
                          setMenuForm({ ...menuForm, icon_url: publicUrl });
                          toast.success('تم رفع الأيقونة بنجاح');
                        };
                        input.click();
                      }}
                    >
                      <Upload className="w-3 h-3 ml-1" /> رفع
                    </Button>
                  </div>
                  {menuForm.icon_url && (
                    <div className="mt-2">
                      <img src={menuForm.icon_url} alt="icon preview" className="w-8 h-8 object-contain rounded" />
                    </div>
                  )}
                </div>
                
                {/* Pricing Method */}
                <div>
                  <Label>طريقة التسعير</Label>
                  <select
                    value={menuForm.pricing_method}
                    onChange={e => setMenuForm({ ...menuForm, pricing_method: e.target.value })}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="fixed">سعر ثابت</option>
                    <option value="cost_plus">تكلفة + نسبة ربح</option>
                  </select>
                </div>
                
                {/* Profit Margin (only for cost_plus) */}
                {menuForm.pricing_method === 'cost_plus' && (
                  <div>
                    <Label>نسبة الربح (%)</Label>
                    <Input 
                      type="number" 
                      value={menuForm.profit_margin_percent} 
                      onChange={e => setMenuForm({ ...menuForm, profit_margin_percent: e.target.value })} 
                      placeholder="30"
                    />
                  </div>
                )}
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
                <p className="text-sm text-primary font-bold">{Number(item.price).toFixed(2)} {restaurant.currency || 'ج.م'}</p>
              </div>
              <Badge className={item.available ? 'status-active' : 'status-suspended'}>{item.available ? 'متاح' : 'غير متاح'}</Badge>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => startEdit(item)}><Edit className="w-3 h-3 ml-1" /> تعديل</Button>
              {btConfig?.features?.includes('recipes') && (
                <Button size="sm" variant="outline" onClick={() => setRecipeModalItem(item)}>
                  <ChefHat className="w-3 h-3 ml-1" /> تكلفة
                </Button>
              )}
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

      {/* Recipe Manager Modal */}
      {recipeModalItem && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setRecipeModalItem(null)}>
          <div onClick={e => e.stopPropagation()}>
            <RecipeManager
              menuItemId={recipeModalItem.id}
              menuItemName={recipeModalItem.name}
              sellingPrice={recipeModalItem.price}
              restaurantId={restaurant.id}
              currency={restaurant.currency || 'ج.م'}
              onClose={() => setRecipeModalItem(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
