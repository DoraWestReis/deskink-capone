import React from 'react';
import { CalendarDays, Flame, ShieldCheck, Star } from 'lucide-react';
import CollapsibleGamificationCard from '@/components/gamification/CollapsibleGamificationCard';
import { WEEKLY_GOAL_TARGET } from '@/components/gamification/studioGamification';

export const calculateHealthScore = (items = []) => { const weights = { high: 3, medium: 2, low: 1 }; const load = items.reduce((sum, item) => sum + (weights[item.urgency] || 1), 0); return { load, score: load === 0 ? 100 : Math.max(20, 100 - load * 7), isHealthy: load === 0 }; };
export default function StudioHealthScore({ health, state, level }) {
  const color = health.isHealthy ? '#2F6B3D' : health.score >= 70 ? '#B89A66' : health.score >= 45 ? '#D98A3D' : '#C15B5B';
  const stats = [
    { icon: Flame, value: state.current_streak, label: 'Em dia seguidos' },
    { icon: CalendarDays, value: `${state.weekly_healthy_days}/${WEEKLY_GOAL_TARGET}`, label: 'Meta da semana' },
    { icon: Star, value: `Nv ${level.level} · ${level.label}`, label: 'Organização' },
  ];
  return (
    <CollapsibleGamificationCard icon={ShieldCheck} label="Saúde da sua carteira de clientes" summary={health.isHealthy ? 'Tudo em dia' : `${health.load} pendências para resolver`} trailing={<span className="whitespace-nowrap font-display text-2xl text-[#231F20]">{health.score}<small className="ml-1 text-[10px] font-medium text-[#9C8A6D]">/100</small></span>} defaultOpen>
      <div className="h-2 rounded-full bg-[#E7DED2]"><div className="h-full rounded-full transition-all" style={{ width: `${health.score}%`, backgroundColor: color }} /></div>
      <div className="mt-3 grid grid-cols-3 gap-2">{stats.map(({ icon: Icon, value, label }) => <div key={label} className="flex min-w-0 items-center gap-2 rounded-xl border border-[#E7DED2] bg-[#FFFDFC] p-2"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F3E8D6] text-[#9C7A3E]"><Icon className="h-4 w-4" /></span><div className="min-w-0"><p className="truncate text-xs font-bold text-[#231F20]">{value}</p><p className="truncate text-[8px] uppercase tracking-[0.1em] text-[#9C8A6D]">{label}</p></div></div>)}</div>
      <div className="mt-3 flex items-center justify-between text-[9px] text-[#9C8A6D]"><span>Progresso para o Nível {level.level + 1}</span><span>{Math.round(level.progress)}%</span></div>
      <div className="mt-1 h-1.5 rounded-full bg-[#E7DED2]"><div className="h-full rounded-full bg-[#B89A66] transition-all" style={{ width: `${level.progress}%` }} /></div>
      {health.isHealthy && <p className="mt-3 text-xs font-semibold text-[#2F6B3D]">Parabéns! Sua rotina está totalmente em dia.</p>}
    </CollapsibleGamificationCard>
  );
}