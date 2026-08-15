// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit2, Save, X, Package, ShoppingCart, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/AuthContext';

interface ServicePackage {
  id: string;
  name: string;
  description: string;
  price: number;
  items: { id: string; name: string; price: number; quantity: number }[];
  is_active: boolean;
  created_at: string;
  restaurant_id: string;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category?: string;
}

export const ServicePackages = () => {
  const { user } = useAuth();
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<ServicePackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [databaseMode, setDatabaseMode] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [selectedItems, setSelectedItems] = useState<{ item_id: string; quantity: number }[]>([]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: restaurantData } = await supabase
        .from('restaurants')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!restaurantData) return;

      // Load menu items with a bounded query.
      const { data: itemsData } = await supabase
        .from('menu_items')
        .select('id, name, price, category')
        .eq('restaurant_id', restaurantData.id)
        .eq('available', true)
        .limit(1000);

      setMenuItems(itemsData || []);

      // Database persistence is authoritative after the service foundation migration.
      const { data: dbPackages, error: dbError } = await (supabase as any)
        .from('service_packages')
        .select('id, restaurant_id, name, description, price, is_active, created_at, service_package_items(id, menu_item_id, service_name, unit_price, quantity)')
        .eq('restaurant_id', restaurantData.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(500);

      if (!dbError) {
        setDatabaseMode(true);
        setPackages((dbPackages || []).map((pkg: any) => ({
          ...pkg,
          price: Number(pkg.price || 0),
          items: (pkg.service_package_items || []).map((item: any) => ({
            id: item.menu_item_id || item.id,
            name: item.service_name,
            price: Number(item.unit_price || 0),
            quantity: Number(item.quantity || 1),
          })),
        })));
      } else {
        // Compatibility fallback for tenants that have not applied the migration yet.
        setDatabaseMode(false);
        const savedPackages = localStorage.getItem(`service_packages_${restaurantData.id}`);
        setPackages(savedPackages ? JSON.parse(savedPackages) : []);
        console.warn('Service packages database migration unavailable:', dbError.message);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const savePackage = async () => {
    if (!formName || !formPrice) {
      toast.error('يرجى إكمال الحقول المطلوبة');
      return;
    }

    const { data: restaurantData } = await supabase
      .from('restaurants')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!restaurantData) return;

    const selectedPackageItems = selectedItems.map(si => {
      const item = menuItems.find(i => i.id === si.item_id);
      return {
        menu_item_id: item?.id || null,
        service_name: item?.name || 'خدمة',
        unit_price: Number(item?.price || 0),
        quantity: si.quantity,
      };
    });

    if (databaseMode) {
      let packageId = editingPackage?.id;
      if (editingPackage) {
        const { error } = await (supabase as any)
          .from('service_packages')
          .update({ name: formName, description: formDescription, price: Number(formPrice), updated_at: new Date().toISOString() })
          .eq('id', editingPackage.id)
          .eq('restaurant_id', restaurantData.id);
        if (error) throw error;
        await (supabase as any).from('service_package_items').delete().eq('package_id', editingPackage.id);
      } else {
        const { data: inserted, error } = await (supabase as any)
          .from('service_packages')
          .insert({ restaurant_id: restaurantData.id, name: formName, description: formDescription, price: Number(formPrice), is_active: true })
          .select('id')
          .single();
        if (error) throw error;
        packageId = inserted.id;
      }
      if (selectedPackageItems.length > 0) {
        const { error: itemError } = await (supabase as any)
          .from('service_package_items')
          .insert(selectedPackageItems.map(item => ({ ...item, package_id: packageId })));
        if (itemError) throw itemError;
      }
      toast.success(editingPackage ? 'تم تحديث الحزمة في قاعدة البيانات' : 'تم إنشاء الحزمة في قاعدة البيانات');
      await loadData();
    } else {
      const newPackage: ServicePackage = {
        id: editingPackage ? editingPackage.id : Date.now().toString(),
        name: formName,
        description: formDescription,
        price: Number(formPrice),
        items: selectedItems.map(si => {
          const item = menuItems.find(i => i.id === si.item_id);
          return { id: item!.id, name: item!.name, price: item!.price, quantity: si.quantity };
        }),
        is_active: true,
        created_at: editingPackage ? editingPackage.created_at : new Date().toISOString(),
        restaurant_id: restaurantData.id
      };
      const updatedPackages = editingPackage
        ? packages.map(p => p.id === editingPackage.id ? newPackage : p)
        : [...packages, newPackage];
      setPackages(updatedPackages);
      localStorage.setItem(`service_packages_${restaurantData.id}`, JSON.stringify(updatedPackages));
      toast.success(editingPackage ? 'تم تحديث الحزمة محلياً مؤقتاً' : 'تم إنشاء الحزمة محلياً مؤقتاً');
    }
    closeModal();
  };

  const deletePackage = async (pkg: ServicePackage) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الحزمة؟')) return;

    const { data: restaurantData } = await supabase
      .from('restaurants')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!restaurantData) return;

    if (databaseMode) {
      const { error } = await (supabase as any)
        .from('service_packages')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', pkg.id)
        .eq('restaurant_id', restaurantData.id);
      if (error) { toast.error('فشل تعطيل الحزمة: ' + error.message); return; }
      setPackages(prev => prev.filter(p => p.id !== pkg.id));
      toast.success('تم تعطيل الحزمة مع الحفاظ على سجلها');
      return;
    }
    const updatedPackages = packages.filter(p => p.id !== pkg.id);
    setPackages(updatedPackages);
    localStorage.setItem(`service_packages_${restaurantData.id}`, JSON.stringify(updatedPackages));
    toast.success('تم حذف الحزمة محلياً مؤقتاً');
  };

  const openModal = (pkg: ServicePackage | null = null) => {
    setEditingPackage(pkg);
    if (pkg) {
      setFormName(pkg.name);
      setFormDescription(pkg.description);
      setFormPrice(pkg.price.toString());
      setSelectedItems(pkg.items.map(i => ({ item_id: i.id, quantity: i.quantity })));
    } else {
      setFormName('');
      setFormDescription('');
      setFormPrice('');
      setSelectedItems([]);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPackage(null);
  };

  const addItemToPackage = (itemId: string) => {
    const existing = selectedItems.find(si => si.item_id === itemId);
    if (existing) {
      setSelectedItems(selectedItems.map(si => si.item_id === itemId ? { ...si, quantity: si.quantity + 1 } : si));
    } else {
      setSelectedItems([...selectedItems, { item_id, quantity: 1 }]);
    }
  };

  const removeItemFromPackage = (itemId: string) => {
    setSelectedItems(selectedItems.filter(si => si.item_id !== itemId));
  };

  const updateItemQuantity = (itemId: string, delta: number) => {
    setSelectedItems(selectedItems.map(si => {
      if (si.item_id === itemId) {
        const newQty = Math.max(1, si.quantity + delta);
        return { ...si, quantity: newQty };
      }
      return si;
    }));
  };

  const getSelectedItemsTotal = () => {
    return selectedItems.reduce((sum, si) => {
      const item = menuItems.find(i => i.id === si.item_id);
      return sum + (item ? item.price * si.quantity : 0);
    }, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">حزم الخدمات</h1>
          <p className="text-muted-foreground">إنشاء حزم خدمات متكاملة بسعر ثابت</p>
        </div>
        <Button onClick={() => openModal()}>
          <Plus className="ml-2 h-4 w-4" />
          إنشاء حزمة جديدة
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages.map(pkg => (
          <Card key={pkg.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{pkg.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{pkg.description}</p>
                </div>
                <Badge variant="default">
                  حزمة
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{pkg.price} ج.م</span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openModal(pkg)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deletePackage(pkg)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="border-t pt-3">
                  <p className="text-sm font-medium mb-2">المكونات:</p>
                  <ul className="space-y-1">
                    {pkg.items.map(item => (
                      <li key={item.id} className="text-sm text-muted-foreground flex justify-between">
                        <span>{item.quantity}x {item.name}</span>
                        <span>{item.price * item.quantity} ج.م</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {packages.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">لا توجد حزم خدمات بعد</h3>
          <p className="text-muted-foreground mb-4">ابدأ بإنشاء حزمة خدمات أولى</p>
          <Button onClick={() => openModal()}>
            <Plus className="ml-2 h-4 w-4" />
            إنشاء حزمة
          </Button>
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingPackage ? 'تعديل الحزمة' : 'إنشاء حزمة جديدة'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">اسم الحزمة</label>
              <Input
                placeholder="مثال: حزمة تنظيف كاملة"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">الوصف</label>
              <Input
                placeholder="وصف مختصر للحزمة"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">سعر الحزمة</label>
              <Input
                type="number"
                placeholder="0.00"
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">إضافة خدمات إلى الحزمة</label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
                {menuItems.map(item => (
                  <Button
                    key={item.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => addItemToPackage(item.id)}
                    className="justify-start"
                  >
                    <ShoppingCart className="h-4 w-4 ml-2" />
                    {item.name} - {item.price} ج.م
                  </Button>
                ))}
              </div>
            </div>
            {selectedItems.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2">الخدمات المختارة:</label>
                <div className="space-y-2 border rounded-lg p-3">
                  {selectedItems.map(si => {
                    const item = menuItems.find(i => i.id === si.item_id);
                    return (
                      <div key={si.item_id} className="flex items-center justify-between">
                        <span>{item?.name}</span>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => updateItemQuantity(si.item_id, -1)}>-</Button>
                          <span className="w-8 text-center">{si.quantity}</span>
                          <Button variant="ghost" size="sm" onClick={() => updateItemQuantity(si.item_id, 1)}>+</Button>
                          <Button variant="ghost" size="sm" onClick={() => removeItemFromPackage(si.item_id)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  <div className="border-t pt-2 flex justify-between font-medium">
                    <span>إجمالي الأسعار الفردية:</span>
                    <span>{getSelectedItemsTotal()} ج.م</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={closeModal}>إلغاء</Button>
            <Button onClick={savePackage}>
              <Save className="ml-2 h-4 w-4" />
              {editingPackage ? 'تحديث' : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
