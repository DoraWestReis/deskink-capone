import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const payload = await req.json();
    if (!payload.referral_id) return Response.json({ error: 'referral_id is required' }, { status: 400 });

    const referral = await base44.asServiceRole.entities.Referral.get(payload.referral_id);
    if (!referral) return Response.json({ error: 'Referral not found' }, { status: 404 });

    const data = {
      referral_id: referral.id,
      referral_owner_id: referral.created_by_id,
      contract_signature_date: payload.contract_signature_date || undefined,
      monthly_value: Number(payload.monthly_value) || 0,
      commission_payment_status: payload.commission_payment_status === 'pago' ? 'pago' : 'pendente'
    };
    const existing = await base44.asServiceRole.entities.ReferralAdminData.filter({ referral_id: referral.id });
    const saved = existing[0]
      ? await base44.asServiceRole.entities.ReferralAdminData.update(existing[0].id, data)
      : await base44.asServiceRole.entities.ReferralAdminData.create(data);

    return Response.json({ data: saved });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}