import React from 'react';
import { motion } from 'framer-motion';
import { Target, TrendingUp, Wallet, BarChart3 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
}).format(value || 0);

export default function HomeSummaryCards({ myProfit, monthlyGoal, goalProgress, grossRevenue, onProfitClick }) {
  return (
    <TooltipProvider delayDuration={120}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <motion.button
        type="button"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={onProfitClick}
        className="rounded-[24px] border border-[#E7DED2] bg-[#FCF8F4] p-4 sm:p-5 text-left shadow-[0_10px_30px_rgba(35,31,32,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_34px_rgba(35,31,32,0.08)]"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 cursor-help">
              <TrendingUp className="h-4 w-4 text-emerald-600" strokeWidth={1.8} />
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-[220px] rounded-xl bg-[#231F20] px-3 py-2 text-[11px] leading-relaxed text-white">
            Seu lucro no período filtrado, calculado a partir dos pagamentos confirmados e da sua comissão.
          </TooltipContent>
        </Tooltip>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9C8A6D]">Lucro</p>
        <p className="mt-2 text-lg sm:text-2xl font-semibold text-[#231F20] leading-tight">{formatCurrency(myProfit)}</p>
        <p className="mt-2 text-xs text-[#7A736C]">Retorno do período selecionado</p>
        <p className="mt-3 text-[11px] font-medium text-[#8E6E42]">Clique para ver os dados considerados</p>
      </motion.button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-[24px] border border-[#E7DED2] bg-[#FCF8F4] p-4 sm:p-5 shadow-[0_10px_30px_rgba(35,31,32,0.05)]"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F3E8D6] cursor-help">
              <Target className="h-4 w-4 text-[#B08954]" strokeWidth={1.8} />
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-[220px] rounded-xl bg-[#231F20] px-3 py-2 text-[11px] leading-relaxed text-white">
            Meta mensal definida nas configurações financeiras do app.
          </TooltipContent>
        </Tooltip>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9C8A6D]">Meta mensal</p>
        <p className="mt-2 text-lg sm:text-2xl font-semibold text-[#231F20] leading-tight">{formatCurrency(monthlyGoal)}</p>
        <p className="mt-2 text-xs text-[#7A736C]">Objetivo financeiro configurado</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-[24px] border border-[#E7DED2] bg-[#FCF8F4] p-4 sm:p-5 shadow-[0_10px_30px_rgba(35,31,32,0.05)]"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 cursor-help">
              <BarChart3 className="h-4 w-4 text-sky-600" strokeWidth={1.8} />
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-[220px] rounded-xl bg-[#231F20] px-3 py-2 text-[11px] leading-relaxed text-white">
            Percentual já alcançado da meta mensal, comparando lucro atual com a meta configurada.
          </TooltipContent>
        </Tooltip>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9C8A6D]">Progresso</p>
        <p className="mt-2 text-lg sm:text-2xl font-semibold text-[#231F20] leading-tight">{goalProgress.toFixed(0)}%</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#EFE6DA]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${goalProgress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full rounded-full bg-[#B89A66]"
          />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-[24px] border border-[#2C2530] bg-[linear-gradient(135deg,#2C2530_0%,#1B171F_100%)] p-4 sm:p-5 shadow-[0_12px_30px_rgba(12,10,14,0.22)]"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 cursor-help">
              <Wallet className="h-4 w-4 text-[#E7C990]" strokeWidth={1.8} />
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-[220px] rounded-xl bg-[#231F20] px-3 py-2 text-[11px] leading-relaxed text-white">
            Soma dos valores brutos confirmados no período selecionado.
          </TooltipContent>
        </Tooltip>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#CBB48A]">Faturamento</p>
        <p className="mt-2 text-lg sm:text-2xl font-semibold text-white leading-tight">{formatCurrency(grossRevenue)}</p>
        <p className="mt-2 text-xs text-white/60">Valor bruto confirmado no período</p>
      </motion.div>
      </div>
    </TooltipProvider>
  );
}