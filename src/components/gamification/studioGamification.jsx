export const XP_ACTIONS = { daily_healthy: 20, streak_milestone: 50, achievement: 100, weekly_goal: 80 };
export const WEEKLY_GOAL_TARGET = 5;
export const LEVEL_LABELS = ['Primeira máquina', 'Mão firme', 'Aprendiz da agulha', 'Traço afiado', 'Tatuador residente', 'Punho de aço', 'Mão de mestre', 'Lenda da tinta', 'Ídolo da agulha', 'Deskink Elite'];
const LEVEL_DESCRIPTIONS = ['Começou a jornada no nível 1.', 'Alcançou o nível 2.', 'Alcançou o nível 3.', 'Alcançou o nível 4.', 'Alcançou o nível 5.', 'Alcançou o nível 6.', 'Alcançou o nível 7.', 'Alcançou o nível 8.', 'Alcançou o nível 9.', 'Chegou ao nível máximo, o 10.'];
const A = (id, label, description, test, extra = {}) => ({ id, label, description, xp: 100, test, ...extra });
export const MONTHLY_ACHIEVEMENTS = [
  A('first_month', 'Primeiro traço', 'Deixou as tarefas 100% em dia pela primeira vez no mês.', (_, s) => s.monthly_healthy_days >= 1),
  A('streak_7', 'Linha firme', '7 dias seguidos com as tarefas em dia.', (_, s) => s.current_streak >= 7),
  A('streak_14', 'Pele curada', '14 dias seguidos com as tarefas em dia.', (_, s) => s.current_streak >= 14),
  A('streak_21', 'Traço fechado', '21 dias seguidos com as tarefas em dia.', (_, s) => s.current_streak >= 21),
  A('healthy_10', 'Aquecendo a máquina', '10 dias em dia ao longo do mês.', (_, s) => s.monthly_healthy_days >= 10),
  A('healthy_20', 'Mês de ouro', '20 dias em dia ao longo do mês.', (_, s) => s.monthly_healthy_days >= 20),
  A('weekly_1', 'Primeira sessão', 'Cumpriu a meta semanal 1 vez no mês.', (_, s) => s.monthly_weekly_goals_completed >= 1),
  A('weekly_3', 'Ritmo de máquina', 'Cumpriu a meta semanal 3 vezes no mês.', (_, s) => s.monthly_weekly_goals_completed >= 3),
  A('weekly_4', 'Mês impecável', 'Cumpriu a meta semanal todas as semanas do mês.', (_, s) => s.monthly_weekly_goals_completed >= 4),
  A('monthly_referral', 'Indique e ganhe', 'Indique um cliente e, quando ele fechar (for efetivado), você ganha um prêmio e XP extra.', (x) => x.referralClosedThisMonth >= 1),
];
export const ANNUAL_ACHIEVEMENTS = [
  A('level_1', LEVEL_LABELS[0], LEVEL_DESCRIPTIONS[0], (_, __, level) => level.level >= 1),
  A('level_2', LEVEL_LABELS[1], LEVEL_DESCRIPTIONS[1], (_, __, level) => level.level >= 2),
  A('level_3', LEVEL_LABELS[2], LEVEL_DESCRIPTIONS[2], (_, __, level) => level.level >= 3),
  A('level_4', LEVEL_LABELS[3], LEVEL_DESCRIPTIONS[3], (_, __, level) => level.level >= 4),
  A('level_5', LEVEL_LABELS[4], LEVEL_DESCRIPTIONS[4], (_, __, level) => level.level >= 5),
  A('level_6', LEVEL_LABELS[5], LEVEL_DESCRIPTIONS[5], (_, __, level) => level.level >= 6),
  A('closed_10', 'Fechador de flash', 'Fechou 10 orçamentos no pipeline.', (x) => x.closedCount >= 10),
  A('closed_50', 'Fechador Nato', 'Fechou 50 orçamentos no pipeline.', (x) => x.closedCount >= 50),
  A('full_schedule', 'Flash Day', 'Teve 5 sessões agendadas ao mesmo tempo.', (x) => x.scheduledCount >= 5),
  A('ltv_50', 'Full blackout', 'Atingiu R$ 50 mil em faturamento histórico.', (x) => x.totalLTV >= 50000),
  A('profiles_10', 'Ficha completa', 'Cadastrou 20 clientes com ficha completa (WhatsApp, e-mail e nascimento).', (x) => x.completeProfilesCount >= 20),
  A('level_7', LEVEL_LABELS[6], LEVEL_DESCRIPTIONS[6], (_, __, level) => level.level >= 7),
  A('level_8', LEVEL_LABELS[7], LEVEL_DESCRIPTIONS[7], (_, __, level) => level.level >= 8),
  A('level_9', LEVEL_LABELS[8], LEVEL_DESCRIPTIONS[8], (_, __, level) => level.level >= 9),
  A('level_10', LEVEL_LABELS[9], LEVEL_DESCRIPTIONS[9], (_, __, level) => level.level >= 10),
  A('closed_100', 'Booking lotado', 'Fechou 100 orçamentos no pipeline.', (x) => x.closedCount >= 100),
  A('ltv_150', 'Aplicação Perfeita', 'Atingiu R$ 150 mil em faturamento histórico.', (x) => x.totalLTV >= 150000),
  A('organized', 'Traço em dia', 'Deixou as tarefas 100% em dia, sem nenhuma pendência travando os projetos.', (x) => x.hasNoPendings),
  A('word_of_mouth', 'Boca a boca', 'Indicou 10 tatuadores para o DeskInk — nosso maior parceiro de indicações.', (x) => x.deskinkReferralsCount >= 10),
  A('secret_30', 'Brinde surpresa', 'Um prêmio secreto guardado a diamante. Continue evoluindo para descobrir o que é. 💎', (_, s) => s.longest_streak >= 30, { mystery: true }),
];
export const xpToLeaveLevel = (level) => 300 * level;
export const xpParaSairDoNivel = xpToLeaveLevel;
export function getLevelData(xp = 0) { let level = 1, spent = 0; while (level < 10 && xp >= spent + xpToLeaveLevel(level)) { spent += xpToLeaveLevel(level); level++; } const needed = xpToLeaveLevel(level); return { level, label: LEVEL_LABELS[level - 1], current: xp - spent, needed, progress: level === 10 ? 100 : Math.min(100, ((xp - spent) / needed) * 100) }; }
const localKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const weekKey = (d = new Date()) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + 4 - (x.getDay() || 7)); const y = new Date(x.getFullYear(), 0, 1); return `${x.getFullYear()}-W${String(Math.ceil((((x - y) / 86400000) + 1) / 7)).padStart(2, '0')}`; };
const defaults = (today, month, week) => ({ current_streak: 0, longest_streak: 0, xp: 0, monthly_xp: 0, unlocked_achievements: [], monthly_unlocked_achievements: [], current_month_key: month, weekly_goal_week_key: week, weekly_healthy_days: 0, weekly_goal_completed: false, weekly_goals_completed_total: 0, monthly_weekly_goals_completed: 0, monthly_healthy_days: 0, deskink_referrals_count: 0, journey_started_at: today });
export function evaluateGamification(saved = {}, isHealthy, stats = {}, now = new Date()) {
  const today = localKey(now), month = today.slice(0, 7), week = weekKey(now); let state = { ...defaults(today, month, week), ...saved }; const before = JSON.stringify(state); const events = { celebrate: false, weeklyGoalCompleted: false, justUnlocked: [] };
  if (state.current_month_key !== month) state = { ...state, current_month_key: month, current_streak: 0, monthly_xp: 0, monthly_healthy_days: 0, monthly_weekly_goals_completed: 0, monthly_unlocked_achievements: [] };
  if (state.weekly_goal_week_key !== week) state = { ...state, weekly_goal_week_key: week, weekly_healthy_days: 0, weekly_goal_completed: false };
  if (state.last_checked_date !== today) { const yesterday = localKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)); state.last_checked_date = today; if (isHealthy) { state.current_streak = state.last_healthy_date === yesterday ? state.current_streak + 1 : 1; state.longest_streak = Math.max(state.longest_streak, state.current_streak); state.last_healthy_date = today; state.monthly_healthy_days++; state.weekly_healthy_days++; state.xp += XP_ACTIONS.daily_healthy; state.monthly_xp += XP_ACTIONS.daily_healthy; events.celebrate = state.current_streak === 1; if ([7, 14, 21].includes(state.current_streak)) { state.xp += XP_ACTIONS.streak_milestone; state.monthly_xp += XP_ACTIONS.streak_milestone; } } else state.current_streak = 0; }
  if (!state.weekly_goal_completed && state.weekly_healthy_days >= WEEKLY_GOAL_TARGET) { state.weekly_goal_completed = true; state.weekly_goals_completed_total++; state.monthly_weekly_goals_completed++; state.xp += XP_ACTIONS.weekly_goal; state.monthly_xp += XP_ACTIONS.weekly_goal; events.weeklyGoalCompleted = true; }
  state.deskink_referrals_count = stats.deskinkReferralsCount || state.deskink_referrals_count || 0;
  const unlock = (list, field, level) => list.forEach((a) => { if (!state[field].includes(a.id) && a.test(stats, state, level)) { state[field] = [...state[field], a.id]; state.xp += XP_ACTIONS.achievement; state.monthly_xp += XP_ACTIONS.achievement; events.justUnlocked.push(a.id); } }); unlock(MONTHLY_ACHIEVEMENTS, 'monthly_unlocked_achievements', getLevelData(state.xp)); unlock(ANNUAL_ACHIEVEMENTS, 'unlocked_achievements', getLevelData(state.xp));
  return { state, level: getLevelData(state.xp), events, changed: before !== JSON.stringify(state) };
}