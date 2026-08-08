import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

export default function CollapsibleSection({ id, label, title, defaultCollapsed = false, children }) {
  const storageKey = `deskink_home_section_${id}`;
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved === null ? defaultCollapsed : saved === 'true';
  });

  const toggle = () => {
    setCollapsed((current) => {
      localStorage.setItem(storageKey, String(!current));
      return !current;
    });
  };

  return (
    <section>
      <button type="button" onClick={toggle} className="flex w-full items-center justify-between gap-4 text-left">
        <div>
          {label && <p className="text-[10px] uppercase tracking-[0.18em] text-[#9C8A6D]">{label}</p>}
          {title && <h2 className={`${label ? 'mt-1' : ''} text-xl font-display text-[#231F20] sm:text-2xl`}>{title}</h2>}
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#E7DED2] bg-[#FCF8F4] text-[#7A736C]">
          <ChevronDown className={`h-4 w-4 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}