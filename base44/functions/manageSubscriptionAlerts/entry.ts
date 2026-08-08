import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ALERT_TYPES = [
  { type: 'client_pre_due', offsetDays: -2, label: 'Cliente pré-vencimento' },
  { type: 'dev_due', offsetDays: 0, label: 'Admin vencimento' },
  { type: 'dev_post_7_days', offsetDays: 7, label: 'Admin 7 dias após' },
];

function toDateString(value) {
  const date = new Date(`${value}T12:00:00-03:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(dateValue, days) {
  const date = new Date(dateValue);
  date.setDate(date.getDate() + days);
  return date;
}

function formatDateISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function processSubscription(base44, subscription) {
  // Skip free or terminated subscriptions
  if (subscription.type === 'free' || ['cancelled', 'expired'].includes(subscription.status)) {
    return { id: subscription.id, skipped: true, reason: 'No paid alerts needed' };
  }

  const endDate = toDateString(subscription.end_date);
  if (!endDate) {
    return { id: subscription.id, skipped: true, reason: 'Invalid end_date' };
  }

  const today = new Date();
  const todayStr = formatDateISO(today);
  const triggered = [];

  for (const alert of ALERT_TYPES) {
    const alertDate = addDays(endDate, alert.offsetDays);
    const alertDateStr = formatDateISO(alertDate);

    // If today matches the alert date, trigger it
    if (alertDateStr === todayStr) {
      await base44.asServiceRole.functions.invoke('sendSubscriptionAlert', {
        subscription_id: subscription.id,
        alert_type: alert.type,
      });
      triggered.push(alert.type);
    }
  }

  return { id: subscription.id, triggered };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    const subscriptionId = payload.subscription_id || payload?.data?.id;

    // If a specific subscription_id is provided (entity automation trigger), process only that one
    if (subscriptionId) {
      const subscriptionList = await base44.asServiceRole.entities.Subscription.filter(
        { id: subscriptionId },
        '-created_date',
        1
      );
      const subscription = subscriptionList[0];

      if (!subscription) {
        return Response.json({ error: 'Subscription not found' }, { status: 404 });
      }

      const result = await processSubscription(base44, subscription);
      return Response.json({ success: true, ...result });
    }

    // No subscription_id = scheduled run: check ALL active subscriptions
    const allSubscriptions = await base44.asServiceRole.entities.Subscription.filter(
      { status: 'active' },
      '-created_date',
      200
    );

    // Also check pending_renewal
    const pendingSubscriptions = await base44.asServiceRole.entities.Subscription.filter(
      { status: 'pending_renewal' },
      '-created_date',
      200
    );

    const subscriptions = [...allSubscriptions, ...pendingSubscriptions];
    const results = [];

    for (const sub of subscriptions) {
      const result = await processSubscription(base44, sub);
      results.push(result);
    }

    return Response.json({
      success: true,
      total_checked: subscriptions.length,
      results,
    });
  } catch (error) {
    console.error('manageSubscriptionAlerts error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});