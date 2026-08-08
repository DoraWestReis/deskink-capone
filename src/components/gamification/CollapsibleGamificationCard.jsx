import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

export default function CollapsibleGamificationCard({ icon: Icon, label, summary, trailing, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-[#E7DED2] bg-[#FCF8F4] p-3">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-3 text-left">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F3E8D6] text-[#9C7A3E]"><Icon className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1"><p className="text-[9px] uppercase tracking-[0.16em] text-[#9C8A6D]">{label}</p><p className="truncate font-display text-sm text-[#231F20] sm:text-base">{summary}</p></div>
        {trailing}<ChevronDown className={`h-4 w-4 text-[#9C8A6D] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>{open && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><div className="pt-4">{children}</div></motion.div>}</AnimatePresence>
    </div>
  );
}