import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const ALERT_LABELS = {
  client_pre_due: 'client_pre_due',
  dev_due: 'dev_due',
  dev_post_7_days: 'dev_post_7_days',
};

const TYPE_LABELS = {
  monthly: 'Mensal',
  annual: 'Anual',
  free: 'Gratuito',
};

function addDays(value, days) {
  const date = new Date(`${value}T12:00:00-03:00`);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    const subscriptionId = payload.subscription_id;
    const alertType = payload.alert_type;

    if (!subscriptionId || !alertType) {
      return Response.json({ error: 'subscription_id and alert_type are required' }, { status: 400 });
    }

    // Fetch subscription by filter (no .get() method)
    const subscriptionList = await base44.asServiceRole.entities.Subscription.filter(
      { id: subscriptionId },
      '-created_date',
      1
    );
    const subscription = subscriptionList[0];

    if (!subscription) {
      return Response.json({ error: 'Subscription not found' }, { status: 404 });
    }

    if (subscription.type === 'free') {
      return Response.json({ success: true, skipped: true, reason: 'Free plan' });
    }

    const renewalExpectedDate = subscription.type === 'monthly'
      ? addDays(subscription.end_date, -30)
      : addDays(subscription.end_date, -365);

    const paymentPending = subscription.status === 'pending_renewal' || !subscription.last_payment_date || subscription.last_payment_date < renewalExpectedDate;
    if (!paymentPending) {
      return Response.json({ success: true, skipped: true, reason: 'Payment already confirmed' });
    }

    if (subscription.alert_stage === ALERT_LABELS[alertType]) {
      return Response.json({ success: true, skipped: true, reason: 'Alert already sent' });
    }

    // Fetch client (User entity) by filter
    const clientList = await base44.asServiceRole.entities.User.filter(
      { id: subscription.client_id },
      '-created_date',
      1
    );
    const client = clientList[0];

    const adminUsers = await base44.asServiceRole.entities.User.filter({ role: 'admin' }, '-created_date', 20);
    const adminEmails = [...new Set(adminUsers.map((u) => u.email).filter(Boolean))];

    if (alertType === 'client_pre_due' && client?.email) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: client.email,
        subject: 'Seu plano está próximo do vencimento',
        body: `Olá! Seu plano ${TYPE_LABELS[subscription.type] || subscription.type} vence em ${subscription.end_date}. Caso o pagamento ainda esteja pendente, regularize para evitar interrupções.`,
      });
    }

    if ((alertType === 'dev_due' || alertType === 'dev_post_7_days') && adminEmails.length) {
      await Promise.all(adminEmails.map((email) => base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: 'Alerta de assinatura pendente',
        body: `A assinatura do usuário ${client?.email || subscription.client_id} está com pagamento pendente. Plano: ${TYPE_LABELS[subscription.type] || subscription.type}. Vencimento: ${subscription.end_date}. Estágio: ${alertType}.`,
      })));
    }

    if (alertType === 'dev_post_7_days' && client?.email) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: client.email,
        subject: 'Seu plano está vencido',
        body: `Olá! Seu plano ${TYPE_LABELS[subscription.type] || subscription.type} venceu em ${subscription.end_date} e ainda consta pendente. Entre em contato para renovar.`,
      });
    }

    // Update only the alert_stage field (not spreading entire subscription object)
    await base44.asServiceRole.entities.Subscription.update(subscription.id, {
      alert_stage: ALERT_LABELS[alertType],
    });

    return Response.json({ success: true, sent: alertType });
  } catch (error) {
    console.error('sendSubscriptionAlert error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});