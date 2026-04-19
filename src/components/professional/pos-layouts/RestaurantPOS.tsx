
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  Plus, Minus, Trash2, Receipt, Send, Pause,
  Hash, User, Phone, MapPin, StickyNote, Percent,
  ChefHat, Clock, AlertCircle, CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  OrderTypeSelector, 
  QuickActionsBar,
  BusinessHeader 
} from '../BusinessLayoutEngine';
import { getBusinessConfig, type BusinessType } from '@/lib/businessTypes';

// Types
interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  available: boolean;
}

interface CartItem {
  item: MenuItem;
  qty: number;
  modifiers?: string[];
  notes?: string;
}

interface RestaurantPOSProps {
  businessType: BusinessType;
  menuItems: MenuItem[];
  categories: string[];
  tables: { number: number; status: 'available' | 'occupied' | 'reserved' }[];
  currency: string;
  onCheckout: (data: any) => void;
  onHold: () => void;
}

export function RestaurantPOS({
  businessType,
  menuItems,
  categories,
  tables,
  currency,
  onCheckout,
  onHold
}: RestaurantPOSProps) {
  const config = getBusinessConfig(businessType);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [orderType, setOrderType] = useState(config.orderTypes[0].id);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableNumber, setTableNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [discount, setDiscount] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');

  // Filter items
  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      if (!item.available) return false;
      if (activeCategory !== 'all' && item.category !== activeCategory) return false;
      if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [menuItems, activeCategory, searchQuery]);

  // Cart calculations
  const cartSubtotal = cart.reduce((sum, c) => sum + c.item.price * c.qty, 0);
  const discountAmount = discountType === 'percent' 
    ? cartSubtotal * (Number(discount) || 0) / 100
    : Number(discount) || 0;
  const cartTotal = Math.max(0, cartSubtotal - discountAmount);

  // Cart actions
  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.item.id === item.id);
      if (existing) {
        return prev.map(c => c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, { item, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.item.id === id) {
        const newQty = Math.max(0, c.qty + delta);
        return { ...c, qty: newQty };
      }
      return c;
    }).filter(c => c.qty > 0));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(c => c.item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    setTableNumber('');
    setCustomerName('');
    setCustomerPhone('');
    setDeliveryAddress('');
    setOrderNotes('');
    setDiscount('');
  };

  const selectedTable = tables.find(t => t.number === Number(tableNumber));
  const currentOrderType = config.orderTypes.find(t => t.id === orderType);

  return (
    <div className="flex flex-col lg:flex-row h-full gap-4">
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Table Grid - Only for dine_in */}
        {orderType === 'dine_in' && config.posLayout.showTableGrid && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 bg-card rounded-xl border"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium flex items-center gap-2">
                <Hash className="w-4 h-4 text-muted-foreground" />
                اختيار الطاولة
              </h3>
              {selectedTable && (
                <Badge variant={selectedTable.status === 'available' ? 'default' : 'secondary'}>
                  {selectedTable.status === 'available' ? 'متاحة' : 'مشغولة'}
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
              {tables.map((table) => (
                <motion.button
                  key={table.number}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setTableNumber(String(table.number))}
                  className={cn(
                    "aspect-square rounded-lg flex flex-col items-center justify-center gap-1 text-xs",
                    tableNumber === String(table.number)
                      ? "bg-primary text-primary-foreground"
                      : table.status === 'occupied'
                      ? "bg-amber-100 text-amber-700"
                      : table.status === 'reserved'
                      ? "bg-blue-100 text-blue-700"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  <span className="font-bold">{table.number}</span>
                  <span className="text-[8px] opacity-70">
                    {table.status === 'available' ? 'فارغة' : 
                     table.status === 'occupied' ? 'مشغولة' : 'محجوزة'}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Order Type & Quick Actions */}
        <div className="mb-4 space-y-3">
          <OrderTypeSelector 
            businessType={businessType}
            currentType={orderType}
            onChange={setOrderType}
          />
          <QuickActionsBar
            businessType={businessType}
            onAction={(action) => {
              if (action === 'hold') onHold();
            }}
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          <button
            onClick={() => setActiveCategory('all')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-all",
              activeCategory === 'all'
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            )}
          >
            الكل
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-all",
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={config.placeholders.search}
            className="w-full px-4 py-3 rounded-lg bg-background border text-sm pr-10"
          />
        </div>

        {/* Items Grid */}
        <div className={cn(
          "grid gap-3 content-start",
          config.posLayout.itemGridCols === 3 && "grid-cols-2 sm:grid-cols-3",
          config.posLayout.itemGridCols === 4 && "grid-cols-2 sm:grid-cols-3 md:grid-cols-4",
          config.posLayout.itemGridCols === 5 && "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
          config.posLayout.itemGridCols === 6 && "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6"
        )}>
          {filteredItems.map((item, index) => (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => addToCart(item)}
              className="bg-card border rounded-xl p-3 text-right hover:border-primary/50 transition-colors"
            >
              <div className="text-3xl mb-2">{item.image}</div>
              <p className="font-medium text-sm truncate">{item.name}</p>
              <p className="text-primary font-bold text-sm mt-1">
                {item.price} {currency}
              </p>
            </motion.button>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            لا توجد نتائج
          </div>
        )}
      </div>

      {/* Cart Panel */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full lg:w-96 bg-card border rounded-xl flex flex-col overflow-hidden"
      >
        {/* Cart Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-bold flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              الفاتورة
              {cart.length > 0 && (
                <Badge variant="secondary">{cart.length}</Badge>
              )}
            </h3>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-destructive text-sm hover:underline"
              >
                مسح
              </button>
            )}
          </div>

          {/* Order Details */}
          <div className="space-y-2 text-sm">
            {currentOrderType?.requiresTable && (
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-muted-foreground" />
                <Input
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="رقم الطاولة"
                  className="flex-1 h-8"
                  type="number"
                />
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder={config.placeholders.customer}
                className="flex-1 h-8"
              />
            </div>

            {(currentOrderType?.requiresPhone || orderType === 'delivery') && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="رقم الهاتف"
                  className="flex-1 h-8"
                />
              </div>
            )}

            {currentOrderType?.requiresAddress && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <Input
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder={config.placeholders.address}
                  className="flex-1 h-8"
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <StickyNote className="w-4 h-4 text-muted-foreground" />
              <Input
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder={config.placeholders.notes}
                className="flex-1 h-8"
              />
            </div>
          </div>
        </div>

        {/* Cart Items */}
        <ScrollArea className="flex-1 p-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <Receipt className="w-12 h-12 mb-2 opacity-20" />
              <p>السلة فارغة</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((cartItem) => (
                <motion.div
                  key={cartItem.item.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-3 bg-muted/50 rounded-lg p-3"
                >
                  <span className="text-2xl">{cartItem.item.image}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{cartItem.item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(cartItem.item.price * cartItem.qty).toFixed(2)} {currency}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQty(cartItem.item.id, -1)}
                      className="w-7 h-7 rounded-md bg-background flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      {cartItem.qty === 1 ? <Trash2 className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                    </button>
                    <span className="w-8 text-center font-medium text-sm">{cartItem.qty}</span>
                    <button
                      onClick={() => updateQty(cartItem.item.id, 1)}
                      className="w-7 h-7 rounded-md bg-background flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Cart Footer */}
        <div className="p-4 border-t space-y-3">
          {/* Discount */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="خصم"
                className="pr-10"
                type="number"
              />
            </div>
            <div className="flex rounded-lg border overflow-hidden">
              <button
                onClick={() => setDiscountType('percent')}
                className={cn(
                  "px-3 py-2 text-xs transition-colors",
                  discountType === 'percent' ? "bg-primary text-primary-foreground" : "bg-muted"
                )}
              >
                %
              </button>
              <button
                onClick={() => setDiscountType('fixed')}
                className={cn(
                  "px-3 py-2 text-xs transition-colors",
                  discountType === 'fixed' ? "bg-primary text-primary-foreground" : "bg-muted"
                )}
              >
                {currency}
              </button>
            </div>
          </div>

          {/* Totals */}
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>المجموع الفرعي</span>
              <span>{cartSubtotal.toFixed(2)} {currency}</span>
            </div>
          )}
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm text-emerald-600">
              <span>الخصم</span>
              <span>-{discountAmount.toFixed(2)} {currency}</span>
            </div>
          )}
          <div className="flex justify-between font-display font-bold text-lg">
            <span>الإجمالي</span>
            <span className="text-primary">{cartTotal.toFixed(2)} {currency}</span>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={() => onCheckout({ sendToPrep: true })}
              disabled={cart.length === 0}
              className="bg-primary hover:bg-primary/90"
            >
              <ChefHat className="w-4 h-4 ml-1" />
              للمطبخ
            </Button>
            <Button
              onClick={() => onCheckout({ sendToPrep: false })}
              disabled={cart.length === 0}
              className="bg-emerald-500 hover:bg-emerald-600"
            >
              <CheckCircle className="w-4 h-4 ml-1" />
              بيع
            </Button>
            <Button
              variant="outline"
              onClick={onHold}
              disabled={cart.length === 0}
            >
              <Pause className="w-4 h-4 ml-1" />
              تعليق
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default RestaurantPOS;
