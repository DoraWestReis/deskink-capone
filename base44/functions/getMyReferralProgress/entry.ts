import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const records = await base44.asServiceRole.entities.ReferralAdminData.filter({ referral_owner_id: user.id, commission_payment_status: 'pago' });
    const monthKey = new Date().toISOString().slice(0, 7);
    return Response.json({
      total: records.length,
      current_month: records.filter((item) => item.contract_signature_date?.startsWith(monthKey)).length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}