import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import DeskInkLogo from '@/components/brand/DeskInkLogo';

const COVER_KEY = 'deskink_cover_seen';

export default function SplashCover() {
  const [visible, setVisible] = useState(() => !sessionStorage.getItem(COVER_KEY));

  useEffect(() => {
    document.body.style.overflow = visible ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [visible]);

  const enter = () => {
    sessionStorage.setItem(COVER_KEY, 'true');
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#080608] px-6"
          style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.09) 1px, transparent 1px)', backgroundSize: '22px 22px' }}
        >
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 8 }} transition={{ duration: 0.7, delay: 0.1 }} className="flex flex-col items-center text-center">
            <DeskInkLogo className="h-24 w-24 text-white" />
            <p className="mt-[72px] font-display text-[13px] leading-6 tracking-[-0.03em] text-white/55">
              EVOLUA SEU <span className="text-white">PROCESSO.</span><br />DOMINE SEUS <span className="text-white">RESULTADOS.</span>
            </p>
            <button onClick={enter} className="mt-9 inline-flex h-[38px] w-[170px] items-center justify-center gap-5 rounded-lg border border-white/25 text-[9px] font-bold tracking-[-0.02em] text-white transition hover:border-[#B89A66] hover:text-[#B89A66]">
              ACESSAR ASSISTENTE <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}