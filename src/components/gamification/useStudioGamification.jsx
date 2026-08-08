import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { base44 } from '@/api/base44Client';
import { evaluateGamification, getLevelData } from '@/components/gamification/studioGamification';

export default function useStudioGamification(isHealthy, stats, ready) {
  const started = useRef(false); const [state, setState] = useState(null); const [justUnlocked, setJustUnlocked] = useState([]);
  useEffect(() => {
    if (!ready || started.current) return; started.current = true;
    const run = async () => {
      const records = await base44.entities.StudioGamification.list('-created_date', 1);
      const saved = records[0] || {}; const result = evaluateGamification(saved, isHealthy, stats);
      if (result.changed) { const { id, created_date, updated_date, created_by_id, ...data } = result.state; if (saved.id) await base44.entities.StudioGamification.update(saved.id, data); else await base44.entities.StudioGamification.create(data); }
      setState(result.state); setJustUnlocked(result.events.justUnlocked);
      if ((result.events.celebrate || result.events.weeklyGoalCompleted) && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) confetti({ particleCount: result.events.weeklyGoalCompleted ? 120 : 70, spread: 70, colors: ['#B89A66', '#E7C990', '#2F6B3D'] });
    }; run();
  }, [isHealthy, ready, stats]);
  return { state, level: getLevelData(state?.xp || 0), justUnlocked, clearJustUnlocked: () => setJustUnlocked([]) };
}