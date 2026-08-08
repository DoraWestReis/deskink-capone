import React, { useState } from 'react';
import { Clock, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function OperationalPendingItem({ item }) {
  const id = item.engine_id || item.id;
  const storageKey = `deskink-hidden-pending-${id}`;
  const [hidden, setHidden] = useState(() => localStorage.getItem(storageKey) === '1');
  if (hidden) return null;

  const isSession = item.kind === 'session_overdue';
  const isLead = item.kind === 'stale_lead';
  const title = isSession
    ? `Sessão de ${item.client_name || 'cliente'} foi há ${item.days} dias`
    : isLead
      ? `Lead de ${item.client_name || 'cliente'} esfriando (${item.days} dias sem ação)`
      : `${item.client_name || 'Cliente'} — ${item.step_label || 'Follow-up pendente'}`;
  const subtitle = isSession
    ? 'A sessão já passou e a tatuagem ainda não foi marcada como finalizada.'
    : isLead
      ? 'Este contato está parado em “Novo Contato” há bastante tempo.'
      : item.message || 'Existe um follow-up pendente para este projeto.';
  const phone = String(item.client_whatsapp || '').replace(/\D/g, '');
  const hide = () => { localStorage.setItem(storageKey, '1'); setHidden(true); };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-[#FFFCF7] px-3 py-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-amber-500"><Clock className="h-3.5 w-3.5" /></span>
      <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-semibold text-[#3A3431]">{title}</p><p className="truncate text-[9px] text-[#8B837B]">{subtitle}</p></div>
      <div className="flex shrink-0 items-center gap-1">
        {isLead && phone ? <a href={`https://wa.me/${phone}`} target="_blank" rel="noreferrer" className="rounded-full bg-[#231F20] px-3 py-2 text-[9px] font-semibold text-white">WhatsApp</a> : <Link to={`/ProjectDetails?id=${item.project_id}`} className="rounded-full border border-[#E7DED2] bg-white px-3 py-2 text-[9px] font-semibold text-[#3A3431]">Abrir projeto</Link>}
        <button type="button" onClick={hide} title="Ocultar pendência" aria-label="Ocultar pendência" className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E7DED2] bg-white text-[#8B837B] hover:text-[#3A3431]"><EyeOff className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}