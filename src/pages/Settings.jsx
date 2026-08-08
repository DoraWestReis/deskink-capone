import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, DollarSign, TrendingUp, Clock, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import BottomNav from '@/components/ui/BottomNav';
import Footer from '@/components/ui/Footer';

export default function Settings() {
  const queryClient = useQueryClient();
  
  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['financial-settings'],
    queryFn: () => base44.entities.FinancialSettings.list(),
  });

  const { data: followUpSettingsList = [] } = useQuery({
    queryKey: ['followup-settings'],
    queryFn: () => base44.entities.FollowUpSettings.list(),
  });

  const currentSettings = settings[0] || {
    pix_cash_commission: 50,
    pix_label: 'Pix',
    cash_label: 'Dinheiro',
    card_no_interest_commission: 50,
    card_no_interest_label: 'Cartão sem juros',
    card_with_interest_commission: 50,
    card_with_interest_label: 'Cartão com juros',
    other_commission: 50,
    other_label: 'Outros',
    monthly_goal: 5000,
  };

  const currentFollowUpSettings = followUpSettingsList[0] || {
    aguardando_sinal_days: 3,
    followup_orcamento_days: 3,
    followup_fechamento_days: 3,
    revision_days: 20,
    pos_venda_days: 60,
  };

  const [formData, setFormData] = useState(currentSettings);
  const [followUpFormData, setFollowUpFormData] = useState(currentFollowUpSettings);

  React.useEffect(() => {
    if (settings[0]) {
      setFormData(settings[0]);
    }
  }, [settings]);

  React.useEffect(() => {
    if (followUpSettingsList[0]) {
      setFollowUpFormData(followUpSettingsList[0]);
    }
  }, [followUpSettingsList]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (data) => {
      if (settings[0]?.id) {
        return base44.entities.FinancialSettings.update(settings[0].id, data);
      } else {
        return base44.entities.FinancialSettings.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-settings'] });
    },
  });

  const saveFollowUpSettingsMutation = useMutation({
    mutationFn: async (data) => {
      if (followUpSettingsList[0]?.id) {
        return base44.entities.FollowUpSettings.update(followUpSettingsList[0].id, data);
      } else {
        return base44.entities.FollowUpSettings.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followup-settings'] });
    },
  });

  const handleSave = () => {
    saveSettingsMutation.mutate(formData);
    saveFollowUpSettingsMutation.mutate(followUpFormData);
  };



  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center pb-24">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] pb-[112px]">
      {/* Header */}
      <header className="bg-white/50 backdrop-blur-sm border-b border-[#E8E5E0] sticky top-0 z-30">
        <div className="container mx-auto px-6 py-6 max-w-4xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#2D2D2D] rounded-xl flex items-center justify-center">
              <SettingsIcon className="w-6 h-6 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-[#2D2D2D]">Configurações</h1>
              <p className="text-sm text-[#888888] font-light">Ajuste comissões e metas</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-4xl space-y-6">
        {/* Commission by Payment Method */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-0 shadow-[0_4px_15px_rgba(0,0,0,0.05)] rounded-[20px] overflow-hidden">
            <CardHeader className="bg-[#2D2D2D] text-white pb-6">
              <CardTitle className="flex items-center gap-2 text-lg font-light">
                <TrendingUp className="w-5 h-5" strokeWidth={1.5} />
                Comissão do Tatuador
              </CardTitle>
              <CardDescription className="text-white/70 mt-1 font-light">
                Percentual que você recebe por forma de pagamento
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 pb-6 space-y-6">
              {/* Pix / Dinheiro */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm font-medium text-slate-700">Pix / Dinheiro</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Nome Pix</Label>
                    <Input
                      value={formData.pix_label || 'Pix'}
                      onChange={(e) => setFormData({ ...formData, pix_label: e.target.value })}
                      className="bg-white border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500">Nome Dinheiro</Label>
                    <Input
                      value={formData.cash_label || 'Dinheiro'}
                      onChange={(e) => setFormData({ ...formData, cash_label: e.target.value })}
                      className="bg-white border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Comissão (%)</Label>
                  <Input
                    type="number" step="1" min="0" max="100"
                    value={formData.pix_cash_commission ?? 50}
                    onChange={(e) => setFormData({ ...formData, pix_cash_commission: parseFloat(e.target.value) || 0 })}
                    className="bg-white border-slate-200 rounded-lg text-lg font-semibold"
                  />
                </div>
              </div>

              {/* Cartão sem juros */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  <span className="text-sm font-medium text-slate-700">Cartão sem juros</span>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Nome</Label>
                  <Input
                    value={formData.card_no_interest_label || 'Cartão sem juros'}
                    onChange={(e) => setFormData({ ...formData, card_no_interest_label: e.target.value })}
                    className="bg-white border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Comissão (%)</Label>
                  <Input
                    type="number" step="1" min="0" max="100"
                    value={formData.card_no_interest_commission ?? formData.debit_card_commission ?? 50}
                    onChange={(e) => setFormData({ ...formData, card_no_interest_commission: parseFloat(e.target.value) || 0 })}
                    className="bg-white border-slate-200 rounded-lg text-lg font-semibold"
                  />
                </div>
              </div>

              {/* Cartão com juros */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-sm font-medium text-slate-700">Cartão com juros</span>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Nome</Label>
                  <Input
                    value={formData.card_with_interest_label || 'Cartão com juros'}
                    onChange={(e) => setFormData({ ...formData, card_with_interest_label: e.target.value })}
                    className="bg-white border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Comissão (%)</Label>
                  <Input
                    type="number" step="1" min="0" max="100"
                    value={formData.card_with_interest_commission ?? formData.installment_credit_commission ?? 50}
                    onChange={(e) => setFormData({ ...formData, card_with_interest_commission: parseFloat(e.target.value) || 0 })}
                    className="bg-white border-slate-200 rounded-lg text-lg font-semibold"
                  />
                </div>
              </div>

              {/* Outros */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-slate-500" />
                  <span className="text-sm font-medium text-slate-700">Outros</span>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Nome</Label>
                  <Input
                    value={formData.other_label || 'Outros'}
                    onChange={(e) => setFormData({ ...formData, other_label: e.target.value })}
                    className="bg-white border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Comissão (%)</Label>
                  <Input
                    type="number" step="1" min="0" max="100"
                    value={formData.other_commission ?? 50}
                    onChange={(e) => setFormData({ ...formData, other_commission: parseFloat(e.target.value) || 0 })}
                    className="bg-white border-slate-200 rounded-lg text-lg font-semibold"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Monthly Goal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-0 shadow-[0_4px_15px_rgba(0,0,0,0.05)] rounded-[20px]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-light text-[#2D2D2D]">
                <DollarSign className="w-5 h-5" strokeWidth={1.5} />
                Meta Mensal de Lucro
              </CardTitle>
              <CardDescription className="font-light">Defina seu objetivo financeiro do mês</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Meta (R$)</Label>
                <Input
                  type="number"
                  step="100"
                  value={formData.monthly_goal}
                  onChange={(e) => setFormData({ ...formData, monthly_goal: parseFloat(e.target.value) || 0 })}
                  className="bg-slate-50 border-slate-200 rounded-xl text-lg font-semibold"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>



        {/* Prazos Automáticos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-0 shadow-[0_4px_15px_rgba(0,0,0,0.05)] rounded-[20px]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-light text-[#2D2D2D]">
                <Clock className="w-5 h-5" strokeWidth={1.5} />
                Prazos Automáticos
              </CardTitle>
              <CardDescription className="font-light">Defina em quantos dias cada etapa automática deve acontecer</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Dias para follow-up de sinal</Label>
                <Input
                  type="number"
                  min="1"
                  value={followUpFormData.aguardando_sinal_days ?? 3}
                  onChange={(e) => setFollowUpFormData({ ...followUpFormData, aguardando_sinal_days: parseInt(e.target.value) || 3 })}
                  className="bg-slate-50 border-slate-200 rounded-xl text-lg font-semibold"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Dias para follow-up de orçamento</Label>
                <Input
                  type="number"
                  min="1"
                  value={followUpFormData.followup_orcamento_days ?? 3}
                  onChange={(e) => setFollowUpFormData({ ...followUpFormData, followup_orcamento_days: parseInt(e.target.value) || 3 })}
                  className="bg-slate-50 border-slate-200 rounded-xl text-lg font-semibold"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Dias para follow-up de fechamento</Label>
                <Input
                  type="number"
                  min="1"
                  value={followUpFormData.followup_fechamento_days ?? 3}
                  onChange={(e) => setFollowUpFormData({ ...followUpFormData, followup_fechamento_days: parseInt(e.target.value) || 3 })}
                  className="bg-slate-50 border-slate-200 rounded-xl text-lg font-semibold"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Contatos de Revisão</Label>
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 space-y-2">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Agendados automaticamente após a tatuagem</p>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-700">7 dias</span>
                    <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-700">15 dias</span>
                    <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-700">30 dias</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Dias para pós-venda após a revisão</Label>
                <Input
                  type="number"
                  min="1"
                  value={followUpFormData.pos_venda_days ?? 60}
                  onChange={(e) => setFollowUpFormData({ ...followUpFormData, pos_venda_days: parseInt(e.target.value) || 60 })}
                  className="bg-slate-50 border-slate-200 rounded-xl text-lg font-semibold"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={saveSettingsMutation.isPending || saveFollowUpSettingsMutation.isPending}
          className="w-full h-12 rounded-xl text-base font-light"
        >
          {(saveSettingsMutation.isPending || saveFollowUpSettingsMutation.isPending) ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" strokeWidth={1.5} />
              Salvar Configurações
            </>
          )}
        </Button>
      </main>

      <BottomNav currentPage="Settings" />
      <Footer />
    </div>
  );
}