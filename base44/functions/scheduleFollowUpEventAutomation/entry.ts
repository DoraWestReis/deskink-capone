import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const TIME_ZONE = 'America/Sao_Paulo';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const CONNECTOR_ID = '6a1f13da85129a0225942902';

const getBaseDate = (project) => {
  if (project.tattoo_date) {
    return new Date(`${project.tattoo_date}T12:00:00-03:00`);
  }

  if (project.session_date) {
    return new Date(project.session_date);
  }

  return null;
};

const parseProjectDateTime = (value) => {
  if (!value) return null;
  if (value.includes('Z') || value.includes('+') || value.includes('-', 10)) {
    return new Date(value);
  }
  if (value.length === 16) {
    return new Date(`${value}:00-03:00`);
  }
  return new Date(`${value}-03:00`);
};

const getReviewDate = (project) => {
  if (project.revision_datetime) {
    return parseProjectDateTime(project.revision_datetime);
  }

  if (project.revision_date) {
    return new Date(`${project.revision_date}T12:00:00-03:00`);
  }

  const baseDate = getBaseDate(project);
  if (!baseDate) return null;

  const reviewDate = new Date(baseDate);
  reviewDate.setDate(reviewDate.getDate() + 20);
  return reviewDate;
};

const getPostSaleDate = (project) => {
  // If the project already has a post_sale_contact_date set (manually or via reschedule),
  // respect it instead of recalculating
  if (project.post_sale_contact_date) {
    return parseProjectDateTime(project.post_sale_contact_date);
  }

  const reviewDate = getReviewDate(project);
  if (!reviewDate) return null;

  const postSaleDate = new Date(reviewDate);
  postSaleDate.setMonth(postSaleDate.getMonth() + 2);
  return postSaleDate;
};

const isValidEmail = (value) => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const buildEventPayload = ({ summary, description, startTime, attendees, durationMinutes = 60 }) => {
  const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

  return {
    summary,
    description,
    start: {
      dateTime: startTime.toISOString(),
      timeZone: TIME_ZONE,
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: TIME_ZONE,
    },
    attendees: attendees.length > 0 ? attendees : undefined,
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 24 * 60 },
        { method: 'popup', minutes: 60 },
      ],
    },
    sendUpdates: 'all',
  };
};

const upsertCalendarEvent = async ({ accessToken, eventId, payload }) => {
  let url = eventId ? `${CALENDAR_API}/${eventId}` : CALENDAR_API;
  let method = eventId ? 'PUT' : 'POST';

  let response = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 404 && eventId) {
    url = CALENDAR_API;
    method = 'POST';
    response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  }

  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || 'Failed to sync calendar event');
  }

  return response.json();
};

const syncEvent = async ({ accessToken, project, client, eventType }) => {
  const clientName = project.client_name || client?.name || 'Cliente';
  const attendees = isValidEmail(client?.email) ? [{ email: client.email.trim() }] : [];
  const startTime = eventType === 'revisao' ? getReviewDate(project) : getPostSaleDate(project);

  if (!startTime) return null;

  const eventId = eventType === 'revisao'
    ? project.revisao_calendar_event_id
    : project.pos_venda_calendar_event_id;

  const payload = buildEventPayload({
    summary: `${clientName} | ${eventType === 'revisao' ? 'Revisão' : 'Pós-Venda'}`,
    description: eventType === 'revisao'
      ? `Revisão da tatuagem\n\nCliente: ${clientName}\nDescrição: ${project.description || ''}\nEstilo: ${project.style || 'Não definido'}`
      : `Contato pós-venda\n\nCliente: ${clientName}\nDescrição: ${project.description || ''}\nEstilo: ${project.style || 'Não definido'}`,
    startTime,
    attendees,
    durationMinutes: eventType === 'revisao' ? (project.revision_duration_minutes || 60) : 60,
  });

  const event = await upsertCalendarEvent({ accessToken, eventId, payload });

  // CRITICAL: Only return fields that need updating.
  // Never overwrite dates that were already set on the project — only set calendar event IDs
  // and fill in dates that are currently empty.
  if (eventType === 'revisao') {
    const result = { revisao_calendar_event_id: event.id };
    // Only set revision dates if the project doesn't already have them
    if (!project.revision_date) result.revision_date = startTime.toISOString().slice(0, 10);
    if (!project.revision_datetime) result.revision_datetime = startTime.toISOString();
    if (!project.revision_duration_minutes) result.revision_duration_minutes = 60;
    return result;
  } else {
    const result = { pos_venda_calendar_event_id: event.id };
    // Only set post_sale_contact_date if the project doesn't already have one
    if (!project.post_sale_contact_date) result.post_sale_contact_date = startTime.toISOString();
    return result;
  }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data, changed_fields } = await req.json();

    if (event.type !== 'update') {
      return Response.json({ success: true, message: 'Not an update event' });
    }

    if (!data || !old_data) {
      return Response.json({ success: true, message: 'Missing entity data' });
    }

    // Only react to stage changes or revision field changes.
    // CRITICAL: Do NOT react to changes that we ourselves write (calendar event IDs, post_sale_contact_date)
    // to avoid infinite loops.
    const relevantChanges = (changed_fields || []).filter(f => 
      ['pipeline_stage', 'revision_date', 'revision_datetime', 'revision_duration_minutes', 'tattoo_date', 'session_date'].includes(f)
    );
    
    if (relevantChanges.length === 0) {
      return Response.json({ success: true, message: 'No relevant scheduling fields changed' });
    }

    const stageChanged = data.pipeline_stage !== old_data.pipeline_stage;
    const revisionChanged =
      data.revision_date !== old_data.revision_date ||
      data.revision_datetime !== old_data.revision_datetime ||
      data.revision_duration_minutes !== old_data.revision_duration_minutes ||
      data.tattoo_date !== old_data.tattoo_date;

    if (!stageChanged && !revisionChanged) {
      return Response.json({ success: true, message: 'No scheduling fields changed' });
    }

    const newStage = data.pipeline_stage;
    if (!revisionChanged && !['agendado', 'revisao', 'pos_venda'].includes(newStage)) {
      return Response.json({ success: true, message: 'No scheduling action needed for this update' });
    }

    // Google Agenda is connected per app user; skip calendar sync when unavailable.
    let accessToken = null;
    try {
      const conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);
      accessToken = conn?.accessToken || null;
    } catch (err) {
      console.warn('scheduleFollowUpEventAutomation: no calendar connection:', err.message);
    }
    if (!accessToken) {
      return Response.json({ success: true, message: 'Google Agenda não conectado — sincronização ignorada.' });
    }

    const projects = await base44.asServiceRole.entities.Project.filter({ id: event.entity_id });
    const project = projects[0];
    if (!project) {
      return Response.json({ success: false, error: 'Project not found' }, { status: 400 });
    }

    const clients = await base44.asServiceRole.entities.Client.filter({ id: project.client_id });
    const client = clients[0];

    const updateData = {};

    if (['agendado', 'revisao'].includes(newStage)) {
      Object.assign(updateData, await syncEvent({ accessToken, project, client, eventType: 'revisao' }) || {});
      Object.assign(updateData, await syncEvent({ accessToken, project, client, eventType: 'pos_venda' }) || {});
    }

    if (newStage === 'pos_venda') {
      Object.assign(updateData, await syncEvent({ accessToken, project, client, eventType: 'pos_venda' }) || {});
    }

    // Only update if there are actual changes to make (calendar IDs or missing dates)
    if (Object.keys(updateData).length > 0) {
      await base44.asServiceRole.entities.Project.update(event.entity_id, updateData);
    }

    return Response.json({ success: true, message: `Events synced for stage: ${newStage}`, updateData });
  } catch (error) {
    console.error('Automation error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});