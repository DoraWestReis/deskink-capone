import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const TIME_ZONE = 'America/Sao_Paulo';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

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

const getReviewDate = (project, revisionDays = 20) => {
  if (project.revision_datetime) {
    return parseProjectDateTime(project.revision_datetime);
  }

  if (project.revision_date) {
    return new Date(`${project.revision_date}T12:00:00-03:00`);
  }

  const baseDate = getBaseDate(project);
  if (!baseDate) return null;

  const reviewDate = new Date(baseDate);
  reviewDate.setDate(reviewDate.getDate() + revisionDays);
  return reviewDate;
};

const getPostSaleDate = (project, revisionDays = 20, postSaleDays = 60) => {
  const reviewDate = getReviewDate(project, revisionDays);
  if (!reviewDate) return null;

  const postSaleDate = new Date(reviewDate);
  postSaleDate.setDate(postSaleDate.getDate() + postSaleDays);
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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // auth.me() may fail in automation contexts; the handler runs on the service role.
    try { await base44.auth.me(); } catch (_err) { /* ignore */ }

    const { projectId, eventType } = await req.json();
    if (!projectId || !['revisao', 'pos_venda'].includes(eventType)) {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const followUpSettingsList = await base44.asServiceRole.entities.FollowUpSettings.list();
    const followUpSettings = followUpSettingsList[0] || {};
    const revisionDays = followUpSettings.revision_days ?? 20;
    const postSaleDays = followUpSettings.pos_venda_days ?? 60;

    const projects = await base44.asServiceRole.entities.Project.filter({ id: projectId });
    const project = projects[0];
    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    const clients = await base44.asServiceRole.entities.Client.filter({ id: project.client_id });
    const client = clients[0];
    const clientName = project.client_name || client?.name || 'Cliente';
    const attendees = isValidEmail(client?.email) ? [{ email: client.email.trim() }] : [];

    const startTime = eventType === 'revisao' ? getReviewDate(project, revisionDays) : getPostSaleDate(project, revisionDays, postSaleDays);
    if (!startTime) {
      return Response.json({ error: 'Tattoo date or session date is required' }, { status: 400 });
    }

    const updateData = eventType === 'revisao'
      ? {
          revisao_calendar_event_id: null,
          revision_date: project.revision_date || startTime.toISOString().slice(0, 10),
          revision_datetime: project.revision_datetime || startTime.toISOString(),
          revision_duration_minutes: project.revision_duration_minutes || 60,
        }
      : {
          pos_venda_calendar_event_id: null,
          post_sale_contact_date: startTime.toISOString(),
        };

    await base44.asServiceRole.entities.Project.update(projectId, updateData);

    return Response.json({
      success: true,
      updated: false,
      calendar_sync_disabled: true,
    });
  } catch (error) {
    console.error('Follow-up event scheduling error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});