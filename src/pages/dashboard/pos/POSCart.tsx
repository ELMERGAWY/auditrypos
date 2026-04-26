import { motion } from 'framer-motion';
import { ShoppingCart, Pause, Play, Trash2, Hash, Phone, MapPin, StickyNote, Percent, DollarSign, Send, Receipt, Minus, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CustomerSearch } from '../CustomerSearch';
import { BUSINESS_TYPES, getCustomerPlaceholder, getAddressPlaceholder, getNotesPlaceholder } from '@/lib/businessTypes';
import type { OrderType, MenuItem, HeldInvoice, DeliveryAgent, Restaurant } from '../types';
import { usePermissions } from '@/hooks/usePermissions';

interface POSCartProps {
  activeInvoiceId: string | null;
  invoiceTabs: HeldInvoice[];
  cart: { item: MenuItem; qty: number; qtyText: string; unitMode: string }[];
  holdCurrentInvoice: () => void;
  setShowInvoiceTabs: (show: boolean) => void;
  clearCart: () => void;
  businessType: string;
  orderType: OrderType;
  setOrderType: (t: OrderType) => void;
  tableNumber: string;
  setTableNumber: (val: string) => void;
  restaurant: Restaurant;
  customerName: string;
  setCustomerName: (val: string) => void;
  customerPhone: string;
  setCustomerPhone: (val: string) => void;
  deliveryAddress: string;
  setDeliveryAddress: (val: string) => void;
  agents: DeliveryAgent[];
  selectedDeliveryAgent: string;
  setSelectedDeliveryAgent: (val: string) => void;
  orderNotes: string;
  setOrderNotes: (val: string) => void;
  discount: string;
  setDiscount: (val: string) => void;
  discountType: 'percent' | 'fixed';
  setDiscountType: (t: 'percent' | 'fixed') => void;
  currency: string;
  getUnitOptions: (item: MenuItem) => { label: string; factor: number }[];
  setCartItemUnit: (id: string, label: string) => void;
  updateQty: (id: string, d: number) => void;
  setCartItemQty: (id: string, text: string) => void;
  discountAmount: number;
  taxAmount: number;
  cartSubtotal: number;
  cartTotal: number;
  paymentMethod: string;
  setPaymentMethod: (m: string) => void;
  paidAmount: string;
  setPaidAmount: (val: string) => void;
  remaining: number;
  checkout: (sendToPrep: boolean) => void;
  updateValue: (id: string, value: number) => void;
  removeFromCart: (id: string) => void;
}

export function POSCart({
  activeInvoiceId, invoiceTabs, cart, holdCurrentInvoice, setShowInvoiceTabs, clearCart,
  businessType, orderType, setOrderType, tableNumber, setTableNumber,
  restaurant, customerName, setCustomerName, customerPhone, setCustomerPhone,
  deliveryAddress, setDeliveryAddress, agents, selectedDeliveryAgent, setSelectedDeliveryAgent,
  orderNotes, setOrderNotes, discount, setDiscount, discountType, setDiscountType,
  currency, getUnitOptions, setCartItemUnit, updateQty, setCartItemQty,
  discountAmount, taxAmount, cartSubtotal, cartTotal, paymentMethod, setPaymentMethod,
  paidAmount, setPaidAmount, remaining, checkout, updateValue, removeFromCart
}: POSCartProps) {
  const { hasPermission } = usePermissions(restaurant?.id);
  return (
    <div className="w-full lg:w-96 bg-card border-r border-border flex flex-col h-full">
      {/* Cart Header with tabs indicator */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-display font-bold flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            {activeInvoiceId ? invoiceTabs.find(t => t.id === activeInvoiceId)?.label || 'فاتورة' : 'فاتورة جديدة'}
            {cart.length > 0 && <Badge variant="secondary">{cart.length}</Badge>}
          </h3>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={holdCurrentInvoice} title="تعليق الفاتورة" disabled={cart.length === 0}>
              <Pause className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowInvoiceTabs(true)} className="relative" title="الفواتير المعلّقة">
              <Play className="w-4 h-4" />
              {invoiceTabs.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full gradient-bg text-primary-foreground text-[10px] flex items-center justify-center">{invoiceTabs.length}</span>
              )}
            </Button>
            {cart.length > 0 && hasPermission('pos.void_order') && (
              <Button size="sm" variant="ghost" onClick={clearCart} className="text-destructive" title="مسح السلة">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Order Type selector - sector specific */}
        <div className="flex gap-1 rounded-lg bg-secondary p-1">
          {(BUSINESS_TYPES[businessType as keyof typeof BUSINESS_TYPES]?.orderTypes || ['pickup', 'delivery']).map(t => {
            const label = t === 'dine_in' ? 'داخلي' : t === 'takeaway' ? 'تيك أواي' : t === 'delivery' ? 'توصيل' : 'استلام';
            const icon = t === 'dine_in' ? '🍽️' : t === 'takeaway' ? '🛍️' : t === 'delivery' ? '🛵' : '🏬';
            return (
              <button key={t} onClick={() => setOrderType(t as OrderType)}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-xs transition-all ${orderType === t ? 'gradient-bg text-primary-foreground' : 'text-muted-foreground'}`}>
                <span>{icon}</span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Order Details */}
      <div className="p-3 space-y-2 border-b border-border bg-secondary/30">
        <div className="grid grid-cols-2 gap-2">
          {orderType === 'dine_in' && (
            <div className="relative col-span-1">
              <Hash className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={tableNumber} onChange={e => setTableNumber(e.target.value)} placeholder="رقم الطاولة" className="pr-8 h-9 text-xs" type="number" />
            </div>
          )}
          <CustomerSearch
            restaurantId={restaurant.id}
            value={customerName}
            onChange={setCustomerName}
            placeholder={getCustomerPlaceholder(businessType)}
          />
          {(orderType === 'delivery' || orderType === 'takeaway') && (
            <div className="relative">
              <Phone className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="رقم الهاتف" className="pr-8 h-9 text-xs" />
            </div>
          )}
        </div>
        {orderType === 'delivery' && (
          <>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-muted-foreground" />
              <Input value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} placeholder={getAddressPlaceholder(businessType)} className="pr-8 h-9 text-xs" />
            </div>
            {agents.filter(a => a.status === 'available').length > 0 && (
              <select value={selectedDeliveryAgent} onChange={e => setSelectedDeliveryAgent(e.target.value)}
                className="w-full h-9 text-xs bg-background border border-input rounded-md px-2">
                <option value="">اختر مندوب التوصيل...</option>
                {agents.filter(a => a.status === 'available').map(a => (
                  <option key={a.id} value={a.id}>🛵 {a.name}</option>
                ))}
              </select>
            )}
          </>
        )}
        <div className="relative">
          <StickyNote className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-muted-foreground" />
          <Input value={orderNotes} onChange={e => setOrderNotes(e.target.value)} placeholder={getNotesPlaceholder(businessType)} className="pr-8 h-9 text-xs" />
        </div>
        {hasPermission('pos.apply_discount') && (
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Percent className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={discount} onChange={e => setDiscount(e.target.value)} placeholder="خصم" className="pr-8 h-9 text-xs" type="number" />
            </div>
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button onClick={() => setDiscountType('percent')} className={`px-2 text-xs transition-colors ${discountType === 'percent' ? 'gradient-bg text-primary-foreground' : 'bg-secondary'}`}>%</button>
              <button onClick={() => setDiscountType('fixed')} className={`px-2 text-xs transition-colors ${discountType === 'fixed' ? 'gradient-bg text-primary-foreground' : 'bg-secondary'}`}>{currency}</button>
            </div>
          </div>
        )}
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {cart.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">السلة فارغة</p>}
        {cart.map(c => (
          <motion.div key={c.item.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 bg-secondary/50 rounded-lg p-3 relative group">
            <button 
              onClick={() => removeFromCart(c.item.id)}
              className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-destructive text-white items-center justify-center hidden group-hover:flex shadow-lg z-10"
            >
              <X className="w-3 h-3" />
            </button>
            <span className="text-xl shrink-0">{c.item.image}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{c.item.name}</p>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground">السعر:</span>
                <span className="text-[10px] font-bold text-primary">{c.item.price} {currency}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1 items-end">
              <div className="flex items-center gap-1">
                <div className="relative w-20">
                  <Input 
                    type="number" 
                    value={(c.item.price * c.qty).toFixed(2)} 
                    onChange={e => updateValue(c.item.id, Number(e.target.value))}
                    className="h-7 text-[10px] pr-5 text-center bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                  />
                  <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] text-blue-600 dark:text-blue-400 font-bold">{currency}</span>
                </div>
                <div className="flex items-center gap-1 bg-secondary rounded-md p-0.5">
              {getUnitOptions(c.item).length > 1 && (
                <select value={c.unitMode} onChange={e => setCartItemUnit(c.item.id, e.target.value)}
                  className="h-7 text-[10px] bg-secondary border border-border rounded-md px-1">
                  {getUnitOptions(c.item).map(u => <option key={u.label} value={u.label}>{u.label}</option>)}
                </select>
              )}
              <button onClick={() => updateQty(c.item.id, -0.5)} disabled={!hasPermission('pos.delete_item') && c.qty <= 0.5} className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center hover:bg-destructive/20 transition-colors text-[10px] font-bold disabled:opacity-50">-½</button>
              <button onClick={() => updateQty(c.item.id, -1)} disabled={!hasPermission('pos.delete_item') && c.qty <= 1} className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center hover:bg-destructive/20 transition-colors disabled:opacity-50"><Minus className="w-3 h-3" /></button>
              <input
                type="text"
                inputMode="decimal"
                value={c.qtyText}
                onChange={e => setCartItemQty(c.item.id, e.target.value)}
                onBlur={() => { if (!c.qty || c.qty <= 0) { if (hasPermission('pos.delete_item')) updateQty(c.item.id, 0); else setCartItemQty(c.item.id, '1'); } }}
                className="w-12 text-center text-sm font-medium bg-transparent border border-border rounded-md h-7"
              />
              <button onClick={() => updateQty(c.item.id, 1)} className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center hover:bg-primary/20 transition-colors"><Plus className="w-3 h-3" /></button>
              <button onClick={() => updateQty(c.item.id, 0.5)} className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center hover:bg-primary/20 transition-colors text-[10px] font-bold">+½</button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Totals & Checkout */}
      <div className="p-4 border-t border-border space-y-2">
        {discountAmount > 0 && (
          <>
            <div className="flex justify-between text-sm text-muted-foreground"><span>المجموع الفرعي</span><span>{cartSubtotal.toFixed(2)} {currency}</span></div>
            <div className="flex justify-between text-sm text-success"><span>الخصم</span><span>-{discountAmount.toFixed(2)} {currency}</span></div>
          </>
        )}
        {taxAmount > 0 && (
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>الضريبة المضافة</span>
            <span>+{taxAmount.toFixed(2)} {currency}</span>
          </div>
        )}
        <div className="flex justify-between font-display font-bold text-lg">
          <span>الإجمالي</span><span className="text-primary">{cartTotal.toFixed(2)} {currency}</span>
        </div>

        {/* Payment Method */}
        <div className="flex gap-1 rounded-lg bg-secondary p-1">
          {[
            { key: 'cash', label: '💵 نقدي' },
            { key: 'instapay', label: '📱 إنستاباي' },
            { key: 'vodafone_cash', label: '📲 فودافون كاش' },
            { key: 'bank', label: '🏦 تحويل بنكي' },
          ].map(m => (
            <button key={m.key} onClick={() => setPaymentMethod(m.key)}
              className={`flex-1 py-1.5 rounded-md text-[10px] transition-all ${paymentMethod === m.key ? 'gradient-bg text-primary-foreground' : 'text-muted-foreground'}`}>
              {m.label}
            </button>
          ))}
        </div>

        {/* Paid & Remaining */}
        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <DollarSign className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={paidAmount} onChange={e => setPaidAmount(e.target.value)} placeholder="المبلغ المدفوع" className="pr-7 h-8 text-xs" type="number" />
          </div>
          <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-secondary/50 text-xs">
            <span className="text-muted-foreground">الباقي:</span>
            <span className={`font-bold ${remaining > 0 ? 'text-destructive' : 'text-success'}`}>{remaining.toFixed(2)} {currency}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button onClick={() => checkout(true)} className="gradient-bg text-primary-foreground border-0 h-10 text-xs" disabled={cart.length === 0}>
            <Send className="w-4 h-4 ml-1" /> إرسال للتحضير
          </Button>
          <Button onClick={() => checkout(false)} className="bg-success text-success-foreground hover:bg-success/90 border-0 h-10 text-xs" disabled={cart.length === 0}>
            <Receipt className="w-4 h-4 ml-1" /> بيع مباشر
          </Button>
          <Button onClick={holdCurrentInvoice} variant="outline" className="h-10 text-xs" disabled={cart.length === 0}>
            <Pause className="w-4 h-4 ml-1" /> تعليق
          </Button>
        </div>
      </div>
    </div>
  );
}
