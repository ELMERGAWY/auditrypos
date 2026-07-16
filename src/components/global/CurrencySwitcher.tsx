import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DollarSign, Euro, Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { CurrencyCode } from '@/lib/subscriptionPlans';

const CURRENCIES: { code: CurrencyCode; label: string; icon: typeof DollarSign }[] = [
  { code: 'usd', label: 'USD ($)', icon: DollarSign },
  { code: 'eur', label: 'EUR (€)', icon: Euro },
  { code: 'egp', label: 'EGP (ج.م)', icon: Banknote },
];

interface Props {
  value: CurrencyCode;
  onChange: (currency: CurrencyCode) => void;
  variant?: 'ghost' | 'outline';
  className?: string;
}

export function CurrencySwitcher({ value, onChange, variant = 'ghost', className = '' }: Props) {
  const { t } = useTranslation();
  const current = CURRENCIES.find(c => c.code === value) ?? CURRENCIES[0];
  const Icon = current.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size="sm" className={`gap-2 ${className}`}>
          <Icon className="w-4 h-4" />
          <span className="text-xs">{current.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {CURRENCIES.map(c => (
          <DropdownMenuItem
            key={c.code}
            onClick={() => onChange(c.code)}
            className={value === c.code ? 'bg-primary/10 font-bold' : ''}
          >
            {c.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function useCurrencyPreference(): [CurrencyCode, (c: CurrencyCode) => void] {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    const saved = localStorage.getItem('auditry_currency') as CurrencyCode;
    return saved && ['usd', 'eur', 'egp'].includes(saved) ? saved : 'egp';
  });

  const setCurrency = (c: CurrencyCode) => {
    localStorage.setItem('auditry_currency', c);
    setCurrencyState(c);
  };

  return [currency, setCurrency];
}
