/**
 * FLEXIBLE QUANTITY/VALUE INPUT
 * Smart input that auto-calculates based on unit price
 * 
 * Features:
 * - Type quantity → auto-calculate total value
 * - Type total value → auto-calculate quantity
 * - Supports weight units (kg, g) and count units (pcs)
 * - Real-time calculation with visual feedback
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calculator, ArrowRightLeft, Weight, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

export type UnitType = 'kg' | 'g' | 'pcs' | 'box' | 'liter' | 'meter';

interface FlexibleQuantityInputProps {
  unitPrice: number;
  unitType: UnitType;
  onChange: (data: {
    quantity: number;
    totalValue: number;
    unitPrice: number;
  }) => void;
  className?: string;
}

const UNIT_LABELS: Record<UnitType, { ar: string; en: string; symbol: string }> = {
  kg: { ar: 'كيلوجرام', en: 'Kilogram', symbol: 'كجم' },
  g: { ar: 'جرام', en: 'Gram', symbol: 'جم' },
  pcs: { ar: 'قطعة', en: 'Piece', symbol: 'قطع' },
  box: { ar: 'علبة', en: 'Box', symbol: 'علب' },
  liter: { ar: 'لتر', en: 'Liter', symbol: 'لتر' },
  meter: { ar: 'متر', en: 'Meter', symbol: 'متر' }
};

export function FlexibleQuantityInput({
  unitPrice,
  unitType,
  onChange,
  className
}: FlexibleQuantityInputProps) {
  const [quantity, setQuantity] = useState<string>('');
  const [totalValue, setTotalValue] = useState<string>('');
  const [activeField, setActiveField] = useState<'quantity' | 'value'>('quantity');
  const [lastEdited, setLastEdited] = useState<'quantity' | 'value'>('quantity');

  // Calculate and update parent
  const calculateAndUpdate = useCallback((
    qty: number,
    value: number,
    edited: 'quantity' | 'value'
  ) => {
    if (unitPrice <= 0) return;

    let finalQty = qty;
    let finalValue = value;

    if (edited === 'quantity' && !isNaN(qty)) {
      // User edited quantity → calculate value
      finalValue = qty * unitPrice;
    } else if (edited === 'value' && !isNaN(value)) {
      // User edited value → calculate quantity
      finalQty = value / unitPrice;
    }

    // Update local state
    if (edited === 'quantity') {
      setTotalValue(finalValue > 0 ? finalValue.toFixed(2) : '');
    } else {
      setQuantity(finalQty > 0 ? finalQty.toFixed(3) : '');
    }

    // Notify parent
    onChange({
      quantity: finalQty,
      totalValue: finalValue,
      unitPrice
    });
  }, [unitPrice, onChange]);

  // Handle quantity change
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuantity(value);
    setLastEdited('quantity');
    
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      calculateAndUpdate(numValue, 0, 'quantity');
    }
  };

  // Handle total value change
  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTotalValue(value);
    setLastEdited('value');
    
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      calculateAndUpdate(0, numValue, 'value');
    }
  };

  // Reset when unit price changes significantly
  useEffect(() => {
    if (lastEdited === 'quantity' && quantity) {
      const numQty = parseFloat(quantity);
      if (!isNaN(numQty)) {
        calculateAndUpdate(numQty, 0, 'quantity');
      }
    }
  }, [unitPrice]); // eslint-disable-line react-hooks/exhaustive-deps

  const unitInfo = UNIT_LABELS[unitType];
  const isWeightUnit = ['kg', 'g'].includes(unitType);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with unit info */}
      <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          {isWeightUnit ? <Weight className="h-4 w-4" /> : <Package className="h-4 w-4" />}
          <span>الوحدة: {unitInfo.ar} ({unitInfo.symbol})</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-blue-600">
          <Calculator className="h-4 w-4" />
          <span>السعر: {unitPrice.toFixed(2)} / {unitInfo.symbol}</span>
        </div>
      </div>

      {/* Main input fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Quantity Input */}
        <div className="space-y-2">
          <Label 
            htmlFor="quantity"
            className={cn(
              "flex items-center gap-2 cursor-pointer",
              activeField === 'quantity' ? 'text-blue-600' : 'text-gray-700'
            )}
            onClick={() => setActiveField('quantity')}
          >
            {isWeightUnit ? <Weight className="h-4 w-4" /> : <Package className="h-4 w-4" />}
            الكمية ({unitInfo.symbol})
            {lastEdited === 'quantity' && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">المُدخل</span>
            )}
          </Label>
          <div className="relative">
            <Input
              id="quantity"
              type="number"
              step={isWeightUnit ? "0.001" : "1"}
              min="0"
              placeholder={`أدخل الكمية بال${unitInfo.symbol}`}
              value={quantity}
              onChange={handleQuantityChange}
              onFocus={() => setActiveField('quantity')}
              className={cn(
                "pr-12 text-lg",
                activeField === 'quantity' && "border-blue-500 ring-2 ring-blue-200"
              )}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              {unitInfo.symbol}
            </span>
          </div>
          {/* Examples */}
          <div className="flex gap-2 text-xs text-gray-500">
            {isWeightUnit ? (
              <>
                <button 
                  onClick={() => {
                    setQuantity('0.5');
                    calculateAndUpdate(0.5, 0, 'quantity');
                  }}
                  className="hover:text-blue-600"
                >
                  نصف {unitInfo.symbol}
                </button>
                <span>|</span>
                <button 
                  onClick={() => {
                    setQuantity('1');
                    calculateAndUpdate(1, 0, 'quantity');
                  }}
                  className="hover:text-blue-600"
                >
                  1 {unitInfo.symbol}
                </button>
                <span>|</span>
                <button 
                  onClick={() => {
                    setQuantity('2.5');
                    calculateAndUpdate(2.5, 0, 'quantity');
                  }}
                  className="hover:text-blue-600"
                >
                  2.5 {unitInfo.symbol}
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => {
                    setQuantity('1');
                    calculateAndUpdate(1, 0, 'quantity');
                  }}
                  className="hover:text-blue-600"
                >
                  1 {unitInfo.symbol}
                </button>
                <span>|</span>
                <button 
                  onClick={() => {
                    setQuantity('5');
                    calculateAndUpdate(5, 0, 'quantity');
                  }}
                  className="hover:text-blue-600"
                >
                  5 {unitInfo.symbol}
                </button>
                <span>|</span>
                <button 
                  onClick={() => {
                    setQuantity('10');
                    calculateAndUpdate(10, 0, 'quantity');
                  }}
                  className="hover:text-blue-600"
                >
                  10 {unitInfo.symbol}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Arrow indicator */}
        <div className="hidden md:flex items-center justify-center">
          <ArrowRightLeft className="h-6 w-6 text-gray-400" />
        </div>

        {/* Total Value Input */}
        <div className="space-y-2">
          <Label 
            htmlFor="totalValue"
            className={cn(
              "flex items-center gap-2 cursor-pointer",
              activeField === 'value' ? 'text-green-600' : 'text-gray-700'
            )}
            onClick={() => setActiveField('value')}
          >
            <Calculator className="h-4 w-4" />
            القيمة الإجمالية (جنيه)
            {lastEdited === 'value' && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">المُدخل</span>
            )}
          </Label>
          <div className="relative">
            <Input
              id="totalValue"
              type="number"
              step="0.01"
              min="0"
              placeholder="أدخل القيمة الإجمالية"
              value={totalValue}
              onChange={handleValueChange}
              onFocus={() => setActiveField('value')}
              className={cn(
                "pr-12 text-lg",
                activeField === 'value' && "border-green-500 ring-2 ring-green-200"
              )}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              ج.م
            </span>
          </div>
          {/* Quick value buttons */}
          <div className="flex gap-2 text-xs text-gray-500">
            <button 
              onClick={() => {
                const val = unitPrice * 0.5;
                setTotalValue(val.toFixed(2));
                calculateAndUpdate(0, val, 'value');
              }}
              className="hover:text-green-600"
            >
              نصف قيمة
            </button>
            <span>|</span>
            <button 
              onClick={() => {
                const val = unitPrice;
                setTotalValue(val.toFixed(2));
                calculateAndUpdate(0, val, 'value');
              }}
              className="hover:text-green-600"
            >
              {unitPrice.toFixed(0)} ج.م
            </button>
            <span>|</span>
            <button 
              onClick={() => {
                const val = unitPrice * 2;
                setTotalValue(val.toFixed(2));
                calculateAndUpdate(0, val, 'value');
              }}
              className="hover:text-green-600"
            >
              {(unitPrice * 2).toFixed(0)} ج.م
            </button>
          </div>
        </div>
      </div>

      {/* Summary Bar */}
      {quantity && totalValue && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
          <div className="flex justify-between items-center text-sm">
            <div className="text-gray-600">
              <span className="font-semibold">{parseFloat(quantity).toFixed(3)}</span> {unitInfo.symbol}
              <span className="mx-2">×</span>
              <span className="font-semibold">{unitPrice.toFixed(2)}</span> ج.م
            </div>
            <div className="text-lg font-bold text-blue-700">
              = {parseFloat(totalValue).toFixed(2)} ج.م
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// INTEGRATED INVOICE LINE COMPONENT
// ============================================================

interface InvoiceLineItemProps {
  product: {
    id: string;
    name: string;
    unit_price: number;
    unit_type: UnitType;
  };
  onAdd: (item: {
    product_id: string;
    quantity: number;
    unit_price: number;
    total: number;
  }) => void;
}

export function InvoiceLineItem({ product, onAdd }: InvoiceLineItemProps) {
  const [quantity, setQuantity] = useState(0);
  const [totalValue, setTotalValue] = useState(0);

  const handleFlexibleChange = (data: { quantity: number; totalValue: number; unitPrice: number }) => {
    setQuantity(data.quantity);
    setTotalValue(data.totalValue);
  };

  const handleAdd = () => {
    if (quantity > 0 && totalValue > 0) {
      onAdd({
        product_id: product.id,
        quantity,
        unit_price: product.unit_price,
        total: totalValue
      });
      // Reset
      setQuantity(0);
      setTotalValue(0);
    }
  };

  return (
    <div className="bg-white border rounded-lg p-4 space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-semibold text-lg">{product.name}</h4>
          <p className="text-gray-500">السعر: {product.unit_price.toFixed(2)} ج.م / {UNIT_LABELS[product.unit_type].symbol}</p>
        </div>
      </div>

      <FlexibleQuantityInput
        unitPrice={product.unit_price}
        unitType={product.unit_type}
        onChange={handleFlexibleChange}
      />

      <button
        onClick={handleAdd}
        disabled={quantity <= 0 || totalValue <= 0}
        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        إضافة للفاتورة ({totalValue.toFixed(2)} ج.م)
      </button>
    </div>
  );
}

// Example usage component
export function FlexibleInputDemo() {
  const [items, setItems] = useState<Array<{ id: string; name: string; qty: number; value: number }>>([]);

  const sampleProduct = {
    id: '1',
    name: 'تفاح أحمر',
    unit_price: 30, // 30 EGP per kg
    unit_type: 'kg' as UnitType
  };

  const handleAdd = (item: { product_id: string; quantity: number; unit_price: number; total: number }) => {
    setItems(prev => [...prev, {
      id: Date.now().toString(),
      name: sampleProduct.name,
      qty: item.quantity,
      value: item.total
    }]);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-bold mb-6">نظام الفاتورة المرن</h2>
      
      <InvoiceLineItem product={sampleProduct} onAdd={handleAdd} />

      {items.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold mb-3">عناصر الفاتورة:</h3>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={item.id} className="bg-gray-50 p-3 rounded flex justify-between">
                <span>{idx + 1}. {item.name} - {item.qty.toFixed(3)} كجم</span>
                <span className="font-semibold">{item.value.toFixed(2)} ج.م</span>
              </div>
            ))}
          </div>
          <div className="mt-4 text-xl font-bold text-right">
            الإجمالي: {items.reduce((sum, i) => sum + i.value, 0).toFixed(2)} ج.م
          </div>
        </div>
      )}
    </div>
  );
}

export default FlexibleQuantityInput;
