import React from 'react';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';

export default function FloatingActionButton() {
  return (
    <Link to={createPageUrl('NewProject')}>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="group fixed bottom-24 right-5 z-50"
      >
        <button className="flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#C8A66B_0%,#A87E45_100%)] text-white shadow-[0_12px_30px_rgba(168,126,69,0.35)] transition-all duration-300 hover:scale-105 hover:shadow-[0_14px_35px_rgba(168,126,69,0.4)]">
          <Plus className="h-6 w-6" strokeWidth={1.8} />
        </button>
        <div className="pointer-events-none absolute right-16 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="whitespace-nowrap rounded-2xl bg-[#231F20] px-4 py-2 text-xs font-medium text-white shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
            Novo orçamento
          </div>
        </div>
      </motion.div>
    </Link>
  );
}