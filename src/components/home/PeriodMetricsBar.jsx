import React from 'react';
import { motion } from 'framer-motion';
import AnimatedNumber from '@/components/home/AnimatedNumber';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const currency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

export default function PeriodMetricsBar({ profit, revenue, goal, progress, onProfitClick, onRevenueClick }) {
  const metrics = [
    { label: 'Lucro', value: profit, action: onProfitClick },
    { label: 'Faturamento', value: revenue, action: onRevenueClick },
    { label: 'Meta', value: goal, progress },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid overflow-hidden rounded-2xl border border-[#E7DED2] bg-[#FCF8F4] shadow-[0_10px_30px_rgba(35,31,32,0.05)] sm:grid-cols-3">
      <TooltipProvider delayDuration={200}>
        {metrics.map((metric, index) => {
          const Tag = metric.action ? 'button' : 'div';
          const metricElement = (
            <Tag type={metric.action ? 'button' : undefined} onClick={metric.action} className={`p-4 text-left transition-colors sm:p-5 ${metric.action ? 'cursor-pointer hover:bg-[#F3ECE3] focus-visible:bg-[#F3ECE3] focus-visible:outline-none' : ''} ${index ? 'border-t border-[#E7DED2] sm:border-l sm:border-t-0' : ''}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] uppercase tracking-[0.14em] text-[#9C8A6D]">• {metric.label}</p>
                {metric.progress !== undefined && <span className="text-[10px] text-[#B08954]">{metric.progress.toFixed(0)}%</span>}
              </div>
              <p className="mt-1 text-lg font-display text-[#231F20]"><AnimatedNumber value={metric.value} format={currency} /></p>
              {metric.progress !== undefined && <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#E9DCC6]"><motion.div initial={{ width: 0 }} animate={{ width: `${metric.progress}%` }} transition={{ duration: 0.8 }} className="h-full bg-[#B89A66]" /></div>}
            </Tag>
          );

          if (!metric.action) return <React.Fragment key={metric.label}>{metricElement}</React.Fragment>;
          return (
            <Tooltip key={metric.label}>
              <TooltipTrigger asChild>{metricElement}</TooltipTrigger>
              <TooltipContent side="top" sideOffset={6} className="bg-[#18151B] text-[10px] text-white">Ver o que compõe este valor</TooltipContent>
            </Tooltip>
          );
        })}
      </TooltipProvider>
    </motion.div>
  );
}