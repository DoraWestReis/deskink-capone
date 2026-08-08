import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const typeLabels = {
  monthly: 'Mensal',
  annual: 'Anual',
  free: 'Free',
};

const statusLabels = {
  active: 'Ativa',
  pending_renewal: 'Pendente',
  expired: 'Expirada',
  cancelled: 'Cancelada',
};

const alertLabels = {
  none: 'Nenhum',
  client_pre_due: '2 dias antes',
  dev_due: 'No vencimento',
  dev_post_7_days: '7 dias após',
};

function getChargeLabel(type) {
  return type === 'free' ? 'Sem cobrança' : 'Cobrança ativa';
}

function getExpiryLabel(subscription) {
  return subscription.end_date || '—';
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getPaymentState(subscription) {
  if (subscription.type === 'free') {
    return {
      canConfirm: false,
      label: 'Plano sem cobrança',
      variant: 'outline',
    };
  }

  const today = getTodayKey();
  const dueDate = subscription.end_date || '';
  const isDueOrLate = dueDate && today >= dueDate;

  if (!isDueOrLate) {
    return {
      canConfirm: false,
      label: 'Pagamento já confirmado',
      variant: 'secondary',
    };
  }

  return {
    canConfirm: true,
    label: 'Confirmar pagamento',
    variant: 'default',
  };
}

export default function SubscriptionListItem({ subscription, user, onEdit, onRenew }) {
  const paymentState = getPaymentState(subscription);

  return (
    <div className="rounded-2xl border border-[#E7DED2] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <h3 className="truncate text-2xl font-semibold text-[#231F20]">{user?.email || subscription.client_id}</h3>
            <p className="mt-1 truncate text-base text-[#7A736C]">{user?.full_name || 'Usuária sem nome'}</p>
            <p className="mt-2 text-lg text-[#5F5750]">Plano {typeLabels[subscription.type] || subscription.type} • vence em {getExpiryLabel(subscription)}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{statusLabels[subscription.status] || subscription.status}</Badge>
            <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100">{getChargeLabel(subscription.type)}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 text-sm text-[#6E6761] md:grid-cols-3">
          <div>
            <span className="font-medium text-[#8A8178]">Início:</span> {subscription.start_date || '—'}
          </div>
          <div>
            <span className="font-medium text-[#8A8178]">Último pagamento:</span> {subscription.last_payment_date || '—'}
          </div>
          <div>
            <span className="font-medium text-[#8A8178]">Alerta:</span> {alertLabels[subscription.alert_stage || 'none'] || subscription.alert_stage}
          </div>
        </div>

        {subscription.developer_notes && <p className="text-sm text-[#6E6761]">{subscription.developer_notes}</p>}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => onEdit(subscription)}>Editar plano</Button>
          {subscription.type !== 'free' && (
            <Button
              variant={paymentState.variant}
              disabled={!paymentState.canConfirm}
              onClick={() => paymentState.canConfirm && onRenew(subscription)}
            >
              {paymentState.label}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}