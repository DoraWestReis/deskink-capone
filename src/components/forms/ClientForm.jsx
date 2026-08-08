import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Phone, CreditCard, Calendar, MapPin, Users, Mail } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import QuickAddClientForm from "@/components/forms/QuickAddClientForm";
import ClientSearchSelect from "@/components/forms/ClientSearchSelect";
import ClearableDate from "@/components/forms/ClearableDate";

const leadOrigins = [
  'Indicação', 'Instagram', 'TikTok', 'Google', 'Repasse Studio', 'Network', 'Tráfego', 'Outros'
];

export default function ClientForm({ client, onChange, disabled, allClients = [] }) {
  const [showQuickAddDialog, setShowQuickAddDialog] = useState(false);

  const handleQuickAddSuccess = (newClient) => {
    onChange({ ...client, referred_by: newClient.id });
    setShowQuickAddDialog(false);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#9C8A6D] flex items-center gap-1.5">
            <User className="w-3 h-3" />
            Nome Completo *
          </Label>
          <Input
            value={client?.name || ''}
            onChange={(e) => onChange({ ...client, name: e.target.value })}
            placeholder="Nome do cliente"
            disabled={disabled}
            className="h-11 rounded-2xl border-[#E5DDD2] bg-white text-[#231F20] placeholder:text-[#9A9188] focus-visible:ring-[#B89A66]/30"
          />
        </div>
        
        <div className="space-y-2">
          <Label className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#9C8A6D] flex items-center gap-1.5">
            <Phone className="w-3 h-3" />
            WhatsApp *
          </Label>
          <Input
            value={client?.whatsapp || ''}
            onChange={(e) => onChange({ ...client, whatsapp: e.target.value })}
            placeholder="+55 11 99999-9999"
            disabled={disabled}
            className="h-11 rounded-2xl border-[#E5DDD2] bg-white text-[#231F20] placeholder:text-[#9A9188] focus-visible:ring-[#B89A66]/30"
          />
        </div>
        
        <div className="space-y-2">
          <Label className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#9C8A6D] flex items-center gap-1.5">
            <Mail className="w-3 h-3" />
            Email
          </Label>
          <Input
            type="email"
            value={client?.email || ''}
            onChange={(e) => onChange({ ...client, email: e.target.value })}
            placeholder="email@exemplo.com"
            disabled={disabled}
            className="h-11 rounded-2xl border-[#E5DDD2] bg-white text-[#231F20] placeholder:text-[#9A9188] focus-visible:ring-[#B89A66]/30"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#9C8A6D] flex items-center gap-1.5">
            <CreditCard className="w-3 h-3" />
            CPF
          </Label>
          <Input
            value={client?.cpf || ''}
            onChange={(e) => onChange({ ...client, cpf: e.target.value })}
            placeholder="000.000.000-00"
            disabled={disabled}
            className="h-11 rounded-2xl border-[#E5DDD2] bg-white text-[#231F20] placeholder:text-[#9A9188] focus-visible:ring-[#B89A66]/30"
          />
        </div>
        
        <div className="space-y-2">
          <Label className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#9C8A6D] flex items-center gap-1.5">
            <Calendar className="w-3 h-3" />
            Data de Nascimento
          </Label>
          <ClearableDate
            value={client?.birth_date || ''}
            onChange={(value) => onChange({ ...client, birth_date: value || null })}
            disabled={disabled}
            className="h-11 rounded-2xl border-[#E5DDD2] bg-white text-[#231F20] placeholder:text-[#9A9188] focus-visible:ring-[#B89A66]/30"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#9C8A6D] flex items-center gap-1.5">
            <MapPin className="w-3 h-3" />
            Cidade
          </Label>
          <Input
            value={client?.city || ''}
            onChange={(e) => onChange({ ...client, city: e.target.value })}
            placeholder="Digite a cidade"
            disabled={disabled}
            className="h-11 rounded-2xl border-[#E5DDD2] bg-white text-[#231F20] placeholder:text-[#9A9188] focus-visible:ring-[#B89A66]/30"
          />
        </div>
        
        <div className="space-y-2">
          <Label className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#9C8A6D] flex items-center gap-1.5">
            <MapPin className="w-3 h-3" />
            Origem do Lead
          </Label>
          <Select
            value={client?.lead_origin || ''}
            onValueChange={(value) => onChange({ ...client, lead_origin: value })}
            disabled={disabled}
          >
            <SelectTrigger className="h-11 rounded-2xl border-[#E5DDD2] bg-white text-[#231F20]">
              <SelectValue placeholder="Selecione a origem" />
            </SelectTrigger>
            <SelectContent>
              {leadOrigins.map((origin) => (
                <SelectItem key={origin} value={origin}>{origin}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#9C8A6D] flex items-center gap-1.5">
            <Calendar className="w-3 h-3" />
            Data do Cadastro
          </Label>
          <ClearableDate
            value={client?.registration_date || ''}
            onChange={(value) => onChange({ ...client, registration_date: value || null })}
            disabled={disabled}
            className="h-11 rounded-2xl border-[#E5DDD2] bg-white text-[#231F20] placeholder:text-[#9A9188] focus-visible:ring-[#B89A66]/30"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#9C8A6D] flex items-center gap-1.5">
            <Users className="w-3 h-3" />
            Indicado por
          </Label>
          <ClientSearchSelect
            value={client?.referred_by || null}
            onChange={(value) => onChange({ ...client, referred_by: value })}
            clients={allClients}
            disabled={disabled}
            onAddNew={() => setShowQuickAddDialog(true)}
          />

          <Dialog open={showQuickAddDialog} onOpenChange={setShowQuickAddDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Cadastro Rápido</DialogTitle>
                <DialogDescription>
                  Adicione rapidamente um cliente que indicou este novo cliente
                </DialogDescription>
              </DialogHeader>
              <QuickAddClientForm 
                onSuccess={handleQuickAddSuccess}
                onCancel={() => setShowQuickAddDialog(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}