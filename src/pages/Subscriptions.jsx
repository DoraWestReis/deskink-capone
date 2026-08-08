import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import SubscriptionFormDialog from '@/components/subscriptions/SubscriptionFormDialog';
import SubscriptionListItem from '@/components/subscriptions/SubscriptionListItem';

function addPlanPeriod(dateString, type) {
  const date = new Date(`${dateString}T12:00:00`);
  if (type === 'annual') date.setFullYear(date.getFullYear() + 1);
  if (type === 'monthly') date.setMonth(date.getMonth() + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function Subscriptions() {
  const queryClient = useQueryClient();
  const [editingSubscription, setEditingSubscription] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => base44.entities.Subscription.list('-updated_date'),
    enabled: me?.role === 'admin',
    initialData: [],
  });

  const { data: users = [] } = useQuery({
    queryKey: ['subscription-users'],
    queryFn: () => base44.entities.User.list(),
    enabled: me?.role === 'admin',
    initialData: [],
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingSubscription) {
        await base44.entities.Subscription.update(editingSubscription.id, data);
      } else {
        await base44.entities.Subscription.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      setDialogOpen(false);
      setEditingSubscription(null);
    },
  });

  const renewMutation = useMutation({
    mutationFn: async (subscription) => {
      const nextEndDate = addPlanPeriod(subscription.end_date, subscription.type);
      await base44.entities.Subscription.update(subscription.id, {
        ...subscription,
        status: 'active',
        alert_stage: 'none',
        last_payment_date: new Date().toISOString().slice(0, 10),
        end_date: nextEndDate,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subscriptions'] }),
  });

  const usersMap = useMemo(() => Object.fromEntries(users.map((user) => [user.id, user])), [users]);

  const filteredSubscriptions = subscriptions;

  if (me && me.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#F6F1EC] p-6">
        <div className="mx-auto max-w-3xl rounded-3xl border border-[#E7DED2] bg-white p-8 text-center">
          <h1 className="text-2xl font-display text-[#231F20]">Acesso restrito</h1>
          <p className="mt-2 text-sm text-[#6E6761]">Essa área é exclusiva para administradores.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F1EC] p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-[#E7DED2] bg-white p-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#9C8A6D]">Administração</p>
            <h1 className="mt-1 text-3xl font-display text-[#231F20]">Planos dos usuários</h1>
            <p className="mt-2 text-sm text-[#7A736C]">Cada cliente já é um usuário e o app trabalha com uma única cobrança por cliente.</p>
          </div>
          <Button onClick={() => { setEditingSubscription(null); setDialogOpen(true); }}>Novo plano</Button>
        </div>

        <div className="space-y-3 rounded-3xl border border-[#E7DED2] bg-[#FBF7F2] p-4 sm:p-5">
          {filteredSubscriptions.map((subscription) => (
            <SubscriptionListItem
              key={subscription.id}
              subscription={subscription}
              user={usersMap[subscription.client_id]}
              onEdit={(item) => { setEditingSubscription(item); setDialogOpen(true); }}
              onRenew={(item) => renewMutation.mutate(item)}
            />
          ))}
        </div>
      </div>

      <SubscriptionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        subscription={editingSubscription}
        users={users}
        onSubmit={(data) => saveMutation.mutate(data)}
      />
    </div>
  );
}