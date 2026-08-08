import React from 'react';
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

function getBannerState(user) {
  const status = user?.plan_status;
  const endDate = user?.plan_end_date ? new Date(`${user.plan_end_date}T12:00:00`) : null;
  const today = new Date();
  const diffDays = endDate ? Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;

  if (status === 'expired' || status === 'cancelled') {
    return {
      icon: AlertTriangle,
      classes: 'border-red-200 bg-red-50 text-red-700',
      message: 'Seu plano está expirado ou cancelado. Fale com a administração para regularizar.',
    };
  }

  if (status === 'pending_renewal' || (diffDays !== null && diffDays <= 2)) {
    return {
      icon: Clock,
      classes: 'border-amber-200 bg-amber-50 text-amber-700',
      message: `Seu plano está próximo do vencimento${diffDays !== null ? ` (${Math.max(diffDays, 0)} dia(s))` : ''}.`,
    };
  }

  return {
    icon: CheckCircle2,
    classes: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    message: 'Seu plano está ativo.',
  };
}

export default function PlanAlertBanner({ user }) {
  if (!user || user.role !== 'admin') return null;

  const state = getBannerState(user);
  const Icon = state.icon;

  return (
    <div className={`mt-4 flex items-start gap-3 rounded-2xl border px-4 py-3 ${state.classes}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="text-sm leading-relaxed">{state.message}</p>
    </div>
  );
}