import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import OperationalPendingItem from '@/components/home/OperationalPendingItem';

const storageKey = 'deskink-operational-pendings-hidden';

export default function OperationalPendingList({ items = [] }) {
  const [hidden, setHidden] = useState(() => localStorage.getItem(storageKey) === '1');
  if (!items.length) return null;

  const toggleHidden = () => {
    const next = !hidden;
    setHidden(next);
    localStorage.setItem(storageKey, next ? '1' : '0');
  };

  if (hidden) {
    return <button type="button" onClick={toggleHidden} className="ml-auto flex items-center gap-2 rounded-full border border-[#E7DED2] bg-[#FCF8F4] px-3 py-2 text-[10px] font-semibold text-[#7A736C]"><Eye className="h-3.5 w-3.5" />Mostrar pendências</button>;
  }

  return (
    <div className="space-y-2 rounded-2xl border border-[#E7DED2] bg-[#FCF8F4] p-3">
      <div className="flex items-center justify-end">
        <button type="button" onClick={toggleHidden} className="flex items-center gap-2 rounded-full px-2 py-1 text-[10px] font-semibold text-[#7A736C] hover:bg-[#F3E8D6]"><EyeOff className="h-3.5 w-3.5" />Ocultar seção</button>
      </div>
      {items.map((item) => (
        <OperationalPendingItem key={item.engine_id || item.id} item={item} />
      ))}
    </div>
  );
}