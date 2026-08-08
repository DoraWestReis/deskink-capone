import React from 'react';
import { motion } from 'framer-motion';

export default function InsightRankingPanel({ icon: Icon, title, subtitle, items = [], barClass = 'bg-[#B89A66]', delay = 0 }) {
  const maximum = Math.max(...items.map((item) => Number(item.progress) || 0), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="h-full rounded-[16px] border border-[#E7DED2] bg-[#FCF8F4] p-3 shadow-[0_8px_24px_rgba(35,31,32,0.05)]"
    >
      <div className="mb-3 flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-[#F3E8D6]">
          <Icon className="h-3.5 w-3.5 text-[#9C8A6D]" strokeWidth={1.8} />
        </div>
        <div className="min-w-0">
          <h3 className="text-[13px] font-semibold text-[#231F20]">{title}</h3>
          <p className="truncate text-[10.5px] text-[#7A736C]">{subtitle}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="py-4 text-[11px] text-[#7A736C]">Nenhum dado disponível ainda.</p>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between gap-3 text-[11px]">
                <span className="truncate font-medium text-[#231F20]">{item.label}</span>
                <span className="shrink-0 text-[#6E6761]">{item.value}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#EEE4D7]">
                <div className={`h-full rounded-full ${barClass}`} style={{ width: `${Math.max(4, ((Number(item.progress) || 0) / maximum) * 100)}%` }} />
              </div>
              {item.meta && <p className="mt-0.5 text-[9.5px] text-[#9A9188]">{item.meta}</p>}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}