import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const TIME_ZONE = 'America/Sao_Paulo';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const MAIN_SCHEDULE_STAGES = ['agendado', 'agendado_orcamento_presencial', 'followup_orcamento'];

const getSessionStartTime = (project) => {
  if (!project.session_date) return null;

  let startTime = new Date(project.session_date);
  if (!project.session_date.includes('Z') && !project.session_date.includes('+') && !project.session_date.includes('-', 10)) {
    const localTime = new Date(project.session_date);
    startTime = new Date(localTime.getTime() + 3 * 60 * 60 * 1000);
  }

  return Number.isNaN(startTime.getTime()) ? null : startTime;
};

const getBaseDate = (project) => {
  if (project.tattoo_date) {
    return new Date(`${project.tattoo_date}T12:00:00-03:00`);
  }

  return getSessionStartTime(project);
};

const getReviewDate = (project) => {
  const baseDate = getBaseDate(project);
  if (!baseDate) return null;

  const reviewDate = new Date(baseDate);
  reviewDate.setDate(reviewDate.getDate() + 20);
  return reviewDate;
};

const getPostSaleDate = (project) => {
  const reviewDate = getReviewDate(project);
  if (!reviewDate) return null;

  const postSaleDate = new Date(reviewDate);
  postSaleDate.setMonth(postSaleDate.getMonth() + 2);
  return postSaleDate;
};

const buildMainEventPayload = ({ project, client }) => {
  const startTime = getSessionStartTime(project);
  if (!startTime) return null;

  const durationMinutes = project.session_duration_minutes || 120;
  const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
  const stageLabels = {
    agendado: 'Tatuagem',
    agendado_orcamento_presencial: 'Orçamento presencial',
    followup_orcamento: 'Follow-up Orçamento',
  };

  const attendees = client?.email ? [{ email: client.email }] : undefined;
  const eventTitle = `${project.client_name || client?.name || 'Cliente'} | ${stageLabels[project.pipeline_stage] || project.pipeline_stage}`;
  const displayValue = project.total_value || project.deposit_value || 0;

  return {
    summary: eventTitle,
    description: `${project.description || ''}\n\nEstilo: ${project.style || 'Não definido'}\nValor: R$ ${displayValue}\nDuração: ${durationMinutes} min`,
    start: {
      dateTime: startTime.toISOString(),
      timeZone: TIME_ZONE,
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: TIME_ZONE,
    },
    attendees,
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 24 * 60 },
        { method: 'popup', minutes: 60 },
      ],
    },
  };
};


const upsertCalendarEvent = async ({ accessToken, eventId, payload }) => {
  if (eventId) {
    const updateResponse = await fetch(`${CALENDAR_API}/${eventId}?sendUpdates=all`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (updateResponse.ok) {
      return updateResponse.json();
    }

    if (updateResponse.status !== 404 && updateResponse.status !== 410) {
      const details = await updateResponse.text();
      throw new Error(details || 'Failed to update calendar event');
    }
  }

  const createResponse = await fetch(`${CALENDAR_API}?sendUpdates=all`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!createResponse.ok) {
    const details = await createResponse.text();
    throw new Error(details || 'Failed to create calendar event');
  }

  return createResponse.json();
};

const deleteCalendarEvent = async ({ accessToken, eventId }) => {
  if (!eventId) return;
  const res = await fetch(`${CALENDAR_API}/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  // 204 = deleted, 404/410 = already gone — all are fine
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    console.warn(`Failed to delete calendar event ${eventId}: ${res.status}`);
  }
};

const chunk = (items, size) => {
  const groups = [];
  for (let i = 0; i < items.length; i += size) {
    groups.push(items.slice(i, i + size));
  }
  return groups;
};

const shouldResyncProject = (project) => {
  if (MAIN_SCHEDULE_STAGES.includes(project.pipeline_stage) && project.session_date) return true;
  if (['agendado', 'revisao', 'pos_venda'].includes(project.pipeline_stage) && (project.session_date || project.tattoo_date)) return true;
  return false;
};

const resyncProject = async ({ accessToken, project, client, base44 }) => {
  const updateData = {};
  const synced = [];

  // --- Main event ---
  if (MAIN_SCHEDULE_STAGES.includes(project.pipeline_stage) && project.session_date) {
    const mainPayload = buildMainEventPayload({ project, client });
    if (mainPayload) {
      const mainEvent = await upsertCalendarEvent({
        accessToken,
        eventId: project.calendar_event_id,
        payload: mainPayload,
      });
      updateData.calendar_event_id = mainEvent.id;
      synced.push('principal');
    }
  } else if (project.calendar_event_id) {
    // Project no longer qualifies for a main event — delete orphan
    await deleteCalendarEvent({ accessToken, eventId: project.calendar_event_id });
    updateData.calendar_event_id = null;
    synced.push('principal_removido');
  }

  // --- Revisão event ---
  if (project.revisao_calendar_event_id) {
    await deleteCalendarEvent({ accessToken, eventId: project.revisao_calendar_event_id });
    updateData.revisao_calendar_event_id = null;
    synced.push('revisao_removido');
  }

  // --- Pós-venda event ---
  if (project.pos_venda_calendar_event_id) {
    await deleteCalendarEvent({ accessToken, eventId: project.pos_venda_calendar_event_id });
    updateData.pos_venda_calendar_event_id = null;
    synced.push('pos_venda_removido');
  }

  if ((['agendado', 'revisao', 'pos_venda'].includes(project.pipeline_stage)) && (project.session_date || project.tattoo_date)) {
    updateData.post_sale_contact_date = getPostSaleDate(project)?.toISOString() || project.post_sale_contact_date;
  }

  if (Object.keys(updateData).length > 0) {
    await base44.asServiceRole.entities.Project.update(project.id, updateData);
  }

  return { projectId: project.id, clientName: project.client_name || client?.name || 'Cliente', synced };
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const payload = await req.json().catch(() => ({}));
    const maxProjects = Number(payload.maxProjects) || 200;
    const projectIds = Array.isArray(payload.projectIds) ? payload.projectIds : null;

    let accessToken;
    try {
      const conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection('6a1f13da85129a0225942902');
      accessToken = conn?.accessToken;
    } catch (_err) {
      accessToken = null;
    }
    if (!accessToken) {
      return Response.json({ error: 'Google Agenda não conectado para este usuário.' }, { status: 400 });
    }
    const [projects, clients] = await Promise.all([
      base44.asServiceRole.entities.Project.list('-updated_date', maxProjects),
      base44.asServiceRole.entities.Client.list('-updated_date', maxProjects),
    ]);

    const clientsMap = clients.reduce((acc, client) => {
      acc[client.id] = client;
      return acc;
    }, {});

    const relevantProjects = projects.filter((project) => {
      if (projectIds && !projectIds.includes(project.id)) return false;
      return shouldResyncProject(project);
    });

    const results = [];
    const errors = [];

    for (const group of chunk(relevantProjects, 5)) {
      const groupResults = await Promise.all(group.map(async (project) => {
        try {
          const client = clientsMap[project.client_id];
          return await resyncProject({ accessToken, project, client, base44 });
        } catch (error) {
          errors.push({ projectId: project.id, clientName: project.client_name || 'Cliente', error: error.message });
          return null;
        }
      }));

      results.push(...groupResults.filter(Boolean));
    }

    return Response.json({
      success: true,
      totalChecked: relevantProjects.length,
      totalSynced: results.length,
      syncedProjects: results,
      errors,
    });
  } catch (error) {
    console.error('Calendar resync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});