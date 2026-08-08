import React from 'react';
import { motion } from 'framer-motion';
import { XCircle } from 'lucide-react';

export default function LossReasonsPanel({ lostProjects = [], lostByReason = {}, periodIn = '', onOpenDetail }) {
  const total = lostProjects.length;
  const topEntry = Object.entries(lostByReason).sort((a, b) => b[1] - a[1])[0];
  const pct = topEntry && total > 0 ? Math.round((topEntry[1] / total) * 100) : 0;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onOpenDetail}
      className="h-full w-full rounded-[16px] border border-[#E7DED2] bg-[#FCF8F4] p-3 text-left shadow-[0_8px_24px_rgba(35,31,32,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(35,31,32,0.08)]"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-red-50">
          <XCircle className="h-4 w-4 text-red-500" strokeWidth={1.8} />
        </div>
        <div>
          <h3 className="text-[13px] font-semibold leading-tight text-[#231F20]">Motivos de perda</h3>
          <p className="text-[11px] text-[#7A736C]">{total} {total === 1 ? 'projeto perdido' : 'projetos perdidos'} {periodIn}</p>
        </div>
      </div>

      {!topEntry ? (
        <p className="mt-3 text-[11px] text-[#6E6761]">Nenhum projeto perdido no período.</p>
      ) : (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[12px] text-[#231F20]">
            <span className="truncate font-medium">{topEntry[0]}</span>
            <span className="text-[#7A736C]">{topEntry[1]} • {pct}%</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-[#EEE4D7]">
            <div className="h-1.5 rounded-full bg-red-400" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      <p className="mt-3 text-[11px] font-medium text-[#8E6E42]">Clique para ver os projetos considerados</p>
    </motion.button>
  );
}