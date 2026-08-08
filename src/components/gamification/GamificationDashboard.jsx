import React from 'react';
import StudioHealthScore, { calculateHealthScore } from '@/components/gamification/StudioHealthScore';
import StudioRankBadge from '@/components/gamification/StudioRankBadge';
import StudioAchievements from '@/components/gamification/StudioAchievements';
import XPCard from '@/components/gamification/XPCard';
import useStudioGamification from '@/components/gamification/useStudioGamification';

export default function GamificationDashboard({ pendingEngine, stats, ready }) {
  const health = calculateHealthScore(pendingEngine); const game = useStudioGamification(health.isHealthy, { ...stats, hasNoPendings: health.isHealthy }, ready);
  if (!game.state) return <div className="mt-4 h-20 animate-pulse rounded-2xl bg-[#F1EAE1]" />;
  return (
    <div className="space-y-3">
      <StudioHealthScore health={health} state={game.state} level={game.level} />
      <div className="grid gap-3 lg:grid-cols-2"><XPCard state={game.state} level={game.level} /><StudioRankBadge state={game.state} level={game.level} /></div>
      <StudioAchievements state={game.state} isAdmin={stats.isAdmin} />
    </div>
  );
}