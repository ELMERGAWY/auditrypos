import { motion, AnimatePresence } from 'framer-motion';
import { Pause, Play, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { HeldInvoice, OrderType } from '../types';
import { ORDER_TYPE_CONFIG } from '../types';

interface InvoiceTabsProps {
  show: boolean;
  onClose: () => void;
  invoiceTabs: HeldInvoice[];
  activeInvoiceId: string | null;
  recallInvoice: (tab: HeldInvoice) => void;
  deleteInvoiceTab: (id: string) => void;
  clearCart: () => void;
  currency: string;
}

export function InvoiceTabs({
  show, onClose, invoiceTabs, activeInvoiceId, recallInvoice, deleteInvoiceTab, clearCart, currency
}: InvoiceTabsProps) {
  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
          className="glass-card p-6 max-w-md w-full max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
          <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
            <Pause className="w-5 h-5 text-primary" /> الفواتير المعلّقة ({invoiceTabs.length})
          </h3>
          {invoiceTabs.length === 0 && <p className="text-muted-foreground text-center py-8">لا توجد فواتير معلّقة</p>}
          {invoiceTabs.map(tab => (
            <div key={tab.id} className={`glass-card p-4 mb-3 ${activeInvoiceId === tab.id ? 'border-primary/50' : ''}`}>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{tab.label}</span>
                  {activeInvoiceId === tab.id && <Badge className="status-active text-xs">نشط</Badge>}
                </div>
                <span className="text-xs text-muted-foreground">{new Date(tab.timestamp).toLocaleTimeString('ar-EG')}</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">
                  {ORDER_TYPE_CONFIG[tab.orderType as OrderType]?.icon} {ORDER_TYPE_CONFIG[tab.orderType as OrderType]?.label}
                </Badge>
                {tab.tableNumber && <Badge variant="outline" className="text-xs">طاولة {tab.tableNumber}</Badge>}
                {tab.customerName && <span className="text-xs text-muted-foreground">{tab.customerName}</span>}
              </div>
              <p className="text-xs text-muted-foreground mb-2">{tab.cart.map(c => `${c.item.name} × ${c.qty}`).join('، ')}</p>
              <div className="flex justify-between items-center">
                <span className="font-bold text-primary">{tab.cart.reduce((s, c) => s + ((Number(c.price) || (Number(c.item.price) || 0) * (c.unitFactor || 1)) * c.qty), 0).toFixed(2)} {currency}</span>
                <div className="flex gap-2">
                  <Button size="sm" className="gradient-bg text-primary-foreground border-0" onClick={() => recallInvoice(tab)}>
                    <Play className="w-3 h-3 ml-1" /> استعادة
                  </Button>
                  <Button size="sm" variant="outline" className="text-destructive" onClick={() => deleteInvoiceTab(tab.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          <Button variant="outline" className="w-full mt-2" onClick={() => { clearCart(); onClose(); }}>
            <Plus className="w-4 h-4 ml-1" /> فاتورة جديدة فارغة
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
