import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const TIME_ZONE = 'America/Sao_Paulo';
const DEFAULT_SETTINGS = { followup_orcamento_days: 3, followup_fechamento_days: 3 };

const FOLLOWUP_ORCAMENTO_STEPS = [
  { step_number: 1, step_label: 'Reabertura' },
  { step_number: 2, step_label: 'Reforço' },
  { step_number: 3, step_label: 'Direcionamento' },
  { step_number: 4, step_label: 'Demissão' },
];

const FOLLOWUP_FECHAMENTO_STEPS = [
  { step_number: 1, step_label: 'Pós-avaliação' },
  { step_number: 2, step_label: 'Reforço' },
  { step_number: 3, step_label: 'Retomada' },
  { step_number: 4, step_label: 'Última chamada' },
  { step_number: 5, step_label: 'Demissão' },
];

const RESETTABLE_TYPES = ['followup_orcamento', 'followup_fechamento'];

function formatDateParts(value) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function addDaysToLocalDate(value, days) {
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00-03:00`);
  date.setDate(date.getDate() + days);
  return formatDateParts(date);
}

function buildMessage(followUpType, stepLabel, clientName) {
  if (followUpType === 'followup_orcamento') return `${stepLabel} de follow-up de orçamento com ${clientName}.`;
  if (stepLabel === 'Pós-avaliação') return `Pós-avaliação: Entrar em contato com ${clientName}.`;
  if (stepLabel === 'Reforço') return `Reforço de contato para fechamento com ${clientName}.`;
  if (stepLabel === 'Retomada') return `Retomada de negociação com ${clientName}.`;
  if (stepLabel === 'Última chamada') return `Última chamada para fechamento com ${clientName}.`;
  if (stepLabel === 'Demissão') return `Demissão de follow-up de fechamento com ${clientName}.`;
  return `${stepLabel} com ${clientName}.`;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // auth.me() may fail in automation contexts; the handler runs on the service role.
    try { await base44.auth.me(); } catch (_err) { /* ignore */ }

    const payload = await req.json();
    const projectId = payload?.projectId;
    const followUpType = payload?.followUpType;

    if (!projectId || !followUpType) {
      return Response.json({ error: 'projectId e followUpType são obrigatórios.' }, { status: 400 });
    }
    if (!RESETTABLE_TYPES.includes(followUpType)) {
      return Response.json({ error: 'Tipo de follow-up não pode ser reiniciado.' }, { status: 400 });
    }

    const projects = await base44.asServiceRole.entities.Project.filter({ id: projectId });
    const project = projects[0];
    if (!project) return Response.json({ error: 'Projeto não encontrado.' }, { status: 404 });

    const settingsList = await base44.asServiceRole.entities.FollowUpSettings.list();
    const settings = { ...DEFAULT_SETTINGS, ...(settingsList[0] || {}) };
    const existingTasks = await base44.asServiceRole.entities.FollowUpTask.filter({
      project_id: projectId,
      follow_up_type: followUpType,
    }, '-created_date', 500);

    if (existingTasks.length > 0) {
      await base44.asServiceRole.entities.FollowUpTask.deleteMany({
        project_id: projectId,
        follow_up_type: followUpType,
      });
    }

    const clientName = project.client_name || 'Cliente';
    const today = formatDateParts(new Date());
    const steps = followUpType === 'followup_orcamento' ? FOLLOWUP_ORCAMENTO_STEPS : FOLLOWUP_FECHAMENTO_STEPS;
    const configuredDays = followUpType === 'followup_orcamento'
      ? settings.followup_orcamento_days
      : settings.followup_fechamento_days;
    const intervalDays = Number(configuredDays) || 3;
    const newTasks = steps.map((step, index) => ({
      project_id: projectId,
      client_name: clientName,
      follow_up_type: followUpType,
      step_number: step.step_number,
      step_label: step.step_label,
      due_date: addDaysToLocalDate(today, intervalDays * (index + 1)),
      status: 'pending',
      message: buildMessage(followUpType, step.step_label, clientName),
    }));

    await base44.asServiceRole.entities.FollowUpTask.bulkCreate(newTasks);
    return Response.json({ success: true, deleted: existingTasks.length, created: newTasks.length });
  } catch (error) {
    console.error('resetProjectFollowUpTasks error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}