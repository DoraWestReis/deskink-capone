import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

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
};

const DEFAULT_DAYS = {
  aguardando_sinal: 3,
  followup_orcamento: 3,
  followup_fechamento: 3,
  pos_venda: 60,
  revisao: 20,
  session_reminder: 1,
};

const DATE_FIELD_BY_TYPE = {
  aguardando_sinal: 'stage_updated_at',
  followup_orcamento: 'evaluation_date',
  followup_fechamento: 'closing_date',
  pos_venda: 'post_sale_contact_date',
  revisao: 'revision_date',
  session_reminder: 'session_date',
};

function addDays(dateString, days) {
  const date = new Date(`${dateString}T12:00:00-03:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

// Normalize entity record — SDK may return {data: {...}} or flat object
function normalizeRecord(record) {
  if (!record) return null;
  if (record.data && typeof record.data === 'object' && record.data.project_id) {
    return { ...record.data, id: record.id || record.data.id };
  }
  return record;
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    // auth.me() can fail when the call comes from an automation context.
    // The whole handler runs on the service role, so a missing user is not fatal.
    try { await base44.auth.me(); } catch (_err) { /* ignore */ }

    const { taskId, newDueDate, customDays } = await req.json();

    if (!taskId) {
      return Response.json({ error: 'Task ID obrigatório.' }, { status: 400 });
    }

    // Fetch the task
    const taskRecords = await base44.asServiceRole.entities.FollowUpTask.filter({ id: taskId }, '-created_date', 1);
    const task = normalizeRecord(taskRecords[0]);

    if (!task) {
      return Response.json({ error: 'Follow-up não encontrado.' }, { status: 404 });
    }

    console.log('[reschedule] Task found:', JSON.stringify({ id: task.id, step_number: task.step_number, follow_up_type: task.follow_up_type, status: task.status }));

    // Fetch settings
    const settingsList = await base44.asServiceRole.entities.FollowUpSettings.list();
    const settings = settingsList[0] || {};
    const settingsDaysMap = {
      aguardando_sinal: settings.aguardando_sinal_days,
      followup_orcamento: settings.followup_orcamento_days,
      followup_fechamento: settings.followup_fechamento_days,
      pos_venda: settings.pos_venda_days,
      revisao: settings.revision_days,
      session_reminder: 1,
    };

    const configuredDays = Number(settingsDaysMap[task.follow_up_type]) || DEFAULT_DAYS[task.follow_up_type] || 3;

    // Priority: customDays > newDueDate (calendar pick) > default offset from task's due_date
    const taskDueDate = task.due_date || new Date().toISOString().slice(0, 10);
    const todayStr = new Date().toISOString().slice(0, 10);
    let baseDueDate;
    if (customDays) {
      // User typed number of days to postpone — calculate from task's original due_date
      baseDueDate = addDays(taskDueDate, Number(customDays));
    } else if (newDueDate) {
      // User picked a specific date from the calendar
      baseDueDate = newDueDate;
    } else {
      // Fallback: add configured days from task's due_date
      baseDueDate = addDays(taskDueDate, configuredDays);
    }

    // CRITICAL: Never allow baseDueDate to be in the past — adjust to today if needed
    if (baseDueDate < todayStr) {
      console.log('[reschedule] baseDueDate', baseDueDate, 'is in the past, adjusting to today:', todayStr);
      baseDueDate = todayStr;
    }

    console.log('[reschedule] baseDueDate calculated:', baseDueDate, '| customDays:', customDays, '| newDueDate:', newDueDate, '| configuredDays:', configuredDays);

    // Step 1: Mark the original task as completed
    await base44.asServiceRole.entities.FollowUpTask.update(task.id, { status: 'completed' });
    console.log('[reschedule] Original task marked completed:', task.id);

    // Step 2: Dismiss ALL other pending tasks of the same type for this project
    const allProjectTasks = await base44.asServiceRole.entities.FollowUpTask.filter(
      { project_id: task.project_id },
      '-created_date',
      200
    );

    const normalizedTasks = allProjectTasks.map(normalizeRecord).filter(Boolean);

    const toDismiss = normalizedTasks.filter((t) =>
      t.id !== task.id &&
      t.follow_up_type === task.follow_up_type &&
      t.status === 'pending'
    );

    console.log('[reschedule] Tasks to dismiss:', toDismiss.length, toDismiss.map(t => ({ id: t.id, step: t.step_number, label: t.step_label })));

    for (const t of toDismiss) {
      await base44.asServiceRole.entities.FollowUpTask.update(t.id, { status: 'dismissed' });
    }

    // Step 3: Create new tasks
    const sequenceSteps = FOLLOW_UP_SCHEDULES[task.follow_up_type] || [];
    let createdTask = null;

    if (sequenceSteps.length > 0) {
      const currentStepNumber = task.step_number || 1;
      const stepsToCreate = sequenceSteps.filter((s) => s.step_number >= currentStepNumber);

      console.log('[reschedule] Steps to create:', stepsToCreate.map(s => ({ step: s.step_number, label: s.step_label })));

      for (const step of stepsToCreate) {
        const offsetFromCurrent = step.step_number - currentStepNumber;
        const stepDueDate = addDays(baseDueDate, configuredDays * offsetFromCurrent);

        const newTask = await base44.asServiceRole.entities.FollowUpTask.create({
          project_id: task.project_id,
          client_name: task.client_name,
          follow_up_type: task.follow_up_type,
          step_number: step.step_number,
          step_label: step.step_label,
          due_date: stepDueDate,
          status: 'pending',
          message: `${step.step_label} de follow-up de ${task.follow_up_type === 'followup_orcamento' ? 'orçamento' : 'fechamento'} com ${task.client_name || 'cliente'}.`,
        });

        console.log('[reschedule] Created task:', JSON.stringify({ id: newTask.id, step: step.step_number, label: step.step_label, due_date: stepDueDate }));

        if (step.step_number === currentStepNumber) {
          createdTask = newTask;
        }
      }
    } else {
      // Non-sequenced follow-up types — just create a single task
      createdTask = await base44.asServiceRole.entities.FollowUpTask.create({
        project_id: task.project_id,
        client_name: task.client_name,
        follow_up_type: task.follow_up_type,
        step_number: task.step_number,
        step_label: task.step_label,
        due_date: baseDueDate,
        status: 'pending',
        message: task.message,
      });

      console.log('[reschedule] Created single task:', JSON.stringify({ id: createdTask.id, due_date: baseDueDate }));
    }

    // Step 4: Update project date field if applicable
    const projectField = DATE_FIELD_BY_TYPE[task.follow_up_type];
    if (projectField && task.project_id) {
      const projectUpdate = {};

      if (task.follow_up_type === 'revisao') {
        projectUpdate.revision_date = baseDueDate;
        projectUpdate.revision_datetime = `${baseDueDate}T12:00:00-03:00`;
      } else if (task.follow_up_type === 'pos_venda') {
        projectUpdate.post_sale_contact_date = `${baseDueDate}T12:00:00-03:00`;
        projectUpdate.post_sale_status = 'pendente';
      } else if (task.follow_up_type === 'session_reminder') {
        projectUpdate.session_date = `${baseDueDate}T12:00:00-03:00`;
      } else if (task.follow_up_type === 'aguardando_sinal') {
        projectUpdate.stage_updated_at = `${baseDueDate}T12:00:00-03:00`;
      } else {
        projectUpdate[projectField] = baseDueDate;
      }

      await base44.asServiceRole.entities.Project.update(task.project_id, projectUpdate);
      console.log('[reschedule] Project updated with date field:', projectField, '=', projectUpdate[projectField] || baseDueDate);
    }

    return Response.json({ success: true, task: createdTask });
  } catch (error) {
    console.error('[reschedule] Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
}