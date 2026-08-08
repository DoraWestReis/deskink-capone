import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, Calendar, Columns3, TrendingUp, User, NotebookPen, Gift } from 'lucide-react';
import { motion } from 'framer-motion';

const navItems = [
  { icon: Home, label: 'Home', page: 'Home' },
  { icon: NotebookPen, label: 'InkBoard', page: 'InkBoard', path: '/inkboard' },
  { icon: User, label: 'Clientes', page: 'Clients' },
  { icon: Columns3, label: 'Pipeline', page: 'Pipeline' },
  { icon: Calendar, label: 'Agenda', page: 'Schedule' },
  { icon: TrendingUp, label: 'Análises', page: 'Analyses' },
  { icon: Gift, label: 'Indicações', page: 'Referrals', path: '/referrals' },
];

export default function BottomNav({ currentPage }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E5DDD2] bg-[#FCF8F4]/95 backdrop-blur-xl shadow-[0_-8px_30px_rgba(12,10,14,0.08)] md:bottom-4 md:left-1/2 md:w-[min(720px,calc(100%-2rem))] md:-translate-x-1/2 md:rounded-[28px] md:border">
      <div className="mx-auto max-w-7xl px-3 sm:px-4">
        <div className="flex items-center justify-around py-3">
          {navItems.map((item) => {
            const isActive = currentPage === item.page;
            const Icon = item.icon;

            return (
              <Link
                key={item.page}
                to={item.path || createPageUrl(item.page)}
                className="relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-2 transition-all duration-300 sm:px-3"
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 rounded-2xl bg-[#231F20]"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <Icon
                  className={`relative z-10 h-5 w-5 transition-colors duration-300 ${
                    isActive ? 'text-[#E7C990]' : 'text-[#8B837B]'
                  }`}
                  strokeWidth={1.7}
                />
                <span className={`relative z-10 text-[10px] font-medium transition-colors duration-300 ${
                  isActive ? 'text-white' : 'text-[#8B837B]'
                }`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}