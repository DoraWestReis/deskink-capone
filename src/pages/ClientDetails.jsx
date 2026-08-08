import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, MessageCircle, Calendar, MapPin, Edit2, Save, User, FileText, Heart, History, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import ClientForm from '@/components/forms/ClientForm';
import BottomNav from '@/components/ui/BottomNav';
import FloatingActionButton from '@/components/ui/FloatingActionButton';
import Footer from '@/components/ui/Footer';
import { getClientPaidAmount } from '@/components/utils/clientMetrics';

const pipelineStages = {
  novo_contato: { label: 'Novo Contato', color: 'bg-blue-500' },
  agendado_orcamento_presencial: { label: 'Orçamento Presencial', color: 'bg-purple-500' },
  followup_orcamento: { label: 'Follow-up Orçamento', color: 'bg-yellow-500' },
  followup_fechamento: { label: 'Follow-up Fechamento', color: 'bg-indigo-500' },
  aguardando_sinal: { label: 'Aguardando Sinal', color: 'bg-amber-500' },
  agendado: { label: 'Agendado', color: 'bg-green-500' },
  revisao: { label: 'Revisão', color: 'bg-violet-500' },
  pos_venda: { label: 'Pós-Venda', color: 'bg-slate-500' },
  perdido: { label: 'Perdido', color: 'bg-red-500' },
  concluido: { label: 'Concluído', color: 'bg-emerald-600' },
};

export default function ClientDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const clientId = urlParams.get('id');
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [editedClient, setEditedClient] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showReferrals, setShowReferrals] = useState(false);

  const queryClient = useQueryClient();

  const { data: client = null, isLoading: clientLoading } = useQuery({
    queryKey: ['client', clientId],
    queryFn: async () => {
      const clients = await base44.entities.Client.filter({ id: clientId });
      return clients[0] || null;
    },
    enabled: !!clientId,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['client-projects', clientId],
    queryFn: async () => {
      return base44.entities.Project.filter({ client_id: clientId }, '-created_date');
    },
    enabled: !!clientId,
  });

  const { data: allClients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date'),
  });

  const { data: healthRecord = null } = useQuery({
    queryKey: ['health-record', clientId],
    queryFn: async () => {
      const records = await base44.entities.HealthRecord.filter({ client_id: clientId });
      return records[0] || null;
    },
    enabled: !!clientId,
  });

  const updateClientMutation = useMutation({
    mutationFn: (data) => base44.entities.Client.update(clientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
      setIsEditingClient(false);
    },
  });

  const handleSaveClient = async () => {
    const newName = editedClient.name;
    await base44.entities.Client.update(clientId, editedClient);
    // Sync denormalized client_name in all related entities
    if (newName && newName !== client.name) {
      await Promise.all(projects.map(p =>
        base44.entities.Project.update(p.id, { client_name: newName })
      ));
      const followUps = await base44.entities.FollowUpTask.filter({ project_id: projects.map(p => p.id) });
      await Promise.all(followUps.map(fu =>
        base44.entities.FollowUpTask.update(fu.id, { client_name: newName })
      ));
    }
    queryClient.invalidateQueries({ queryKey: ['client', clientId] });
    queryClient.invalidateQueries({ queryKey: ['client-projects', clientId] });
    queryClient.invalidateQueries({ queryKey: ['clients'] });
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    setIsEditingClient(false);
  };

  const handleDeleteClient = async () => {
    setIsDeleting(true);
    // Delete associated projects, health records, stage history, and follow-up tasks
    for (const project of projects) {
      const stageHistory = await base44.entities.ProjectStageHistory.filter({ project_id: project.id });
      for (const sh of stageHistory) {
        await base44.entities.ProjectStageHistory.delete(sh.id);
      }
      const followUps = await base44.entities.FollowUpTask.filter({ project_id: project.id });
      for (const fu of followUps) {
        await base44.entities.FollowUpTask.delete(fu.id);
      }
      await base44.entities.Project.delete(project.id);
    }
    if (healthRecord) {
      await base44.entities.HealthRecord.delete(healthRecord.id);
    }
    await base44.entities.Client.delete(clientId);
    window.location.href = '/Clients';
  };

  React.useEffect(() => {
    if (client) setEditedClient(client);
  }, [client]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  };

  const openWhatsApp = (whatsapp) => {
    const cleanNumber = whatsapp?.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanNumber}`, '_blank');
  };

  const savedLtv = Number(client?.total_spent_history) || 0;
  const ltv = Math.max(savedLtv, getClientPaidAmount(projects));
  const completedProjects = projects.filter(p => p.pipeline_stage === 'concluido' || p.is_concluded === true).length;
  
  // Quantidade de indicações - clientes que este cliente indicou
  const referralsCount = allClients.filter(c => c.referred_by === clientId).length;

  if (!clientId) {
    return (
      <div className="min-h-screen bg-[#18151B] flex items-center justify-center">
        <div className="text-sm text-white/60">Selecione um cliente para ver os detalhes.</div>
      </div>
    );
  }

  if (clientLoading) {
    return (
      <div className="min-h-screen bg-[#18151B] flex items-center justify-center">
        <div className="text-sm text-white/60">Carregando cliente...</div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-[#18151B] flex items-center justify-center">
        <div className="text-sm text-white/60">Cliente não encontrado</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#18151B] pb-[112px]">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[radial-gradient(circle_at_top_left,_rgba(184,154,102,0.22),_transparent_35%),linear-gradient(135deg,#221D25_0%,#18151B_55%,#131017_100%)] backdrop-blur-xl">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-5 sm:py-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <Link
                to={createPageUrl('Clients')}
                className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/70 transition-all hover:bg-white/10 hover:text-white"
              >
                <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
              </Link>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/50">Relacionamento</p>
                <h1 className="mt-2 text-3xl sm:text-4xl font-display text-white">Detalhes do Cliente</h1>
                <p className="mt-2 text-sm text-white/65">Acompanhe histórico, dados e saúde do cliente dentro do mesmo padrão visual da operação.</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => isEditingClient ? handleSaveClient() : setIsEditingClient(true)}
              className={`h-11 rounded-2xl border-white/10 px-4 ${isEditingClient ? 'bg-[#B89A66] text-white hover:bg-[#A88959]' : 'bg-white/5 text-white hover:bg-white/10 hover:text-white'}`}
            >
              {isEditingClient ? <Save className="w-4 h-4 mr-2" /> : <Edit2 className="w-4 h-4 mr-2" />}
              {isEditingClient ? 'Salvar' : 'Editar'}
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 -mt-2 rounded-t-[30px] bg-[#F6F1EC] min-h-[calc(100vh-140px)]">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[28px] border border-[#E7DED2] bg-[#FCF8F4] p-5 sm:p-6 shadow-[0_12px_30px_rgba(35,31,32,0.05)]"
          >
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 flex-1 items-start gap-4 sm:gap-5">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[24px] bg-[linear-gradient(135deg,#231F20_0%,#18151B_100%)] text-2xl font-bold text-white shadow-[0_12px_24px_rgba(24,21,27,0.18)]">
                  {client.name?.substring(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl sm:text-3xl font-display text-[#231F20]">{client.name}</h2>
                    {projects.length > 1 && (
                      <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700">Recorrente</Badge>
                    )}
                    {client.lead_origin && (
                      <Badge className="border border-[#E5D6BF] bg-[#F7F0E6] text-[#8F7445]">{client.lead_origin}</Badge>
                    )}
                    {savedLtv > 0 && (
                      <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700">
                        LTV salvo: {formatCurrency(savedLtv)}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm text-[#6E6761]">
                    <span className="flex items-center gap-1.5">
                      <MessageCircle className="w-4 h-4 text-[#9C8A6D]" />
                      {client.whatsapp}
                    </span>
                    {client.city && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-[#9C8A6D]" />
                        {client.city}
                      </span>
                    )}
                    {client.birth_date && (
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-[#9C8A6D]" />
                        {client.birth_date.includes('-') ? client.birth_date.split('-').reverse().join('/') : client.birth_date}
                      </span>
                    )}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button
                      onClick={() => openWhatsApp(client.whatsapp)}
                      className="h-11 rounded-2xl bg-[#231F20] px-5 text-white hover:bg-[#18151B]"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Chamar no WhatsApp
                    </Button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:w-[360px]">
                <div className="rounded-2xl border border-[#E8DED1] bg-white px-4 py-4 text-center">
                  <p className="text-2xl font-display text-[#231F20]">{projects.length}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#9C8A6D]">Projetos</p>
                </div>
                <div className="rounded-2xl border border-[#E8DED1] bg-white px-4 py-4 text-center">
                  <p className="text-2xl font-display text-[#231F20]">{completedProjects}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#9C8A6D]">Concluídos</p>
                </div>
                <div className="rounded-2xl border border-[#E8DED1] bg-white px-4 py-4 text-center">
                  <p className="text-lg font-semibold text-[#231F20]">{formatCurrency(ltv)}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#9C8A6D]">LTV</p>
                </div>
                <button
                  onClick={() => setShowReferrals(!showReferrals)}
                  disabled={referralsCount === 0}
                  className="rounded-2xl border border-[#E8DED1] bg-white px-4 py-4 text-center transition hover:bg-[#FBF6F0] disabled:cursor-default disabled:hover:bg-white"
                >
                  <p className="text-2xl font-display text-[#231F20]">{referralsCount}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#9C8A6D]">Indicações</p>
                </button>
              </div>
            </div>

            {showReferrals && referralsCount > 0 && (
              <div className="mt-6 border-t border-[#E8DED1] pt-5">
                <p className="text-sm font-medium text-[#6E6761] mb-3">Clientes indicados por {client.name}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {allClients.filter(c => c.referred_by === clientId).map(referral => (
                    <Link key={referral.id} to={`/ClientDetails?id=${referral.id}`}>
                      <div className="flex items-center gap-3 rounded-2xl border border-[#E8DED1] bg-white p-3 transition hover:bg-[#FBF6F0]">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#231F20] text-sm font-semibold text-white">
                          {referral.name?.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#231F20]">{referral.name}</p>
                          <p className="text-xs text-[#7A736C]">{referral.whatsapp}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </motion.section>

          <Tabs defaultValue="info" className="space-y-6">
            <TabsList className="grid h-auto w-full grid-cols-3 rounded-[22px] border border-[#E7DED2] bg-[#FCF8F4] p-1">
              <TabsTrigger value="info" className="rounded-[18px] data-[state=active]:bg-white data-[state=active]:text-[#231F20] data-[state=active]:shadow-sm">
                <User className="w-4 h-4 mr-2" />
                Informações
              </TabsTrigger>
              <TabsTrigger value="projects" className="rounded-[18px] data-[state=active]:bg-white data-[state=active]:text-[#231F20] data-[state=active]:shadow-sm">
                <History className="w-4 h-4 mr-2" />
                Histórico
              </TabsTrigger>
              <TabsTrigger value="health" className="rounded-[18px] data-[state=active]:bg-white data-[state=active]:text-[#231F20] data-[state=active]:shadow-sm">
                <Heart className="w-4 h-4 mr-2" />
                Saúde
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-[28px] border border-[#E7DED2] bg-[#FCF8F4] p-5 sm:p-6 shadow-[0_12px_30px_rgba(35,31,32,0.05)]"
              >
                <h3 className="mb-4 text-base font-display text-[#231F20] flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#B08954]" />
                  Dados do Cliente
                </h3>
                {editedClient && (
                  <ClientForm
                    client={editedClient}
                    onChange={setEditedClient}
                    disabled={!isEditingClient}
                    allClients={allClients.filter(c => c.id !== clientId)}
                  />
                )}
                {client.notes && (
                  <div className="mt-5 rounded-2xl border border-[#E8DED1] bg-white p-4">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-[#9C8A6D] mb-2">Observações</p>
                    <p className="text-sm text-[#6E6761]">{client.notes}</p>
                  </div>
                )}
              </motion.div>
            </TabsContent>

            <TabsContent value="projects">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[#9C8A6D]">Relacionamento</p>
                    <h3 className="mt-1 text-xl font-display text-[#231F20]">Histórico de Projetos</h3>
                  </div>
                  <Link to={`/NewProject?clientId=${client.id}&clientName=${encodeURIComponent(client.name)}`}>
                    <Button className="h-11 rounded-2xl bg-[#231F20] text-white hover:bg-[#18151B]">
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Projeto
                    </Button>
                  </Link>
                </div>
                {projects.length === 0 ? (
                  <div className="rounded-[28px] border border-[#E7DED2] bg-[#FCF8F4] p-8 text-center shadow-[0_12px_30px_rgba(35,31,32,0.05)]">
                    <FileText className="w-12 h-12 text-[#C8B8A3] mx-auto mb-3" />
                    <p className="text-[#6E6761]">Nenhum projeto registrado</p>
                  </div>
                ) : (
                  projects.map((project) => (
                    <Link key={project.id} to={`/ProjectDetails?id=${project.id}`}>
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-[28px] border border-[#E7DED2] bg-[#FCF8F4] p-5 shadow-[0_12px_30px_rgba(35,31,32,0.05)] transition hover:shadow-[0_16px_36px_rgba(35,31,32,0.08)]"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <h4 className="text-base font-semibold text-[#231F20] mb-2">{project.description}</h4>
                            <div className="flex flex-wrap gap-3 text-xs text-[#7A736C]">
                              {project.style && <span>{project.style}</span>}
                              {project.session_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {format(new Date(project.session_date), "dd/MM/yyyy 'às' HH:mm")}
                                </span>
                              )}
                            </div>
                          </div>
                          <Badge className={pipelineStages[project.pipeline_stage]?.color + ' text-white'}>
                            {pipelineStages[project.pipeline_stage]?.label}
                          </Badge>
                        </div>
                        <div className="mt-4 flex items-center justify-between border-t border-[#E8DED1] pt-4">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.14em] text-[#9C8A6D]">Valor</p>
                            <p className="text-sm font-semibold text-[#231F20]">{formatCurrency(project.total_value)}</p>
                          </div>
                          {project.payment_method && (
                            <Badge variant="outline" className="border-[#DCCFBD] text-[#6E6761]">{project.payment_method}</Badge>
                          )}
                        </div>
                      </motion.div>
                    </Link>
                  ))
                )}
              </motion.div>
            </TabsContent>

            <TabsContent value="health">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-[28px] border border-[#E7DED2] bg-[#FCF8F4] p-5 sm:p-6 shadow-[0_12px_30px_rgba(35,31,32,0.05)]"
              >
                <h3 className="mb-4 text-base font-display text-[#231F20] flex items-center gap-2">
                  <Heart className="w-5 h-5 text-[#B08954]" />
                  Ficha de Saúde
                </h3>
                {healthRecord ? (
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-[#E8DED1] bg-white p-4">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-[#9C8A6D] mb-2">Alergias</p>
                      <div className="space-y-1 text-sm text-[#6E6761]">
                        <p>Pigmentos: {healthRecord.allergies_pigments ? 'Sim' : 'Não'}</p>
                        <p>Metais: {healthRecord.allergies_metals ? 'Sim' : 'Não'}</p>
                        <p>Látex: {healthRecord.allergies_latex ? 'Sim' : 'Não'}</p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-[#E8DED1] bg-white p-4">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-[#9C8A6D] mb-2">Condições</p>
                      <div className="space-y-1 text-sm text-[#6E6761]">
                        <p>Diabetes: {healthRecord.has_diabetes ? 'Sim' : 'Não'}</p>
                        <p>Hipertensão: {healthRecord.has_hypertension ? 'Sim' : 'Não'}</p>
                        <p>Anemia: {healthRecord.has_anemia ? 'Sim' : 'Não'}</p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-[#E8DED1] bg-white p-4">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-[#9C8A6D] mb-2">Medicamentos</p>
                      <div className="space-y-1 text-sm text-[#6E6761]">
                        <p>Anticoagulantes: {healthRecord.uses_anticoagulants ? 'Sim' : 'Não'}</p>
                        <p>Antibióticos: {healthRecord.uses_antibiotics ? 'Sim' : 'Não'}</p>
                        <p>Antidepressivos: {healthRecord.uses_antidepressants ? 'Sim' : 'Não'}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-[#E8DED1] bg-white py-10 text-center">
                    <Heart className="w-12 h-12 text-[#C8B8A3] mx-auto mb-3" />
                    <p className="text-[#6E6761]">Ficha de saúde não preenchida</p>
                  </div>
                )}
              </motion.div>
            </TabsContent>
          </Tabs>

          <section className="rounded-[28px] border border-red-200 bg-[#FFF7F6] p-5 sm:p-6 shadow-[0_12px_30px_rgba(35,31,32,0.04)]">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-100">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-display text-[#231F20] mb-2">Zona de Perigo</h3>
                <p className="text-sm text-[#6E6761] mb-4">
                  Ao excluir este cliente, os dados vinculados também serão removidos permanentemente.
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={isDeleting}>
                      <Trash2 className="w-4 h-4 mr-1" />
                      {isDeleting ? 'Excluindo...' : 'Excluir Cliente'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Tem certeza que deseja excluir?</AlertDialogTitle>
                      <AlertDialogDescription>
                        O cliente <strong>{client.name}</strong> será excluído permanentemente com todo o histórico vinculado.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteClient}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Sim, excluir tudo
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </section>
        </div>
      </main>

      <FloatingActionButton />
      <BottomNav currentPage="Clients" />
      <Footer />
    </div>
  );
}