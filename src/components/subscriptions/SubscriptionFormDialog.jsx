import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const initialState = {
  client_id: '',
  type: 'monthly',
  start_date: '',
  end_date: '',
  status: 'active',
  alert_stage: 'none',
  last_payment_date: '',
  developer_notes: '',
};

export default function SubscriptionFormDialog({ open, onOpenChange, subscription, users, onSubmit }) {
  const [form, setForm] = useState(initialState);

  useEffect(() => {
    if (subscription) {
      setForm({ ...initialState, ...subscription });
    } else {
      setForm(initialState);
    }
  }, [subscription, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-[28px] bg-[#FCF8F4]">
        <DialogHeader>
          <DialogTitle>{subscription ? 'Editar assinatura' : 'Nova assinatura'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label>Cliente</Label>
            <Select value={form.client_id} onValueChange={(value) => setForm({ ...form, client_id: value })}>
              <SelectTrigger><SelectValue placeholder="Selecione um usuário" /></SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>{user.full_name || user.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Mensal</SelectItem>
                <SelectItem value="annual">Anual</SelectItem>
                <SelectItem value="free">Gratuito</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="pending_renewal">Pendente renovação</SelectItem>
                <SelectItem value="expired">Expirado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Início</Label>
            <Input type="date" value={form.start_date || ''} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Vencimento</Label>
            <Input type="date" value={form.end_date || ''} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Último pagamento</Label>
            <Input type="date" value={form.last_payment_date || ''} onChange={(e) => setForm({ ...form, last_payment_date: e.target.value })} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Anotações</Label>
            <Textarea value={form.developer_notes || ''} onChange={(e) => setForm({ ...form, developer_notes: e.target.value })} />
          </div>
          <div className="md:col-span-2 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}