import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ─── Configuração de schedules por etapa ───────────────────────────────────
const FOLLOW_UP_SCHEDULES = {
  followup_orcamento: [
    { step_number: 1, step_label: 'Reabertura', multiplier: 1 },
    { step_number: 2, step_label: 'Reforço', multiplier: 2 },
    { step_number: 3, step_label: 'Direcionamento', multiplier: 3 },
    { step_number: 4, step_label: 'Demissão', multiplier: 4 },
  ],
  followup_fechamento: [
    { step_number: 1, step_label: 'Pós-avaliação', multiplier: 1 },
    { step_number: 2, step_label: 'Reforço', multiplier: 2 },
    { step_number: 3, step_label: 'Retomada', multiplier: 3 },
    { step_number: 4, step_label: 'Última chamada', multiplier: 4 },
    { step_number: 5, step_label: 'Demissão', multiplier: 5 },
  ],
  aguardando_sinal: [
    { step_number: 1, step_label: 'Cobrança de sinal', multiplier: 1 },
  ],
  revisao: [
    { step_number: 1, step_label: '1º Contato de Revisão', days_offset: 7 },
    { step_number: 2, step_label: '2º Contato de Revisão', days_offset: 15 },
    { step_number: 3, step_label: '3º Contato de Revisão', days_offset: 30 },
  ],
  pos_venda: [
    { step_number: 1, step_label: 'Pós-venda', multiplier: 1 },
  ],
};

// Etapas que geram follow-ups automaticamente
const ACTIVE_STAGES = [
  'followup_orcamento',
  'followup_fechamento',
  'aguardando_sinal',
  'revisao',
  'pos_venda',
];

// Tipos de tarefa que podem ser descartados ao mudar de etapa
const DISMISSABLE_TYPES = [
  'followup_orcamento',
  'followup_fechamento',
  'aguardando_sinal',
  'revisao',
  'pos_venda',
  'session_reminder',
];

// ─── Utilidades de data (fuso America/Sao_Paulo) ──────────────────────────
function toLocalDateString(value) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function addDaysToLocalDate(value, days) {
  const date = new Date(`${toLocalDateString(value)}T12:00:00-03:00`);
  date.setDate(date.getDate() + days);
  return toLocalDateString(date);
}

// ─── Lógica de data-base por etapa ─────────────────────────────────────────
function getBaseDate(project, client) {
  const stage = project.pipeline_stage;
  const fallback = client?.registration_date || project.stage_updated_at || project.created_date;

  if (stage === 'revisao') {
    // Base: data real da tatuagem ou, se não houver, data da sessão agendada
    return project.tattoo_date || project.session_date || fallback;
  }
  if (stage === 'pos_venda') {
    return project.post_sale_contact_date || project.revision_datetime || project.revision_date || fallback;
  }
  if (stage === 'followup_orcamento') {
    return client?.registration_date || project.evaluation_date || fallback;
  }
  if (stage === 'followup_fechamento') {
    return project.evaluation_date || project.closing_date || fallback;
  }
  if (stage === 'aguardando_sinal') {
    return project.stage_updated_at || fallback;
  }
  return fallback;
}

// ─── Intervalo de dias conforme settings ───────────────────────────────────
function getConfiguredDays(stage, settings) {
  if (stage === 'followup_orcamento') return Number(settings.followup_orcamento_days) || 3;
  if (stage === 'followup_fechamento') return Number(settings.followup_fechamento_days) || 3;
  if (stage === 'aguardando_sinal') return Number(settings.aguardando_sinal_days) || 3;
  if (stage === 'revisao') return 0; // revisão usa data direta
  if (stage === 'pos_venda') return Number(settings.pos_venda_days) || 60;
  return 0;
}

// ─── Mensagem de follow-up ─────────────────────────────────────────────────
function buildMessage(followUpType, stepLabel, clientName) {
  if (followUpType === 'followup_orcamento') {
    return `${stepLabel} de follow-up de orçamento com ${clientName}.`;
  }
  if (followUpType === 'followup_fechamento') {
    return `${stepLabel} de follow-up de fechamento com ${clientName}.`;
  }
  if (followUpType === 'aguardando_sinal') {
    return `Cobrar o sinal de ${clientName} e confirmar o avanço do projeto.`;
  }
  if (followUpType === 'revisao') {
    return `${stepLabel}: acompanhar cicatrização e contatar ${clientName}.`;
  }
  if (followUpType === 'pos_venda') {
    return `Contato de pós-venda com ${clientName}.`;
  }
  if (followUpType === 'session_reminder') {
    return `Lembrete de sessão com ${clientName}.`;
  }
  return `${stepLabel} com ${clientName}.`;
}

// ─── Gera tarefas de lembrete de sessão ────────────────────────────────────
function buildSessionReminderTask(project) {
  if (!project.session_date) return null;

  const sessionStages = ['agendado', 'agendado_orcamento_presencial'];
  if (!sessionStages.includes(project.pipeline_stage)) return null;

  const today = toLocalDateString(new Date());
  const tomorrow = addDaysToLocalDate(new Date(), 1);
  const sessionDate = toLocalDateString(project.session_date);

  if (sessionDate !== today && sessionDate !== tomorrow) return null;

  const isToday = sessionDate === today;
  return {
    project_id: project.id,
    client_name: project.client_name,
    follow_up_type: 'session_reminder',
    step_number: 1,
    step_label: 'Lembrete',
    due_date: sessionDate,
    status: 'pending',
    message: isToday
      ? `Confirmar a sessão de hoje com ${project.client_name}.`
      : `Lembrar ${project.client_name} da sessão de amanhã.`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HANDLER PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));

    // ── Identificar o projeto ──────────────────────────────────────────
    const projectId = payload?.data?.id || payload?.event?.entity_id || payload?.project_id;
    if (!projectId) {
      return Response.json({ success: false, message: 'Nenhum projeto identificado.' });
    }

    // ── Carregar dados em paralelo ─────────────────────────────────────
    const [projectList, settingsList] = await Promise.all([
      base44.asServiceRole.entities.Project.filter({ id: projectId }),
      base44.asServiceRole.entities.FollowUpSettings.list(),
    ]);

    const project = projectList[0];
    if (!project) {
      return Response.json({ success: false, message: 'Projeto não encontrado.' }, { status: 404 });
    }

    const settings = settingsList[0] || {};

    // Carregar cliente e tarefas em paralelo
    const [clientList, allTasks] = await Promise.all([
      project.client_id
        ? base44.asServiceRole.entities.Client.filter({ id: project.client_id }, '-created_date', 1)
        : Promise.resolve([]),
      base44.asServiceRole.entities.FollowUpTask.filter({ project_id: project.id }, '-created_date', 500),
    ]);

    const client = clientList[0] || null;
    const currentStage = project.pipeline_stage;
    const previousStage = payload?.old_data?.pipeline_stage;
    const stageChanged = previousStage && previousStage !== currentStage;

    // ── Verificar se houve mudança relevante (para updates) ────────────
    if (payload?.event?.type === 'update') {
      const changedFields = payload?.changed_fields || [];
      const relevantFields = [
        'pipeline_stage', 'session_date', 'revision_date', 'revision_datetime',
        'tattoo_date', 'evaluation_date', 'closing_date', 'post_sale_contact_date',
        'post_sale_status', 'stage_updated_at',
      ];
      const hasRelevantChange = changedFields.some((f) => relevantFields.includes(f));
      if (!hasRelevantChange) {
        return Response.json({ success: true, message: 'Nenhuma mudança relevante.', created: 0, dismissed: 0 });
      }
    }

    // ── Separar tarefas por status ─────────────────────────────────────
    const pendingTasks = allTasks.filter((t) => t.status === 'pending');
    const completedOrDismissed = allTasks.filter((t) => t.status === 'completed' || t.status === 'dismissed');

    // ── Se pós-venda já foi marcado como feito, dismiss tudo ───────────
    if (currentStage === 'pos_venda' && project.post_sale_status === 'feito') {
      const toDismiss = pendingTasks.filter((t) => DISMISSABLE_TYPES.includes(t.follow_up_type));
      await Promise.all(
        toDismiss.map((t) => base44.asServiceRole.entities.FollowUpTask.update(t.id, { status: 'dismissed' }))
      );
      return Response.json({ success: true, message: 'Pós-venda já feito, tarefas descartadas.', created: 0, dismissed: toDismiss.length });
    }

    // ── DISMISS: tarefas pendentes de tipos "descartáveis" ─────────────
    // Ao mudar de etapa: dismiss TODAS as pendentes descartáveis
    // Ao permanecer na mesma etapa: NÃO dispensar (manter pendentes intactas)
    let dismissedCount = 0;
    if (stageChanged) {
      const toDismiss = pendingTasks.filter((t) => DISMISSABLE_TYPES.includes(t.follow_up_type));
      await Promise.all(
        toDismiss.map((t) => base44.asServiceRole.entities.FollowUpTask.update(t.id, { status: 'dismissed' }))
      );
      dismissedCount = toDismiss.length;
    }

    // ── VERIFICAR se a etapa atual gera follow-ups ─────────────────────
    if (!ACTIVE_STAGES.includes(currentStage)) {
      // Também verifica lembrete de sessão para etapas como 'agendado'
      const sessionTask = buildSessionReminderTask(project);
      if (sessionTask) {
        const existingReminder = allTasks.find(
          (t) => t.follow_up_type === 'session_reminder' && t.step_number === 1 && ['completed', 'dismissed'].includes(t.status)
        );
        if (!existingReminder) {
          await base44.asServiceRole.entities.FollowUpTask.create(sessionTask);
          return Response.json({ success: true, created: 1, dismissed: dismissedCount, stage: currentStage });
        }
      }
      return Response.json({ success: true, message: 'Etapa sem follow-up automático.', created: 0, dismissed: dismissedCount, stage: currentStage });
    }

    // ── Mesma etapa: manter tarefas pendentes existentes intactas ──
    // CRITICAL FIX: Quando a etapa NÃO mudou, NUNCA interferir em tasks.
    // O rescheduleFollowUpTask atualiza campos de data no Project, o que
    // dispara esta automação. Se interferirmos, criamos uma race condition
    // que marca tasks recém-criadas como completed/dismissed indevidamente.
    // A única forma de alterar tasks existentes é via reagendamento manual.
    if (!stageChanged) {
      const currentPending = pendingTasks.filter((t) => t.follow_up_type === currentStage);

      // Se já existem tarefas pendentes, preservar suas datas
      if (currentPending.length > 0) {
        return Response.json({
          success: true,
          message: 'Tarefas pendentes existentes preservadas (mesma etapa, sem recálculo).',
          created: 0,
          updated: 0,
          dismissed: 0,
          stage: currentStage,
        });
      }

      // RACE CONDITION GUARD: Se alguma task do tipo atual foi criada ou
      // atualizada nos últimos 60 segundos, outra função (ex: rescheduleFollowUpTask)
      // provavelmente acabou de gerenciar as tasks. Não interferir.
      const now = Date.now();
      const recentThreshold = 60 * 1000; // 60 segundos
      const recentlyTouched = allTasks.some((t) => {
        if (t.follow_up_type !== currentStage) return false;
        const updatedAt = t.updated_date ? new Date(t.updated_date).getTime() : 0;
        const createdAt = t.created_date ? new Date(t.created_date).getTime() : 0;
        return (now - updatedAt < recentThreshold) || (now - createdAt < recentThreshold);
      });

      if (recentlyTouched) {
        return Response.json({
          success: true,
          message: 'Tasks recentemente gerenciadas por outra função. Ignorando para evitar race condition.',
          created: 0,
          dismissed: 0,
          stage: currentStage,
        });
      }

      // Se NÃO há pendentes e nenhuma foi tocada recentemente,
      // verificar se CADA step foi completado pelo usuário
      const userCompletedSteps = allTasks.filter(
        (t) => t.follow_up_type === currentStage && t.status === 'completed'
      );
      const schedule = FOLLOW_UP_SCHEDULES[currentStage] || [];
      const allStepsCompleted = schedule.length > 0 && schedule.every(
        (step) => userCompletedSteps.some((t) => t.step_number === step.step_number)
      );
      if (allStepsCompleted) {
        return Response.json({
          success: true,
          message: 'Todas as tarefas desta etapa já foram concluídas pelo usuário.',
          created: 0,
          dismissed: 0,
          stage: currentStage,
        });
      }
    }

    // ── GERAR novas tarefas para a etapa atual ───────────────────
    const baseDateForCreation = getBaseDate(project, client);
    if (!baseDateForCreation) {
      return Response.json({ success: true, message: 'Sem data-base para gerar follow-ups.', created: 0, dismissed: dismissedCount, stage: currentStage });
    }

    const schedule = FOLLOW_UP_SCHEDULES[currentStage] || [];
    const configuredDays = getConfiguredDays(currentStage, settings);
    const tasksToCreate = [];

    for (const step of schedule) {
      // Verificar se este step já existe como pendente (evitar duplicidade)
      const alreadyPending = pendingTasks.find(
        (t) => t.follow_up_type === currentStage && t.step_number === step.step_number
      );
      if (alreadyPending) continue;

      // Verificar se este step específico já foi concluído pelo usuário
      // Não considerar 'dismissed' como bloqueio — tarefas dispensadas podem ser recriadas
      const alreadyCompleted = allTasks.find(
        (t) => t.follow_up_type === currentStage && t.step_number === step.step_number && t.status === 'completed'
      );
      if (alreadyCompleted) continue;

      const dueDate = currentStage === 'revisao'
        ? addDaysToLocalDate(baseDateForCreation, step.days_offset)
        : addDaysToLocalDate(baseDateForCreation, configuredDays * step.multiplier);

      tasksToCreate.push({
        project_id: project.id,
        client_name: project.client_name,
        follow_up_type: currentStage,
        step_number: step.step_number,
        step_label: step.step_label,
        due_date: dueDate,
        status: 'pending',
        message: buildMessage(currentStage, step.step_label, project.client_name),
      });
    }

    if (tasksToCreate.length > 0) {
      await base44.asServiceRole.entities.FollowUpTask.bulkCreate(tasksToCreate);
    }

    return Response.json({
      success: true,
      created: tasksToCreate.length,
      dismissed: dismissedCount,
      stage: currentStage,
      base_date: baseDateForCreation,
    });
  } catch (error) {
    console.error('manageProjectFollowUps error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});