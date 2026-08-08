import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const CONNECTOR_ID = '6a1f13da85129a0225942902';

const isValidEmail = (value) => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, projectId } = await req.json();

    // Get Google Calendar access token from the current app user's connection
    let accessToken;
    try {
      const conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);
      accessToken = conn.accessToken;
    } catch (_err) {
      return Response.json({ error: 'Google Agenda não conectado para este usuário' }, { status: 400 });
    }
    if (!accessToken) {
      return Response.json({ error: 'Google Agenda não conectado para este usuário' }, { status: 400 });
    }
    
    // Get project details
    const projects = await base44.asServiceRole.entities.Project.filter({ id: projectId });
    const project = projects[0];
    
    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    const calendarAPI = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

    if (action === 'create' || action === 'update') {
      if (!project.session_date) {
        return Response.json({ error: 'Session date is required' }, { status: 400 });
      }

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

      const startTime = parseProjectDateTime(project.session_date);
      
      // Use custom duration or default to 60 minutes
      const durationMinutes = project.session_duration_minutes || 60;
      if (!startTime || Number.isNaN(startTime.getTime())) {
        return Response.json({ error: 'Invalid session date' }, { status: 400 });
      }

      const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

      // Build title: NOME DO CLIENTE | TIPO DE AGENDAMENTO
      const stageLabels = {
        'agendado': 'Tatuagem',
        'agendado_orcamento_presencial': 'Orçamento presencial',
        'followup_orcamento': 'Follow-up Orçamento'
      };
      const stageLabel = stageLabels[project.pipeline_stage] || project.pipeline_stage;
      const eventTitle = `${project.client_name || 'Cliente'} | ${stageLabel}`;

      const displayValue = project.total_value || project.deposit_value || 0;
      
      // Get client details for attendees
      const clients = await base44.asServiceRole.entities.Client.filter({ id: project.client_id });
      const client = clients[0];
      
      const attendees = [];
      if (client && isValidEmail(client.email)) {
        attendees.push({ email: client.email.trim() });
      }
      
      const formatBRL = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const descriptionLines = [
        project.description,
        '',
        `Estilo: ${project.style || 'Não definido'}`,
        client?.cpf ? `CPF: ${client.cpf}` : null,
        `Valor: ${formatBRL(displayValue)}`,
        project.deposit_value ? `Sinal: ${formatBRL(project.deposit_value)}` : null,
        `Duração: ${durationMinutes} min`,
      ].filter((line) => line !== null);

      const event = {
        summary: eventTitle,
        description: descriptionLines.join('\n'),
        start: {
          dateTime: startTime.toISOString(),
          timeZone: 'America/Sao_Paulo',
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'America/Sao_Paulo',
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

      let response;
      
      if (action === 'update' && project.calendar_event_id) {
        response = await fetch(
          `${calendarAPI}/${project.calendar_event_id}`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(event),
          }
        );

        if (response.status === 404) {
          response = await fetch(calendarAPI, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(event),
          });
        }
      } else {
        response = await fetch(calendarAPI, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        });
      }

      if (!response.ok) {
        const error = await response.text();
        return Response.json({ error: 'Failed to sync with Google Calendar', details: error }, { status: 500 });
      }

      const createdEvent = await response.json();

      await base44.asServiceRole.entities.Project.update(projectId, {
        calendar_event_id: createdEvent.id,
      });

      return Response.json({ 
        success: true, 
        eventId: createdEvent.id,
        eventLink: createdEvent.htmlLink 
      });

    } else if (action === 'delete') {
      if (project.calendar_event_id) {
        const response = await fetch(
          `${calendarAPI}/${project.calendar_event_id}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok && response.status !== 404) {
          const error = await response.text();
          return Response.json({ error: 'Failed to delete from Google Calendar', details: error }, { status: 500 });
        }

        await base44.asServiceRole.entities.Project.update(projectId, {
          calendar_event_id: null,
        });
      }

      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Calendar sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});