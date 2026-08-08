import React from 'react';
import { TrendingUp, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MonthlyEarnings({ grossRevenue, netProfit, settings }) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  return (
    <div className="bg-[#1e3a4a] rounded-[20px] p-5 text-white shadow-[0_4px_15px_rgba(0,0,0,0.05)]">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center">
          <Wallet className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Este mês</p>
          <p className="text-xs font-medium text-white/80">Resumo financeiro</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 rounded-xl p-3"
        >
          <p className="text-[10px] text-slate-400 mb-1">Faturamento bruto</p>
          <p className="text-lg font-bold text-white">{formatCurrency(grossRevenue)}</p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-amber-500/20 to-amber-600/20 rounded-xl p-3 border border-amber-500/30"
        >
          <p className="text-[10px] text-amber-300 mb-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Lucro líquido
          </p>
          <p className="text-lg font-bold text-amber-400">{formatCurrency(netProfit)}</p>
        </motion.div>
      </div>
    </div>
  );
}