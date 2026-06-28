// @ts-nocheck
import React, { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Pause, Play, Trash2, Hash, Phone, MapPin, StickyNote, DollarSign, Send, Receipt, Minus, Plus, X, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CustomerSearch } from '../CustomerSearch';
import { BUSINESS_TYPES, getCustomerPlaceholder, getAddressPlaceholder, getNotesPlaceholder, isFoodSector } from '@/lib/businessTypes';
import type { OrderType, MenuItem, HeldInvoice, DeliveryAgent, Restaurant } from '../types';
import { usePermissions } from '@/hooks/usePermissions';

interface POSCartProps {
  activeInvoiceId: string | null;
  invoiceTabs: HeldInvoice[];
  cart: { item: MenuItem; qty: number; qtyText: string; unitMode: string; unitFactor: number; price: number; service_details?: string }[];
  holdCurrentInvoice: () => void;
  setShowInvoiceTabs: (show: boolean) => void;
  clearCart: () => void;
  businessType: string;
  orderType: OrderType;
  setOrderType: (t: OrderType) => void;
  tableNumber: string;
  setTableNumber: (val: string) => void;
  customOrderNumber: string;
  setCustomOrderNumber: (val: string) => void;
  restaurant: Restaurant;
  customerName: string;
  setCustomerName: (val: string) => void;
  customerPhone: string;
  setCustomerPhone: (val: string) => void;
  deliveryAddress: string;
  setDeliveryAddress: (val: string) => void;
  deliveryDate: string;
  setDeliveryDate: (val: string) => void;
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
  customerRef: string;
  setCustomerRef: (val: string) => void;
  checkout: (sendToPrep: boolean) => void;
  previewInvoice: () => void;
  updateValue: (id: string, value: number) => void;
  updatePrice: (id: string, price: number) => void;
  updateServiceDetails: (id: string, details: string) => void;
  removeFromCart: (id: string) => void;
  accountingAccounts: any[];
  selectedAccountId: string | null;
  setSelectedAccountId: (id: string) => void;
  isProcessing: boolean;
}

export const POSCart = memo(function POSCart({
  activeInvoiceId, invoiceTabs, cart, holdCurrentInvoice, setShowInvoiceTabs, clearCart,
  businessType, orderType, setOrderType, tableNumber, setTableNumber,
  customOrderNumber, setCustomOrderNumber,
  restaurant, customerName, setCustomerName, customerPhone, setCustomerPhone,
  deliveryAddress, setDeliveryAddress, deliveryDate, setDeliveryDate,
  agents, selectedDeliveryAgent, setSelectedDeliveryAgent,
  orderNotes, setOrderNotes, discount, setDiscount, discountType, setDiscountType,
  currency, getUnitOptions, setCartItemUnit, updateQty, setCartItemQty,
  discountAmount, taxAmount, cartSubtotal, cartTotal, paymentMethod, setPaymentMethod,
  paidAmount, setPaidAmount, remaining, customerRef, setCustomerRef, checkout, previewInvoice,
  updateValue, updatePrice, updateServiceDetails, removeFromCart,
  accountingAccounts, selectedAccountId, setSelectedAccountId, isProcessing
}: POSCartProps) {
  const { hasPermission } = usePermissions(restaurant?.id);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingQtyId, setEditingQtyId] = useState<string | null>(null);
  const [editingValueId, setEditingValueId] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-full bg-background border-r border-border shadow-xl">
      {/* Cart Header */}
      <div className="p-4 border-b border-border bg-gradient-to-b from-secondary/20 to-transparent">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-bold flex items-center gap-2 text-primary">
            <ShoppingCart className="w-5 h-5" />
            {activeInvoiceId ? invoiceTabs.find(t => t.id === activeInvoiceId)?.label || 'فاتورة' : 'فاتورة جديدة'}
            {cart.length > 0 && (
              <Badge variant="secondary" className="animate-in zoom-in">
                {cart.length}
              </Badge>
            )}
          </h3>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={holdCurrentInvoice}
              title="تعليق الفاتورة"
              disabled={cart.length === 0}
              className="hover:bg-warning/10 hover:text-warning"
            >
              <Pause className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowInvoiceTabs(true)}
              className="relative hover:bg-primary/10 hover:text-primary"
              title="الفواتير المعلّقة"
            >
              <Play className="w-4 h-4" />
              {invoiceTabs.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full gradient-bg text-primary-foreground text-[10px] flex items-center justify-center animate-bounce">
                  {invoiceTabs.length}
                </span>
              )}
            </Button>
            {cart.length > 0 && hasPermission('pos.void_order') && (
              <Button
                size="sm"
                variant="ghost"
                onClick={clearCart}
                className="text-destructive hover:bg-destructive/10"
                title="مسح السلة"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Order Type selector */}
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
          <div className="relative col-span-1">
            <Hash className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={customOrderNumber} onChange={e => setCustomOrderNumber(e.target.value)} placeholder="رقم الفاتورة (اختياري)" className="pr-8 h-9 text-xs" />
          </div>
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
          <div className="relative">
            <Phone className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="رقم الهاتف" className="pr-8 h-9 text-xs" />
          </div>
        </div>
        <div className="relative">
          <Hash className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={customerRef} onChange={e => setCustomerRef(e.target.value)} placeholder="الرقم المرجعي (تلقائي/يدوي)" className="pr-8 h-9 text-xs" />
        </div>
        {orderType === 'delivery' && (
          <>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-muted-foreground" />
              <Input value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} placeholder={getAddressPlaceholder(businessType)} className="pr-8 h-9 text-xs" />
            </div>
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-muted-foreground" />
              <Input 
                type="date" 
                value={deliveryDate} 
                onChange={e => setDeliveryDate(e.target.value)} 
                placeholder="تاريخ التسليم" 
                className="pr-8 h-9 text-xs" 
              />
            </div>
          </>
        )}
        <div className="relative">
          <StickyNote className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-muted-foreground" />
          <Input value={orderNotes} onChange={e => setOrderNotes(e.target.value)} placeholder={getNotesPlaceholder(businessType)} className="pr-8 h-9 text-xs" />
        </div>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {cart.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">السلة فارغة</p>}
        {cart.map(c => {
    const defaultUnitPrice = (Number(c.item.price) || 0) * (c.unitFactor || 1);
    const lineTotal = (Number(c.price) || 0) * (Number(c.qty) || 0);
    const unitOptions = getUnitOptions(c.item);

    return (
            <motion.div key={c.item.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 bg-secondary/50 rounded-lg p-3 relative group">
              <button
                onClick={() => removeFromCart(c.item.id)}
                className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-destructive text-white items-center justify-center hidden group-hover:flex shadow-lg z-10"
              >
                <X className="w-3 h-3" />
              </button>
              <span className="text-xl shrink-0">{c.item.image}</span>

              {/* Item name + price editor */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 cursor-pointer" onClick={() => setEditingPriceId(editingPriceId === c.item.id ? null : c.item.id)}>
                  <p className="text-sm font-medium truncate">{c.item.name}</p>
                  <div className={`p-0.5 rounded transition-colors ${editingPriceId === c.item.id ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-secondary'}`}>
                    <DollarSign className="w-3 h-3" />
                  </div>
                </div>

                {/* Unit price — always visible */}
                <div className="flex items-center gap-1 mt-0.5">
                  {editingPriceId === c.item.id ? (
                    <>
                      <span className="text-[10px] text-muted-foreground">سعر الوحدة:</span>
                      <input
                        type="number"
                        autoFocus
                        defaultValue={c.price || ''}
                        placeholder="0"
                        onBlur={e => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) updatePrice(c.item.id, val);
                          setEditingPriceId(null);
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) updatePrice(c.item.id, val);
                            setEditingPriceId(null);
                          }
                          if (e.key === 'Escape') setEditingPriceId(null);
                        }}
                        className="w-16 h-5 text-[10px] font-bold bg-secondary rounded border border-border px-1 focus:ring-1 focus:ring-primary outline-none"
                      />
                      <span className="text-[10px] font-bold text-primary">{currency}</span>
                    </>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">
                      سعر: {Number(c.price) > 0 ? `${c.price} ${currency}` : '— (اضغط $ للتعديل)'}
                    </span>
                  )}
                </div>

                {/* Modified price badge */}
                {Math.abs(Number(c.price) - defaultUnitPrice) > 0.001 && Number(c.price) > 0 && editingPriceId !== c.item.id && (
                  <p className="text-[9px] text-amber-500 font-bold">✎ سعر معدل</p>
                )}
                {/* Service details input (only for service items) */}
                {c.item.product_type === 'service' && (
                  <input
                    type="text"
                    value={c.service_details || ''}
                    onChange={(e) => updateServiceDetails(c.item.id, e.target.value)}
                    placeholder="تفاصيل الخدمة (مثل: اللون، الحجم، الخ)"
                    className="w-full mt-1 h-6 text-[10px] bg-secondary rounded border border-border px-1 focus:ring-1 focus:ring-primary outline-none"
                  />
                )}
              </div>

              {/* Qty + Value controls */}
              <div className="flex flex-col gap-1 items-end shrink-0">
                <div className="flex items-center gap-1">
                  {/* PRIMARY: editable total value field — click-to-edit */}
                  {editingValueId === c.item.id ? (
                    <div className="relative w-24">
                      <input
                        type="number"
                        autoFocus
                        inputMode="decimal"
                        step="0.01"
                        defaultValue={lineTotal > 0 ? lineTotal : ''}
                        placeholder="0"
                        onBlur={e => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) updateValue(c.item.id, val);
                          setEditingValueId(null);
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) updateValue(c.item.id, val);
                            setEditingValueId(null);
                          }
                          if (e.key === 'Escape') setEditingValueId(null);
                        }}
                        className="w-full h-8 text-[11px] pr-6 text-center bg-blue-100 dark:bg-blue-900/30 border border-blue-400 dark:border-blue-700 rounded-md focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-blue-600 dark:text-blue-400 font-bold pointer-events-none">{currency}</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingValueId(c.item.id)}
                      className="w-24 h-8 text-[11px] pr-6 text-center bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all font-medium flex items-center justify-center relative"
                      title="القيمة الإجمالية — اضغط للتعديل"
                    >
                      {lineTotal > 0 ? lineTotal : '—'}
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-blue-600 font-bold">{currency}</span>
                    </button>
                  )}

                  {/* Qty stepper with click-to-edit */}
                  <div className="flex items-center gap-0.5 bg-secondary rounded-md p-0.5">
                    <button onClick={() => updateQty(c.item.id, -1)} className="w-7 h-7 flex items-center justify-center hover:bg-destructive/20 rounded transition-colors text-destructive">
                      <Minus className="w-4 h-4" />
                    </button>
                    {editingQtyId === c.item.id ? (
                      <input
                        type="number"
                        autoFocus
                        inputMode="decimal"
                        step="0.001"
                        defaultValue={c.qtyText}
                        placeholder="0"
                        onBlur={e => {
                          setCartItemQty(c.item.id, e.target.value);
                          setEditingQtyId(null);
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            setCartItemQty(c.item.id, e.target.value);
                            setEditingQtyId(null);
                          }
                          if (e.key === 'Escape') setEditingQtyId(null);
                        }}
                        className="w-12 text-center text-sm bg-white dark:bg-gray-800 border border-primary/30 rounded outline-none font-medium"
                      />
                    ) : (
                      <button
                        onClick={() => setEditingQtyId(c.item.id)}
                        className="w-12 text-center text-sm bg-transparent border-0 rounded font-medium hover:bg-white/50 dark:hover:bg-gray-700/50 transition-all"
                      >
                        {c.qtyText}
                      </button>
                    )}
                    <button onClick={() => updateQty(c.item.id, 1)} className="w-7 h-7 flex items-center justify-center hover:bg-primary/20 rounded transition-colors text-primary">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Unit selector */}
                {unitOptions.length > 1 && (
                  <select value={c.unitMode} onChange={e => setCartItemUnit(c.item.id, e.target.value)}
                    className="h-6 text-[10px] bg-secondary border-0 rounded px-1 w-full">
                    {unitOptions.map(u => <option key={u.label} value={u.label}>{u.label}</option>)}
                  </select>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Totals & Checkout */}
      <div className="p-4 border-t border-border space-y-2">
        <div className="flex justify-between font-display font-bold text-lg">
          <span>الإجمالي</span>
          <span className="text-primary">
            {Number.isInteger(cartTotal) ? cartTotal : cartTotal.toFixed(2).replace(/\.?0+$/, '')} {currency}
          </span>
        </div>
        <div className="flex gap-1 rounded-lg bg-secondary p-1">
          {['cash', 'instapay', 'vodafone_cash', 'bank'].map(m => (
            <button key={m} onClick={() => {
              setPaymentMethod(m);
              const firstMatch = accountingAccounts.find(a =>
                (m === 'cash' && a.is_cash_account) ||
                (m === 'bank' && a.is_bank_account) ||
                (['instapay', 'vodafone_cash'].includes(m) && a.is_bank_account)
              );
              if (firstMatch) setSelectedAccountId(firstMatch.id);
            }}
              className={`flex-1 py-1.5 rounded-md text-[10px] transition-all ${paymentMethod === m ? 'gradient-bg text-primary-foreground' : 'text-muted-foreground'}`}>
              {m === 'cash' ? '💵 نقدي' : m === 'instapay' ? '📱 إنستاباي' : m === 'vodafone_cash' ? '📲 فودافون' : '🏦 بنك'}
            </button>
          ))}
        </div>

        {/* Account Selection */}
        {(paymentMethod === 'cash' || paymentMethod === 'bank' || paymentMethod === 'instapay' || paymentMethod === 'vodafone_cash') && (
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground mr-1">
              توجيه إلى {paymentMethod === 'cash' ? 'الخزينة' : 'البنك / المحفظة'}:
            </label>
            <select
              value={selectedAccountId || ''}
              onChange={e => setSelectedAccountId(e.target.value)}
              className="w-full h-8 text-[10px] bg-secondary border-0 rounded-lg px-2 font-bold focus:ring-1 focus:ring-primary transition-all"
            >
              {accountingAccounts
                .filter(a =>
                  (paymentMethod === 'cash' && a.is_cash_account) ||
                  (['bank', 'instapay', 'vodafone_cash'].includes(paymentMethod) && a.is_bank_account)
                )
                .map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.code} - {acc.name}
                  </option>
                ))}
              {accountingAccounts.length === 0 && <option value="">لا توجد حسابات مهيأة</option>}
            </select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Input value={paidAmount} onChange={e => setPaidAmount(e.target.value)} placeholder="المدفوع" className="h-8 text-xs" type="number" />
          <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-secondary/50 text-xs">
            <span className="text-muted-foreground">الباقي:</span>
            <span className="font-bold text-success">{remaining.toFixed(2)}</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Button onClick={previewInvoice} variant="outline" className="h-10 text-[10px]" disabled={cart.length === 0 || isProcessing}>
            <Receipt className="w-3 h-3 ml-1" /> معاينة
          </Button>
          {(isFoodSector(businessType) || businessType === 'wholesale') && (
            <Button onClick={() => checkout(true)} className="gradient-bg text-primary-foreground border-0 h-10 text-[10px]" disabled={cart.length === 0 || isProcessing}>
              <Send className="w-3 h-3 ml-1" /> {isProcessing ? 'جاري المعالجة...' : 'إرسال للتحضير'}
            </Button>
          )}
          <Button onClick={() => checkout(false)} className="bg-success text-success-foreground border-0 h-10 text-[10px]" disabled={cart.length === 0 || isProcessing}>
            <Receipt className="w-3 h-3 ml-1" /> {isProcessing ? 'جاري المعالجة...' : 'بيع مباشر'}
          </Button>
          <Button onClick={holdCurrentInvoice} variant="outline" className="h-10 text-[10px]" disabled={cart.length === 0 || isProcessing}>
            <Pause className="w-3 h-3 ml-1" /> تعليق
          </Button>
        </div>
      </div>
    </div>
  );
});