
import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  Plus, Minus, Trash2, Receipt, CheckCircle, Pause,
  User, StickyNote, Percent, ScanLine, CreditCard,
  Calculator, Package, History, Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  OrderTypeSelector, 
  QuickActionsBar,
  FeatureGate
} from '../BusinessLayoutEngine';
import { getBusinessConfig, hasFeature, type BusinessType } from '@/lib/businessTypes';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  barcode?: string;
  sku?: string;
  available: boolean;
  stock?: number;
  variants?: { name: string; value: string; price_adjustment: number }[];
}

interface CartItem {
  item: Product;
  qty: number;
  selectedVariant?: string;
  discount?: number;
}

interface RetailPOSProps {
  businessType: BusinessType;
  products: Product[];
  categories: string[];
  currency: string;
  onCheckout: (data: any) => void;
  onHold: () => void;
  onBarcodeScan?: (barcode: string) => void;
  recentCustomers?: { id: string; name: string; phone: string; credit_balance: number }[];
}

export function RetailPOS({
  businessType,
  products,
  categories,
  currency,
  onCheckout,
  onHold,
  onBarcodeScan,
  recentCustomers = []
}: RetailPOSProps) {
  const config = getBusinessConfig(businessType);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [orderType, setOrderType] = useState(config.orderTypes[0].id);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [discount, setDiscount] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paidAmount, setPaidAmount] = useState('');

  // Auto-focus barcode input
  useEffect(() => {
    if (config.posLayout.showBarcodeScanner) {
      barcodeInputRef.current?.focus();
    }
  }, [config.posLayout.showBarcodeScanner]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      if (!product.available) return false;
      if (activeCategory !== 'all' && product.category !== activeCategory) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          product.name.toLowerCase().includes(q) ||
          product.barcode?.includes(q) ||
          product.sku?.includes(q)
        );
      }
      return true;
    });
  }, [products, activeCategory, searchQuery]);

  // Cart calculations
  const cartSubtotal = cart.reduce((sum, c) => {
    const variantPrice = c.selectedVariant 
      ? c.item.variants?.find(v => v.name === c.selectedVariant)?.price_adjustment || 0
      : 0;
    return sum + (c.item.price + variantPrice) * c.qty;
  }, 0);
  const discountAmount = discountType === 'percent' 
    ? cartSubtotal * (Number(discount) || 0) / 100
    : Number(discount) || 0;
  const cartTotal = Math.max(0, cartSubtotal - discountAmount);
  const paid = Number(paidAmount) || 0;
  const change = Math.max(0, paid - cartTotal);
  const remaining = Math.max(0, cartTotal - paid);

  // Cart actions
  const addToCart = (product: Product, variant?: string) => {
    setCart(prev => {
      const existing = prev.find(c => c.item.id === product.id && c.selectedVariant === variant);
      if (existing) {
        return prev.map(c => 
          c.item.id === product.id && c.selectedVariant === variant
            ? { ...c, qty: c.qty + 1 }
            : c
        );
      }
      return [...prev, { item: product, qty: 1, selectedVariant: variant }];
    });
  };

  const updateQty = (id: string, variant: string | undefined, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.item.id === id && c.selectedVariant === variant) {
        const newQty = Math.max(0, c.qty + delta);
        return { ...c, qty: newQty };
      }
      return c;
    }).filter(c => c.qty > 0));
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    
    // Find product by barcode
    const product = products.find(p => p.barcode === barcodeInput.trim());
    if (product) {
      addToCart(product);
      setBarcodeInput('');
    } else {
      onBarcodeScan?.(barcodeInput.trim());
    }
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setOrderNotes('');
    setDiscount('');
    setPaidAmount('');
  };

  const selectCustomer = (customer: typeof recentCustomers[0]) => {
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone);
    setShowCustomerSearch(false);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full gap-4">
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Barcode Scanner */}
        <FeatureGate businessType={businessType} feature="barcode">
          <form onSubmit={handleBarcodeSubmit} className="mb-4">
            <div className="relative">
              <ScanLine className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                ref={barcodeInputRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="مسح الباركود... (اضغط Enter)"
                className="w-full pr-12 pl-4 py-4 rounded-xl bg-background border text-lg font-mono"
              />
            </div>
          </form>
        </FeatureGate>

        {/* Quick Actions */}
        <QuickActionsBar
          businessType={businessType}
          onAction={(action) => {
            if (action === 'hold') onHold();
            if (action === 'barcode') barcodeInputRef.current?.focus();
          }}
        />

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide mt-4">
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
            className="w-full px-4 py-3 rounded-lg bg-background border text-sm"
          />
        </div>

        {/* Products Grid */}
        <div className={cn(
          "grid gap-3 content-start",
          config.posLayout.itemGridCols === 4 && "grid-cols-2 sm:grid-cols-3 md:grid-cols-4",
          config.posLayout.itemGridCols === 5 && "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
          config.posLayout.itemGridCols === 6 && "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6"
        )}>
          {filteredProducts.map((product, index) => (
            <motion.button
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => addToCart(product)}
              className="bg-card border rounded-xl p-3 text-right hover:border-primary/50 transition-colors relative"
            >
              {/* Stock Badge */}
              {product.stock !== undefined && product.stock <= 5 && (
                <Badge 
                  variant={product.stock === 0 ? "destructive" : "secondary"}
                  className="absolute top-2 left-2 text-[8px]"
                >
                  {product.stock === 0 ? 'نفذ' : `${product.stock} متبقي`}
                </Badge>
              )}
              
              {config.posLayout.showItemImages && (
                <div className="text-3xl mb-2">{product.image}</div>
              )}
              <p className="font-medium text-sm truncate">{product.name}</p>
              <p className="text-xs text-muted-foreground">{product.category}</p>
              <p className="text-primary font-bold text-sm mt-1">
                {product.price} {currency}
              </p>
            </motion.button>
          ))}
        </div>
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

          {/* Order Type */}
          <OrderTypeSelector
            businessType={businessType}
            currentType={orderType}
            onChange={setOrderType}
          />

          {/* Customer */}
          <div className="mt-3 relative">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                onFocus={() => setShowCustomerSearch(true)}
                placeholder={config.placeholders.customer}
                className="flex-1 h-9"
              />
            </div>
            
            {/* Customer Search Dropdown */}
            <AnimatePresence>
              {showCustomerSearch && recentCustomers.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-lg shadow-lg z-50 max-h-48 overflow-auto"
                >
                  {recentCustomers.map((customer) => (
                    <button
                      key={customer.id}
                      onClick={() => selectCustomer(customer)}
                      className="w-full px-4 py-2 text-right hover:bg-muted flex items-center justify-between"
                    >
                      <span className="text-sm">{customer.name}</span>
                      {customer.credit_balance > 0 && (
                        <Badge variant="secondary" className="text-[10px]">
                          {customer.credit_balance} {currency}
                        </Badge>
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Cart Items */}
        <ScrollArea className="flex-1 p-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <Package className="w-12 h-12 mb-2 opacity-20" />
              <p>السلة فارغة</p>
              {config.posLayout.showBarcodeScanner && (
                <p className="text-xs mt-2">امسح باركود المنتج لإضافته</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((cartItem, index) => (
                <motion.div
                  key={`${cartItem.item.id}-${cartItem.selectedVariant || 'default'}`}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-muted/50 rounded-lg p-3"
                >
                  <div className="flex items-start gap-3">
                    {config.posLayout.showItemImages && (
                      <span className="text-2xl">{cartItem.item.image}</span>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{cartItem.item.name}</p>
                      {cartItem.selectedVariant && (
                        <p className="text-xs text-muted-foreground">{cartItem.selectedVariant}</p>
                      )}
                      <p className="text-xs text-primary mt-1">
                        {(() => {
                          const variantPrice = cartItem.selectedVariant 
                            ? cartItem.item.variants?.find(v => v.name === cartItem.selectedVariant)?.price_adjustment || 0
                            : 0;
                          return ((cartItem.item.price + variantPrice) * cartItem.qty).toFixed(2);
                        })()} {currency}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQty(cartItem.item.id, cartItem.selectedVariant, -1)}
                        className="w-7 h-7 rounded-md bg-background flex items-center justify-center hover:bg-destructive/10 hover:text-destructive"
                      >
                        {cartItem.qty === 1 ? <Trash2 className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                      </button>
                      <span className="w-8 text-center font-medium text-sm">{cartItem.qty}</span>
                      <button
                        onClick={() => updateQty(cartItem.item.id, cartItem.selectedVariant, 1)}
                        className="w-7 h-7 rounded-md bg-background flex items-center justify-center hover:bg-primary/10 hover:text-primary"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
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
                  "px-3 py-2 text-xs",
                  discountType === 'percent' ? "bg-primary text-primary-foreground" : "bg-muted"
                )}
              >
                %
              </button>
              <button
                onClick={() => setDiscountType('fixed')}
                className={cn(
                  "px-3 py-2 text-xs",
                  discountType === 'fixed' ? "bg-primary text-primary-foreground" : "bg-muted"
                )}
              >
                {currency}
              </button>
            </div>
          </div>

          {/* Payment Method */}
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            {[
              { key: 'cash', label: 'نقدي', icon: '💵' },
              { key: 'instapay', label: 'إنستاباي', icon: '📱' },
              { key: 'vodafone', label: 'فودافون كاش', icon: '📲' },
              { key: 'card', label: 'بطاقة', icon: '💳' }
            ].map((method) => (
              <button
                key={method.key}
                onClick={() => setPaymentMethod(method.key)}
                className={cn(
                  "flex-1 py-1.5 rounded-md text-[10px] transition-all",
                  paymentMethod === method.key
                    ? "bg-background shadow-sm font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="mr-1">{method.icon}</span>
                {method.label}
              </button>
            ))}
          </div>

          {/* Paid Amount */}
          <div className="relative">
            <Calculator className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              placeholder="المبلغ المدفوع"
              className="pr-10"
              type="number"
            />
          </div>

          {/* Totals */}
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>المجموع</span>
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
          
          {paid > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">الباقي</span>
              <span className={change > 0 ? "text-emerald-600 font-medium" : "text-destructive font-medium"}>
                {change > 0 ? change.toFixed(2) : remaining.toFixed(2)} {currency}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => onCheckout({ paymentMethod, paidAmount: paid })}
              disabled={cart.length === 0}
              className="bg-emerald-500 hover:bg-emerald-600"
            >
              <CheckCircle className="w-4 h-4 ml-1" />
              إتمام البيع
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

export default RetailPOS;
