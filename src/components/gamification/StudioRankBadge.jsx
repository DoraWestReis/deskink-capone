import React from 'react';
import { Rocket, Trophy } from 'lucide-react';
import CollapsibleGamificationCard from '@/components/gamification/CollapsibleGamificationCard';

const ranks = [{ name: 'Bronze', color: '#9A6A48', gradient: 'from-[#8B5E3C] to-[#C18A5B]' }, { name: 'Prata', color: '#7D858C', gradient: 'from-[#8E969C] to-[#D7DADD]' }, { name: 'Ouro', color: '#A77B25', gradient: 'from-[#B58B32] to-[#E7C990]' }, { name: 'Diamante', color: '#56899A', gradient: 'from-[#66A3B8] to-[#BDE8F2]' }, { name: 'Elite', color: '#765391', gradient: 'from-[#65427D] to-[#B88BD1]' }];
export function getRankData(state, level) { const raw = level.level * 12 + Math.min(state.current_streak, 60) * 2 + state.weekly_goals_completed_total * 6 + state.xp / 100; const percentile = Math.min(99, Math.round((raw / (raw + 100)) * 100)); const index = Math.min(4, Math.floor(percentile / 20)); return { ...ranks[index], percentile, next: index === 4 ? 100 : (index + 1) * 20, progress: index === 4 ? 100 : ((percentile - index * 20) / 20) * 100 }; }
export default function StudioRankBadge({ state, level }) {
  const rank = getRankData(state, level);
  return (
    <CollapsibleGamificationCard icon={Trophy} label={`Ranking Deskink · ${rank.name}`} summary="Acima da média dos tatuadores" defaultOpen>
      <div className="flex items-center justify-between gap-3"><p className="font-display text-sm text-[#231F20]">Acima da média dos tatuadores</p><span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold text-emerald-700"><Rocket className="h-3 w-3" />subindo</span></div>
      <div className="mt-4 h-1.5 rounded-full bg-[#E7DED2]"><div className="h-full rounded-full bg-[#92999F] transition-all" style={{ width: `${rank.progress}%` }} /></div>
      <p className="mt-3 flex items-center justify-end gap-1 text-[9px] text-[#B08954]"><span>⚡</span>{rank.progress.toFixed(0)}% rumo à próxima faixa</p>
    </CollapsibleGamificationCard>
  );
}