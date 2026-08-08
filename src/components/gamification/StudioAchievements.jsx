import React from 'react';
import { ANNUAL_ACHIEVEMENTS, MONTHLY_ACHIEVEMENTS } from '@/components/gamification/studioGamification';
import CollapsibleAchievements from '@/components/gamification/CollapsibleAchievements';

export default function StudioAchievements({ state, isAdmin }) {
  const month = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date(`${state.current_month_key}-01T12:00:00`));
  const annualAchievements = ANNUAL_ACHIEVEMENTS.map((achievement) => achievement.id === 'word_of_mouth' ? { ...achievement, progressText: `${Math.min(state.deskink_referrals_count || 0, 10)}/10 indicações efetivadas` } : achievement);
  return (
    <div className="space-y-3">
      <CollapsibleAchievements title={`Conquistas de ${month}`} subtitle="Renovam todo mês — comece o mês zerando essas metas." achievements={MONTHLY_ACHIEVEMENTS} unlocked={state.monthly_unlocked_achievements} isAdmin={isAdmin} />
      <CollapsibleAchievements title="Troféus do ano" subtitle="Ficam para sempre na sua estante." achievements={annualAchievements} unlocked={state.unlocked_achievements} isAdmin={isAdmin} />
    </div>
  );
}