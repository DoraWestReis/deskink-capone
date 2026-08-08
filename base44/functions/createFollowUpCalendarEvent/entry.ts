import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const TIME_ZONE = 'America/Sao_Paulo';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const CONNECTOR_ID = '6a1f13da85129a0225942902';

const isValidEmail = (value) => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const parseDateTime = (date, time) => new Date(`${date}T${time}:00-03:00`);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // auth.me() may fail in automation contexts; the handler runs on the service role.
    try { await base44.auth.me(); } catch (_err) { /* ignore */ }

    const { projectId, taskId, date, time } = await req.json();

    if (!projectId || !taskId || !date || !time) {
      return Response.json({ error: 'Dados obrigatórios ausentes.' }, { status: 400 });
    }

    let accessToken;
    try {
      const conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);
      accessToken = conn.accessToken;
    } catch (_err) {
      accessToken = null;
    }
    if (!accessToken) {
      return Response.json({ error: 'Google Agenda não conectado para este usuário.' }, { status: 400 });
    }

    const projects = await base44.asServiceRole.entities.Project.filter({ id: projectId }, '-created_date', 1);
    const tasks = await base44.asServiceRole.entities.FollowUpTask.filter({ id: taskId }, '-created_date', 1);
    const project = projects[0];
    const task = tasks[0];

    if (!project || !task) {
      return Response.json({ error: 'Projeto ou tarefa não encontrado.' }, { status: 404 });
    }

    const clients = project.client_id
      ? await base44.asServiceRole.entities.Client.filter({ id: project.client_id }, '-created_date', 1)
      : [];
    const client = clients[0];

    const startTime = parseDateTime(date, time);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
    const clientName = task.client_name || project.client_name || client?.name || 'Cliente';
    const attendees = isValidEmail(client?.email) ? [{ email: client.email.trim() }] : [];

    const eventPayload = {
      summary: `${task.step_label || 'Follow-up'} | ${clientName}`,
      description: task.message || `Follow-up com ${clientName}`,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: TIME_ZONE,
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: TIME_ZONE,
      },
      attendees: attendees.length ? attendees : undefined,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 24 * 60 },
          { method: 'popup', minutes: 60 },
        ],
      },
      sendUpdates: 'all',
    };

    const response = await fetch(CALENDAR_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventPayload),
    });

    if (!response.ok) {
      const details = await response.text();
      return Response.json({ error: details || 'Erro ao criar evento.' }, { status: 500 });
    }

    const event = await response.json();

    const projectUpdate = {};

    if (task.follow_up_type === 'revisao') {
      projectUpdate.revision_date = date;
      projectUpdate.revision_datetime = startTime.toISOString();
      projectUpdate.revision_duration_minutes = project.revision_duration_minutes || 60;
      projectUpdate.revisao_calendar_event_id = event.id;
    }

    if (task.follow_up_type === 'pos_venda') {
      projectUpdate.post_sale_contact_date = startTime.toISOString();
      projectUpdate.pos_venda_calendar_event_id = event.id;
    }

    if (task.follow_up_type === 'followup_orcamento') {
      projectUpdate.evaluation_date = date;
    }

    if (task.follow_up_type === 'followup_fechamento') {
      projectUpdate.closing_date = date;
    }

    if (task.follow_up_type === 'aguardando_sinal') {
      projectUpdate.stage_updated_at = startTime.toISOString();
    }

    if (task.follow_up_type === 'session_reminder') {
      projectUpdate.session_date = startTime.toISOString();
    }

    if (Object.keys(projectUpdate).length > 0) {
      await base44.asServiceRole.entities.Project.update(project.id, projectUpdate);
    }

    return Response.json({ success: true, eventId: event.id, eventLink: event.htmlLink });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});