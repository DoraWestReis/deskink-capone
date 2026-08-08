import React from 'react';
import { Link } from 'react-router-dom';
import { LogOut, Settings, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function HomeActionBar() {
  const openCover = () => {
    sessionStorage.removeItem('deskink_cover_seen');
    window.location.reload();
  };

  return (
    <div className="flex shrink-0 items-center rounded-2xl border border-white/10 bg-white/[0.04] p-1.5 text-white/65 backdrop-blur-xl">
      <button onClick={openCover} className="flex h-9 items-center gap-2 rounded-xl px-3 transition hover:bg-white/10 hover:text-white">
        <Sparkles className="h-4 w-4" /><span className="hidden sm:inline">Início</span>
      </button>
      <Link to="/Settings" aria-label="Configurações" className="flex h-9 w-9 items-center justify-center rounded-xl transition hover:bg-white/10 hover:text-white"><Settings className="h-4 w-4" /></Link>
      <button onClick={() => base44.auth.logout()} aria-label="Sair" className="flex h-9 w-9 items-center justify-center rounded-xl transition hover:bg-white/10 hover:text-white"><LogOut className="h-4 w-4" /></button>
    </div>
  );
}