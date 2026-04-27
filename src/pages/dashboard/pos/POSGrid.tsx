import { motion } from 'framer-motion';
import { TrendingUp, Receipt, DollarSign, Timer } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { TableGrid } from '../TableGrid';
import { getPosSearchPlaceholder, isFoodSector } from '@/lib/businessTypes';
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
}

export function POSGrid({
  currency, todayRevenue, todayOrders, avgOrderValue, pendingOrders,
  businessType, orderType, orders, tableNumber, setTableNumber,
  categories, selectedCategory, setSelectedCategory,
  searchQuery, setSearchQuery, filteredItems, addToCart
}: POSGridProps) {
  return (
    <div className="flex-1 p-4 overflow-auto">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'إيرادات اليوم', value: `${todayRevenue} ${currency}`, icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'طلبات اليوم', value: String(todayOrders.length), icon: Receipt, color: 'text-accent', bg: 'bg-accent/10' },
          { label: 'متوسط الطلب', value: `${avgOrderValue} ${currency}`, icon: DollarSign, color: 'text-success', bg: 'bg-success/10' },
          { label: 'طلبات نشطة', value: String(pendingOrders.length), icon: Timer, color: 'text-warning', bg: 'bg-warning/10' },
        ].map(s => (
          <div key={s.label} className="glass-card p-3 flex items-center gap-3">
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
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        <button onClick={() => setSelectedCategory('all')} className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${selectedCategory === 'all' ? 'gradient-bg text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>الكل</button>
        {categories.map(cat => (
          <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${selectedCategory === cat ? 'gradient-bg text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>{cat}</button>
        ))}
      </div>
      <Input placeholder={getPosSearchPlaceholder(businessType)} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="mb-4" />

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {filteredItems.map(item => (
          <motion.button key={item.id} whileTap={{ scale: 0.95 }} onClick={() => addToCart(item)} className="pos-grid-item text-right">
            <div className="text-3xl mb-2">{item.image}</div>
            <p className="font-medium text-sm truncate">{item.name}</p>
            <p className="text-primary font-bold text-sm">{item.price} {currency}</p>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
