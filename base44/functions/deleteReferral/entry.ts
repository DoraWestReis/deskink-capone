import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json();
    if (!payload.referral_id) return Response.json({ error: 'referral_id is required' }, { status: 400 });
    const referral = await base44.entities.Referral.get(payload.referral_id);
    if (!referral) return Response.json({ error: 'Referral not found' }, { status: 404 });

    const adminRecords = await base44.asServiceRole.entities.ReferralAdminData.filter({ referral_id: referral.id });
    if (adminRecords.length) await base44.asServiceRole.entities.ReferralAdminData.deleteMany({ referral_id: referral.id });
    await base44.entities.Referral.delete(referral.id);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}