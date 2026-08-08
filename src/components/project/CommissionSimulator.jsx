import React from 'react';
import { Calculator } from 'lucide-react';
import { getCommissionRate } from '@/components/utils/commissionHelper';

export default function CommissionSimulator({ totalValue, paymentMethod, installments, settings }) {
  if (!totalValue || !paymentMethod) return null;

  const calculateCommission = () => {
    const value = parseFloat(totalValue) || 0;
    if (value === 0) return 0;
    const rate = getCommissionRate(paymentMethod, installments, settings);
    return value * rate;
  };

  const commission = calculateCommission();

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-4 border border-emerald-200">
      <div className="flex items-center gap-2 mb-2">
        <Calculator className="w-4 h-4 text-emerald-600" />
        <p className="text-xs font-semibold text-emerald-800">Você Recebe</p>
      </div>
      <p className="text-2xl font-extrabold text-emerald-700">
        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(commission)}
      </p>
      <p className="text-xs text-slate-600 mt-1">
        Com {paymentMethod}{installments && installments > 1 ? ` ${installments}x` : ''}
      </p>
    </div>
  );
}