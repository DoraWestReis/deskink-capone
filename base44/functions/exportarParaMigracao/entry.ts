import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const ALLOWED = [
  'Client', 'Project', 'ProjectStageHistory', 'FollowUpTask', 'HealthRecord', 'Note',
  'NoteCategory', 'Referral', 'OtherRevenue', 'StudioExpense', 'FinancialSettings',
  'FollowUpSettings', 'PendingEngineSettings', 'StudioGamification'
];

export default async function(req: Request): Promise<Response> {
  if (req.method !== 'POST') return Response.json({ error: 'Método não permitido' }, { status: 405 });
  const body = await req.json().catch(() => ({}));
  const { migration_token, entity_name, delta_from, delta_until } = body;
  const expected = Deno.env.get('MIGRATION_TOKEN');
  if (!expected || migration_token !== expected) {
    return Response.json({ error: 'Token inválido' }, { status: 401 });
  }

  const page = Math.max(1, Number(body.page) || 1);
  const limit = Math.min(500, Math.max(1, Number(body.limit) || 500));

  if (!ALLOWED.includes(entity_name)) return Response.json({ records: [], has_more: false });

  const base44 = createClientFromRequest(req);
  const entity = (base44.asServiceRole.entities as any)[entity_name];
  if (!entity) return Response.json({ records: [], has_more: false });

  const query: Record<string, unknown> = {};
  if (delta_from || delta_until) {
    const range: Record<string, string> = {};
    if (delta_from) range.$gte = delta_from;
    if (delta_until) range.$lte = delta_until;
    query.updated_date = range;
  }

  let rows: any[];
  try {
    rows = await entity.filter(query, 'updated_date', limit + 1, (page - 1) * limit);
  } catch (_e) {
    return Response.json({ records: [], has_more: false });
  }

  return Response.json({ records: rows.slice(0, limit), has_more: rows.length > limit });
}