import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, Users, X } from 'lucide-react';
import type { Order, OrderType } from './types';

interface Props {
  orders: Order[];
  onSelectTable: (tableNum: number) => void;
  selectedTable: string;
  currency: string;
}

const TABLE_COUNT = 20;

export function TableGrid({ orders, onSelectTable, selectedTable, currency }: Props) {
  const [tableCount, setTableCount] = useState(TABLE_COUNT);

  const getTableStatus = (num: number) => {
    const activeOrders = orders.filter(
      o => o.table_number === num && o.order_type === 'dine_in' && 
      (o.status === 'pending' || o.status === 'preparing' || o.status === 'ready')
    );
    if (activeOrders.length === 0) return { status: 'free' as const, orders: [] as Order[], total: 0 };
    const total = activeOrders.reduce((s, o) => s + Number(o.total), 0);
    return { status: 'occupied' as const, orders: activeOrders, total };
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-sm flex items-center gap-2">
          🪑 خريطة الطاولات
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded-sm bg-success/30 border border-success/50" /> فارغة
            <div className="w-3 h-3 rounded-sm bg-warning/30 border border-warning/50 mr-2" /> مشغولة
          </div>
          <div className="flex items-center gap-1 border border-border rounded-md">
            <button onClick={() => setTableCount(Math.max(4, tableCount - 4))} className="w-6 h-6 flex items-center justify-center hover:bg-secondary rounded-r-md">
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-xs w-6 text-center">{tableCount}</span>
            <button onClick={() => setTableCount(Math.min(40, tableCount + 4))} className="w-6 h-6 flex items-center justify-center hover:bg-secondary rounded-l-md">
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
        {Array.from({ length: tableCount }, (_, i) => i + 1).map(num => {
          const { status, orders: tableOrders, total } = getTableStatus(num);
          const isSelected = selectedTable === String(num);
          return (
            <motion.button
              key={num}
              whileTap={{ scale: 0.92 }}
              onClick={() => onSelectTable(num)}
              className={`relative p-2 rounded-xl border-2 transition-all text-center min-h-[72px] flex flex-col items-center justify-center gap-0.5
                ${isSelected 
                  ? 'border-primary bg-primary/10 ring-2 ring-primary/30' 
                  : status === 'occupied' 
                    ? 'border-warning/40 bg-warning/5 hover:border-warning/60' 
                    : 'border-border bg-card hover:border-success/40 hover:bg-success/5'
                }`}
            >
              <span className="text-lg">🪑</span>
              <span className={`text-xs font-bold ${isSelected ? 'text-primary' : 'text-foreground'}`}>{num}</span>
              {status === 'occupied' && (
                <>
                  <span className="text-[10px] text-warning font-medium">{total} {currency}</span>
                  <div className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-warning text-warning-foreground text-[9px] flex items-center justify-center font-bold">
                    {tableOrders.length}
                  </div>
                </>
              )}
              {isSelected && (
                <motion.div layoutId="table-ring" className="absolute inset-0 rounded-xl border-2 border-primary" />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
