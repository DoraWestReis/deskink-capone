import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const CONNECTOR_ID = '6a1f13da85129a0225942902';

const STAGE_RULES = {
  followup_orcamento: {
    session_date: null,
    evaluation_date: null,
  },
  followup_fechamento: {
    session_date: null,
  },
  aguardando_sinal: {
    session_date: null,
  },
};

async function getProject(base44, entityId, data, payloadTooLarge) {
  if (!payloadTooLarge && data?.id === entityId) {
    return data;
  }

  const projects = await base44.asServiceRole.entities.Project.filter({ id: entityId });
  return projects[0] || null;
}

async function deleteCalendarEvent(accessToken, eventId) {
  const response = await fetch(`${CALENDAR_API}/${eventId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    const details = await response.text();
    throw new Error(details || 'Falha ao remover evento do Google Calendar');
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { event, data, old_data, payload_too_large } = payload;

    if (event?.type !== 'update' || event?.entity_name !== 'Project') {
      return Response.json({ success: true, message: 'Evento ignorado' });
    }

    const newStage = data?.pipeline_stage;
    const oldStage = old_data?.pipeline_stage;

    if (!newStage || newStage === oldStage) {
      return Response.json({ success: true, message: 'Nenhuma mudança de etapa' });
    }

    const stageRule = STAGE_RULES[newStage];
    if (!stageRule) {
      return Response.json({ success: true, message: 'Etapa sem limpeza automática' });
    }

    const project = await getProject(base44, event.entity_id, data, payload_too_large);
    if (!project) {
      return Response.json({ success: false, error: 'Projeto não encontrado' }, { status: 404 });
    }

    const updateData = { ...stageRule };

    if (project.calendar_event_id) {
      // Calendar is connected per app user; if it isn't available here, just clear the
      // reference locally instead of failing the whole stage change.
      try {
        const conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);
        if (conn?.accessToken) {
          await deleteCalendarEvent(conn.accessToken, project.calendar_event_id);
        }
      } catch (err) {
        console.warn('clearProjectScheduleOnFollowUp: calendar event not removed:', err.message);
      }
      updateData.calendar_event_id = null;
    }

    const hasChanges = Object.entries(updateData).some(([key, value]) => project[key] !== value);
    if (!hasChanges) {
      return Response.json({ success: true, message: 'Nada para atualizar' });
    }

    await base44.asServiceRole.entities.Project.update(event.entity_id, updateData);

    return Response.json({
      success: true,
      message: `Agenda limpa automaticamente ao mover para ${newStage}`,
      cleared_fields: Object.keys(updateData),
    });
  } catch (error) {
    console.error('clearProjectScheduleOnFollowUp error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});