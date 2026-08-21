import React from 'react';
import GamificationDashboard from '@/components/gamification/GamificationDashboard';
import OperationalPendingList from '@/components/home/OperationalPendingList';

export default function PendingActionsPanel({ pendingEngine, gamificationStats, gamificationReady, onConcludeBirthday, children }) {
  return (
    <div className="space-y-3">
      {children}
      <GamificationDashboard pendingEngine={pendingEngine} stats={gamificationStats} ready={gamificationReady} />
      <OperationalPendingList items={pendingEngine} onConcludeBirthday={onConcludeBirthday} />
    </div>
  );
}