import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    // auth.me() can fail when the call comes from an automation context.
    // The whole handler runs on the service role, so a missing user is not fatal.
    try { await base44.auth.me(); } catch (_err) { /* ignore */ }

    const { taskId, status } = await req.json();
    if (!taskId) return Response.json({ error: 'Task ID obrigatório.' }, { status: 400 });
    if (!['completed', 'dismissed'].includes(status)) {
      return Response.json({ error: 'Status inválido.' }, { status: 400 });
    }

    const records = await base44.asServiceRole.entities.FollowUpTask.filter({ id: taskId }, '-created_date', 1);
    const record = records[0];
    const task = record?.data ? { ...record.data, recordId: record.id } : record;
    if (!task) return Response.json({ error: 'Follow-up não encontrado.' }, { status: 404 });

    const updated = await base44.asServiceRole.entities.FollowUpTask.update(task.recordId || task.id, { status });
    return Response.json({ success: true, task: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}