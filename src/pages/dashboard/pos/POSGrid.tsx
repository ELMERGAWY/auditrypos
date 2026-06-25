// @ts-nocheck
import React, { memo } from 'react';
import { TrendingUp, Receipt, DollarSign, Timer, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { TableGrid } from '../TableGrid';
import { getPosSearchPlaceholder, isFoodSector, isInventoryDrivenBusiness } from '@/lib/businessTypes';
import type { OrderType, MenuItem, Order } from '../types';

interface POSGridProps {
  currency: string;
  todayRevenue: number;
  todayOrders: Order[];
  avgOrderValue: number;
  pendingOrders: Order[];
  businessType: string;
  orderType: OrderType;
  orders: Order[];
  tableNumber: string;
  setTableNumber: (val: string) => void;
  categories: string[];
  selectedCategory: string;
  setSelectedCategory: (val: string) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  filteredItems: MenuItem[];
  addToCart: (item: MenuItem) => void;
  servicePackages: any[];
  addPackageToCart: (pkg: any) => void;
}

export const POSGrid = memo(function POSGrid({
  currency, todayRevenue, todayOrders, avgOrderValue, pendingOrders,
  businessType, orderType, orders, tableNumber, setTableNumber,
  categories, selectedCategory, setSelectedCategory,
  searchQuery, setSearchQuery, filteredItems, addToCart,
  servicePackages, addPackageToCart
}: POSGridProps) {
  return (
    <div className="flex-1 p-4 overflow-auto scrollbar-hide">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'إيرادات اليوم', value: `${Number(todayRevenue).toFixed(2)} ${currency}`, icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'طلبات اليوم', value: String(todayOrders.length), icon: Receipt, color: 'text-accent', bg: 'bg-accent/10' },
          { label: 'متوسط الطلب', value: `${Number(avgOrderValue).toFixed(2)} ${currency}`, icon: DollarSign, color: 'text-success', bg: 'bg-success/10' },
          { label: 'طلبات نشطة', value: String(pendingOrders.length), icon: Timer, color: 'text-warning', bg: 'bg-warning/10' },
        ].map(s => (
          <div key={s.label} className="glass-card p-3 flex items-center gap-3 transition-transform hover:scale-[1.02]">
            <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
              <p className={`font-display font-bold ${s.color}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table Grid - only for food sectors with dine_in */}
      {isFoodSector(businessType) && orderType === 'dine_in' && (
        <div className="glass-card p-4 mb-4">
          <TableGrid
            orders={orders}
            onSelectTable={(num) => setTableNumber(String(num))}
            selectedTable={tableNumber}
            currency={currency}
          />
        </div>
      )}

      {/* Categories */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
        <button 
          onClick={() => setSelectedCategory('all')} 
          className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-all duration-200 ${selectedCategory === 'all' ? 'gradient-bg text-primary-foreground shadow-lg scale-105' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
        >
          الكل
        </button>
        {categories.map(cat => (
          <button 
            key={cat} 
            onClick={() => setSelectedCategory(cat)} 
            className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-all duration-200 ${selectedCategory === cat ? 'gradient-bg text-primary-foreground shadow-lg scale-105' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
          >
            {cat}
          </button>
        ))}
      </div>
      
      <div className="relative mb-4">
        <Input 
          placeholder={getPosSearchPlaceholder(businessType)} 
          value={searchQuery} 
          onChange={e => setSearchQuery(e.target.value)} 
          className="pr-10 h-11 transition-all focus:ring-2 focus:ring-primary/20"
        />
        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-muted-foreground">
          <Receipt className="w-5 h-5" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {servicePackages.length > 0 && servicePackages.map(pkg => (
          <button 
            key={pkg.id} 
            onClick={() => addPackageToCart(pkg)} 
            className="pos-grid-item group text-right relative active:scale-95 transition-all duration-200 hover:shadow-xl border-2 border-primary/30 hover:border-primary"
          >
            <div className="text-4xl mb-3 transform group-hover:scale-110 transition-transform duration-200 drop-shadow-md">
              📦
            </div>
            <p className="font-bold text-sm truncate mb-1 group-hover:text-primary transition-colors">{pkg.name}</p>
            <p className="text-xs text-muted-foreground truncate">{pkg.description}</p>
            <div className="flex items-center justify-between mt-auto">
              <p className="text-primary font-bold text-sm">{Number(pkg.price).toFixed(2)} <span className="text-[10px] font-normal opacity-70">{currency}</span></p>
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Plus className="w-3 h-3 text-primary" />
              </div>
            </div>
          </button>
        ))}
        {filteredItems.map(item => (
          <button 
            key={item.id} 
            onClick={() => addToCart(item)} 
            className="pos-grid-item group text-right relative active:scale-95 transition-all duration-200 hover:shadow-xl border border-transparent hover:border-primary/20"
          >
            {item.stock_quantity !== undefined && isInventoryDrivenBusiness(businessType) && (
              <div className={`absolute top-2 left-2 z-10 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${item.stock_quantity <= 0 ? 'bg-destructive text-destructive-foreground' : 'bg-primary/90 text-primary-foreground'}`}>
                {item.stock_quantity} {item.stock_quantity <= 0 ? 'نفذ' : 'متبقي'}
              </div>
            )}
            {item.product_type === 'service' && (
              <div className="absolute top-2 right-2 z-10 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                🎨 خدمة قابلة للتخصيص
              </div>
            )}
            <div className="text-4xl mb-3 transform group-hover:scale-110 transition-transform duration-200 drop-shadow-md">
              {item.image || '📦'}
            </div>
            <p className="font-bold text-sm truncate mb-1 group-hover:text-primary transition-colors">{item.name}</p>
            <div className="flex items-center justify-between mt-auto">
              <p className="text-primary font-bold text-sm">{Number(item.price).toFixed(2)} <span className="text-[10px] font-normal opacity-70">{currency}</span></p>
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Plus className="w-3 h-3 text-primary" />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
});
