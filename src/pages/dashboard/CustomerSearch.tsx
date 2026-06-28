import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Users } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  balance: number;
  customer_type: string;
}

interface Props {
  restaurantId: string;
  value: string;
  onChange: (name: string, phone?: string, address?: string, customerId?: string) => void;
  placeholder?: string;
}

export function CustomerSearch({ restaurantId, value, onChange, placeholder }: Props) {
  const [suggestions, setSuggestions] = useState<Customer[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const query = value.trim();
    const timer = window.setTimeout(async () => {
      const safeQuery = query.replace(/[%,]/g, '');
      let queryBuilder = supabase.from('customers')
        .select('id, name, phone, address, balance, customer_type')
        .eq('restaurant_id', restaurantId)
        .limit(8);

      if (query.length >= 1) {
        queryBuilder = queryBuilder.or(`name.ilike.%${safeQuery}%,phone.ilike.%${safeQuery}%`);
      }

      const { data } = await queryBuilder;

      setSuggestions((data || []) as Customer[]);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [restaurantId, value]);

  const selectCustomer = (c: Customer) => {
    onChange(c.name, c.phone, c.address, c.id);
    setShowSuggestions(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Users className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground z-10" />
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setShowSuggestions(true)}
        placeholder={placeholder || 'بحث عن عميل...'}
        className="pr-8 h-9 text-xs"
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full right-0 left-0 z-50 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-auto">
          {suggestions.map(c => (
            <button key={c.id} onClick={() => selectCustomer(c)}
              className="w-full px-3 py-2 text-right text-xs hover:bg-secondary transition-colors flex items-center gap-2">
              <span className="font-medium">{c.name}</span>
              {c.phone && <span className="text-muted-foreground">{c.phone}</span>}
              {c.balance !== 0 && (
                <span className={`mr-auto text-[10px] font-bold ${c.balance > 0 ? 'text-destructive' : 'text-success'}`}>
                  {c.balance > 0 ? 'مدين' : 'دائن'}: {Math.abs(c.balance)}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
