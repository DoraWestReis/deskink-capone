export function buildPendingEngine(tasks = [], projects = [], now = new Date(), clients = []) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const elapsedDays = (value) => {
    const date = value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime()) ? Math.floor((today - date) / 86400000) : 0;
  };
  const sessions = projects.filter((project) => project.session_date && elapsedDays(project.session_date) > 0 && !project.is_concluded && !['revisao', 'pos_venda', 'concluido'].includes(project.pipeline_stage)).map((project) => ({ ...project, engine_id: `session-${project.id}`, project_id: project.id, kind: 'session_overdue', days: elapsedDays(project.session_date), urgency: 'high' }));
  const staleLeads = projects.filter((project) => project.pipeline_stage === 'novo_contato' && elapsedDays(project.stage_updated_at || project.created_date) >= 7).map((project) => ({ ...project, engine_id: `lead-${project.id}`, project_id: project.id, kind: 'stale_lead', days: elapsedDays(project.stage_updated_at || project.created_date), urgency: 'high' }));
  const pendingTasks = tasks
    .filter((task) => task.status === 'pending' && task.project_exists !== false)
    .map((task) => ({ ...task, days: task.due_date ? elapsedDays(`${task.due_date}T12:00:00`) : 0 }))
    // só mostra etapas cuja data já chegou
    .filter((task) => task.days >= 0);

  // mantém apenas a etapa mais antiga pendente por projeto + tipo de follow-up
  const currentByGroup = new Map();
  pendingTasks.forEach((task) => {
    const groupKey = `${task.project_id}-${task.follow_up_type}`;
    const existing = currentByGroup.get(groupKey);
    const isEarlier = !existing
      || (task.due_date || '') < (existing.due_date || '')
      || ((task.due_date || '') === (existing.due_date || '') && (task.step_number || 0) < (existing.step_number || 0));
    if (isEarlier) currentByGroup.set(groupKey, task);
  });

  const followUps = Array.from(currentByGroup.values()).map((task) => ({
    ...task,
    engine_id: `task-${task.id}`,
    kind: 'follow_up',
    urgency: task.days > 3 ? 'high' : 'medium',
  }));
  const todayKey = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const birthdays = clients
    .filter((client) => typeof client.birth_date === 'string' && client.birth_date.slice(5, 10) === todayKey)
    .map((client) => ({
      engine_id: `birthday-${client.id}`,
      client_id: client.id,
      client_name: client.name,
      client_whatsapp: client.whatsapp,
      kind: 'birthday',
      days: 0,
      urgency: 'medium',
    }));

  return [...sessions, ...staleLeads, ...followUps, ...birthdays];
}