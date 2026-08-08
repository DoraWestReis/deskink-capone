import React from 'react';
import { Zap } from 'lucide-react';
import AnimatedNumber from '@/components/home/AnimatedNumber';
import CollapsibleGamificationCard from '@/components/gamification/CollapsibleGamificationCard';

export default function XPCard({ state, level }) {
  return (
    <CollapsibleGamificationCard icon={Zap} label="XP acumulado" summary={`${state.xp.toLocaleString('pt-BR')} XP`} trailing={<span className="text-xs text-[#B89A66]">+{state.monthly_xp}</span>} defaultOpen>
      <div className="flex items-end justify-between gap-3"><p className="font-display text-lg text-[#231F20]"><AnimatedNumber value={state.xp} format={(value) => Math.round(value).toLocaleString('pt-BR')} /> XP</p><div className="text-right"><p className="text-[8px] uppercase tracking-[0.12em] text-[#9C8A6D]">Neste mês</p><p className="font-display text-sm text-[#B08954]">+{state.monthly_xp}</p></div></div>
      <div className="mt-3 h-1.5 rounded-full bg-[#E7DED2]"><div className="h-full rounded-full bg-[#B89A66] transition-all" style={{ width: `${level.progress}%` }} /></div>
      <p className="mt-2 text-[10px] text-[#9C8A6D]">{level.current.toLocaleString('pt-BR')} / {level.needed.toLocaleString('pt-BR')} XP para o nível {level.level + 1}</p>
      <p className="mt-1 text-[9px] text-[#B0A69B]">XP acumulado desde {new Date(`${state.journey_started_at}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[#E7DED2] pt-3 text-[9px] text-[#9C8A6D]"><b className="uppercase tracking-[0.1em]">Como ganha XP</b><span>Tarefas em dia +20</span><span>Cada conquista +100</span><span>Marco de sequência +50</span><span>Meta semanal +80</span></div>
    </CollapsibleGamificationCard>
  );
}