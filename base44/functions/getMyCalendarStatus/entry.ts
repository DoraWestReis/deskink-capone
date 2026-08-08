import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const CONNECTOR_ID = '6a1f13da85129a0225942902';

export default async function(req: Request): Promise<Response> {
  // Sempre responde 200 para que o app consiga ler o motivo real.
  try {
    const base44 = createClientFromRequest(req);

    let user = null;
    try {
      user = await base44.auth.me();
    } catch (authError) {
      return Response.json({
        connected: false,
        reason: 'auth_failed',
        detail: `Sessão não reconhecida: ${authError?.message || String(authError)}`,
      });
    }

    if (!user) {
      return Response.json({ connected: false, reason: 'not_logged_in', detail: 'Sessão não encontrada.' });
    }

    let conn = null;
    try {
      conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);
    } catch (connError) {
      return Response.json({
        connected: false,
        reason: 'connection_error',
        detail: connError?.message || String(connError),
      });
    }

    if (!conn?.accessToken) {
      return Response.json({ connected: false, reason: 'no_token', detail: 'Autorização do Google não encontrada.' });
    }

    const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1', {
      headers: { Authorization: `Bearer ${conn.accessToken}` },
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error('Google Calendar check failed', res.status, detail);
      return Response.json({
        connected: false,
        reason: 'google_rejected',
        detail: `Google respondeu ${res.status}: ${detail.slice(0, 200)}`,
      });
    }

    return Response.json({ connected: true, email: user.email });
  } catch (error) {
    return Response.json({
      connected: false,
      reason: 'server_error',
      detail: error?.message || String(error),
    });
  }
}