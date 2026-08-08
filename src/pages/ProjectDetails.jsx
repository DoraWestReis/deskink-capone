import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, User, FileText, Heart, Edit2, Save, Trash2, Loader2, Calendar, DollarSign, MessageCircle, History, Image as ImageIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
} from "@/components/ui/alert-dialog";
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import ClientForm from '@/components/forms/ClientForm';
import ProjectForm from '@/components/forms/ProjectForm';
import HealthRecordForm from '@/components/forms/HealthRecordForm';
import ImageGallery from '@/components/project/ImageGallery';
import PaymentConfirmationDialog from '@/components/pipeline/PaymentConfirmationDialog';
import LostReasonDialog from '@/components/pipeline/LostReasonDialog';
import ProjectFollowUpTimeline from '@/components/project/ProjectFollowUpTimeline';
import BottomNav from '@/components/ui/BottomNav';
import FloatingActionButton from '@/components/ui/FloatingActionButton';
import Footer from '@/components/ui/Footer';

const stageConfig = {
  novo_contato: { label: 'Novo Contato', color: 'bg-blue-100 text-blue-700' },
  agendado_orcamento_presencial: { label: 'Agendado Orçamento Presencial', color: 'bg-indigo-100 text-indigo-700' },
  followup_fechamento: { label: 'Follow-up Fechamento', color: 'bg-orange-100 text-orange-700' },
  perdido: { label: 'Perdido', color: 'bg-red-100 text-red-700' },
  followup_orcamento: { label: 'Follow-up Orçamento', color: 'bg-yellow-100 text-yellow-700' },
  aguardando_sinal: { label: 'Aguardando Sinal', color: 'bg-amber-100 text-amber-700' },
  agendado: { label: 'Agendado', color: 'bg-emerald-100 text-emerald-700' },
  revisao: { label: 'Revisão', color: 'bg-purple-100 text-purple-700' },
  pos_venda: { label: 'Pós-Venda', color: 'bg-slate-100 text-slate-700' },
  concluido: { label: 'Concluído', color: 'bg-green-100 text-green-700' },
};

const TIME_ZONE = 'America/Sao_Paulo';

const toLocalDateString = (value) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
};

const addDaysToLocalDate = (value, days) => {
  const date = new Date(`${toLocalDateString(value)}T00:00:00-03:00`);
  date.setDate(date.getDate() + days);
  return toLocalDateString(date);
};

const getSuggestedRevisionDate = (tattooDate, revisionDays = 20) => {
  if (!tattooDate) return '';
  return addDaysToLocalDate(`${tattooDate}T12:00:00-03:00`, revisionDays);
};

export default function ProjectDetails() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');

  const [isEditing, setIsEditing] = useState(false);
  const [editedProject, setEditedProject] = useState(null);
  const [editedHealth, setEditedHealth] = useState(null);
  const [activeTab, setActiveTab] = useState('project');

  // Payment confirmation dialog state
  const [paymentDialog, setPaymentDialog] = useState({ open: false, type: null, pendingStage: null, source: null });
  const [lostReasonDialog, setLostReasonDialog] = useState({ open: false, source: null });

  const { data: project = null, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const projects = await base44.entities.Project.filter({ id: projectId });
      return projects[0] || null;
    },
    enabled: !!projectId,
  });

  const { data: client = null } = useQuery({
    queryKey: ['client', project?.client_id],
    queryFn: async () => {
      const clients = await base44.entities.Client.filter({ id: project.client_id });
      return clients[0] || null;
    },
    enabled: !!project?.client_id,
  });

  const { data: healthRecords = [] } = useQuery({
    queryKey: ['health-record', project?.client_id],
    queryFn: () => base44.entities.HealthRecord.filter({ client_id: project.client_id }),
    enabled: !!project?.client_id,
  });

  const { data: stageHistory = [] } = useQuery({
    queryKey: ['stage-history', projectId],
    queryFn: () => base44.entities.ProjectStageHistory.filter({ project_id: projectId }, '-changed_at'),
    enabled: !!projectId,
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['financial-settings'],
    queryFn: () => base44.entities.FinancialSettings.list(),
  });

  const { data: followUpSettings = [] } = useQuery({
    queryKey: ['followup-settings'],
    queryFn: () => base44.entities.FollowUpSettings.list(),
  });

  const { data: followUpTasks = [] } = useQuery({
    queryKey: ['project-follow-up-tasks', projectId],
    queryFn: () => base44.entities.FollowUpTask.filter({ project_id: projectId }, 'due_date'),
    enabled: !!projectId,
  });

  const financialSettings = settings?.[0] || null;

  const healthRecord = healthRecords?.[0] || null;


  useEffect(() => {
    if (project && !isEditing) setEditedProject(project);
  }, [project, isEditing]);

  useEffect(() => {
    if (isEditing) return;
    if (healthRecord) setEditedHealth(healthRecord);
    else if (project?.client_id) setEditedHealth({ client_id: project.client_id });
  }, [healthRecord, project?.client_id, isEditing]);

  const updateProjectMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.update(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const saveHealthMutation = useMutation({
    mutationFn: async (data) => {
      if (healthRecord?.id) {
        return base44.entities.HealthRecord.update(healthRecord.id, data);
      } else {
        return base44.entities.HealthRecord.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-record', project?.client_id] });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: () => base44.entities.Project.delete(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      navigate(createPageUrl('Clients'));
    },
  });

  // Check if a stage transition needs payment confirmation
  const needsPaymentConfirmation = (oldStage, newStage) => {
    if (oldStage === 'aguardando_sinal' && newStage === 'agendado') return 'deposit';
    if (oldStage === 'agendado' && newStage === 'revisao') return 'total_value';
    return null;
  };

  // Proceed with actual save after confirmation
  const proceedWithSave = async (extraData = {}) => {
    const oldSessionDate = project.session_date;
    const oldStage = project.pipeline_stage;
    const oldRevisionDate = project.revision_date;
    const oldRevisionDateTime = project.revision_datetime;
    const oldRevisionDuration = project.revision_duration_minutes;

    const finalProjectData = {
      ...editedProject,
      ...extraData,
    };

    if (finalProjectData.tattoo_date && !finalProjectData.revision_date) {
      finalProjectData.revision_date = getSuggestedRevisionDate(
        finalProjectData.tattoo_date,
        financialSettings?.revision_days || 20
      );
    }

    const becameNoShow = project.attendance_status !== 'no_show' && finalProjectData.attendance_status === 'no_show';
    if (becameNoShow) {
      finalProjectData.pipeline_stage = 'followup_orcamento';
    }

    const newSessionDate = finalProjectData.session_date;
    const newStage = finalProjectData.pipeline_stage;
    const revisionScheduleChanged =
      oldRevisionDate !== finalProjectData.revision_date ||
      oldRevisionDateTime !== finalProjectData.revision_datetime ||
      oldRevisionDuration !== finalProjectData.revision_duration_minutes;

    const normalizeLocalDateTime = (value) => {
      if (!value) return value;
      let normalized = value;
      if (!normalized.includes('T')) {
        normalized = `${normalized}T00:00:00`;
      }
      if (normalized.length === 16) {
        normalized = `${normalized}:00`;
      }
      if (!normalized.includes('Z') && !normalized.includes('+') && !normalized.includes('-', 10)) {
        normalized = `${normalized}-03:00`;
      }
      return normalized;
    };

    // Garantir que session_date seja ISO completo se existir
    let sessionDateISO = normalizeLocalDateTime(newSessionDate);
    const revisionDateTimeISO = normalizeLocalDateTime(finalProjectData.revision_datetime);
    finalProjectData.revision_datetime = revisionDateTimeISO;

    // Create history record if stage changed
    if (oldStage !== newStage) {
      // Check if there's already a recent history entry with the same stage
      const recentHistory = await base44.entities.ProjectStageHistory.filter(
        { project_id: projectId, pipeline_stage: newStage },
        '-changed_at',
        1
      );

      const shouldCreateHistory = !recentHistory.length || 
        (new Date() - new Date(recentHistory[0].changed_at)) > 60000; // More than 1 minute ago

      if (shouldCreateHistory) {
        await base44.entities.ProjectStageHistory.create({
          project_id: projectId,
          pipeline_stage: newStage,
          session_date: sessionDateISO || newSessionDate,
          changed_at: new Date().toISOString()
        });
      }
    }

    await Promise.all([
      updateProjectMutation.mutateAsync({
        ...finalProjectData,
        session_date: sessionDateISO,
        stage_updated_at: oldStage !== newStage ? new Date().toISOString() : finalProjectData.stage_updated_at
      }),
      editedHealth && saveHealthMutation.mutateAsync(editedHealth),
    ]);

    // Invalidate stage history after saving
    if (oldStage !== newStage) {
      queryClient.invalidateQueries({ queryKey: ['stage-history', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-follow-up-tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['follow-up-tasks'] });
    }

    // Sync with Google Calendar
    const isNewStageScheduled = newStage === 'agendado' || newStage === 'agendado_orcamento_presencial' || newStage === 'followup_orcamento';
    const wasOldStageScheduled = oldStage === 'agendado' || oldStage === 'agendado_orcamento_presencial' || oldStage === 'followup_orcamento';
    const sessionDateChanged = oldSessionDate !== sessionDateISO;
    const stageChanged = oldStage !== newStage;

    if (isNewStageScheduled && sessionDateISO) {
      // Create or update event if in scheduled stage with date
      try {
        await base44.functions.invoke('syncCalendar', {
          action: finalProjectData.calendar_event_id ? 'update' : 'create',
          projectId: projectId
        });
      } catch (error) {
        console.error('Calendar sync failed:', error);
      }
    } else if (!isNewStageScheduled && wasOldStageScheduled && editedProject.calendar_event_id) {
      // Delete event if moved out of scheduled stage
      try {
        await base44.functions.invoke('syncCalendar', {
          action: 'delete',
          projectId: projectId
        });
      } catch (error) {
        console.error('Calendar sync failed:', error);
      }
    }

    // Handle automatic scheduling for revisao and pos_venda stages
    if (newStage === 'revisao' || revisionScheduleChanged) {
      try {
        await base44.functions.invoke('scheduleFollowUpEvent', {
          projectId: projectId,
          eventType: 'revisao'
        });
      } catch (error) {
        console.error('Revisão scheduling failed:', error);
      }
    }

    if (newStage === 'pos_venda' || (revisionScheduleChanged && finalProjectData.pos_venda_calendar_event_id)) {
      try {
        await base44.functions.invoke('scheduleFollowUpEvent', {
          projectId: projectId,
          eventType: 'pos_venda'
        });
      } catch (error) {
        console.error('Pós-venda scheduling failed:', error);
      }
    }

    setIsEditing(false);
  };

  const performQuickStageChange = async (newStage, extraStageData = {}) => {
    const oldStage = project.pipeline_stage;

    // Auto-set closing_date when moving to followup_fechamento
    if (newStage === 'followup_fechamento' && !project.closing_date) {
      extraStageData.closing_date = toLocalDateString(new Date());
    }

    // Save directly
    const sessionDateISO = project.session_date;
    if (oldStage !== newStage) {
      await base44.entities.ProjectStageHistory.create({
        project_id: projectId,
        pipeline_stage: newStage,
        session_date: sessionDateISO,
        changed_at: new Date().toISOString()
      });
    }
    await updateProjectMutation.mutateAsync({
      ...project,
      pipeline_stage: newStage,
      stage_updated_at: new Date().toISOString(),
      ...extraStageData
    });
    queryClient.invalidateQueries({ queryKey: ['stage-history', projectId] });
    queryClient.invalidateQueries({ queryKey: ['project-follow-up-tasks', projectId] });
    queryClient.invalidateQueries({ queryKey: ['follow-up-tasks'] });

    const isNewStageScheduled = newStage === 'agendado' || newStage === 'agendado_orcamento_presencial' || newStage === 'followup_orcamento';
    const wasOldStageScheduled = oldStage === 'agendado' || oldStage === 'agendado_orcamento_presencial' || oldStage === 'followup_orcamento';

    if (isNewStageScheduled && project.session_date) {
      try {
        await base44.functions.invoke('syncCalendar', {
          action: project.calendar_event_id ? 'update' : 'create',
          projectId: projectId,
        });
      } catch (error) {
        console.error('Calendar sync failed:', error);
      }
    } else if (!isNewStageScheduled && wasOldStageScheduled && project.calendar_event_id) {
      try {
        await base44.functions.invoke('syncCalendar', {
          action: 'delete',
          projectId: projectId,
        });
      } catch (error) {
        console.error('Calendar sync failed:', error);
      }
    }

    if (newStage === 'revisao' || newStage === 'pos_venda') {
      try {
        await base44.functions.invoke('scheduleFollowUpEvent', {
          projectId: projectId,
          eventType: newStage,
        });
      } catch (error) {
        console.error('Follow-up scheduling failed:', error);
      }
    }
  };

  const handleStageChange = async (newStage) => {
    const oldStage = project.pipeline_stage;
    const confirmType = needsPaymentConfirmation(oldStage, newStage);

    setEditedProject(prev => ({ ...(prev || project), pipeline_stage: newStage }));

    if (newStage === 'perdido' && oldStage !== 'perdido') {
      setLostReasonDialog({ open: true, source: 'quick' });
      return;
    }

    if (confirmType) {
      setPaymentDialog({ open: true, type: confirmType, pendingStage: newStage, source: 'quick' });
      return;
    }

    await performQuickStageChange(newStage);
  };

  const handlePaymentConfirm = async ({ value, method, date }) => {
    const extraData = {};
    if (paymentDialog.type === 'deposit') {
      extraData.deposit_confirmed = true;
      extraData.deposit_confirmed_at = `${date}T12:00:00-03:00`;
      extraData.deposit_confirmed_value = value;
      extraData.deposit_confirmed_method = method;
    } else {
      extraData.total_value_confirmed = true;
      extraData.total_value_confirmed_at = `${date}T12:00:00-03:00`;
      extraData.total_value_confirmed_value = value;
      extraData.total_value_confirmed_method = method;
      extraData.payment_date = date;
    }
    setPaymentDialog({ open: false, type: null, pendingStage: null, source: null });
    await proceedWithSave(extraData);
  };

  const handlePaymentCancel = () => {
    // Revert stage change
    setEditedProject(prev => ({ ...(prev || project), pipeline_stage: project.pipeline_stage }));
    setPaymentDialog({ open: false, type: null, pendingStage: null, source: null });
  };

  const handleSave = async () => {
    const oldStage = project.pipeline_stage;
    const newStage = editedProject.pipeline_stage;

    if (newStage === 'perdido' && oldStage !== 'perdido') {
      setLostReasonDialog({ open: true, source: 'save' });
      return;
    }

    const confirmType = needsPaymentConfirmation(oldStage, newStage);

    if (confirmType) {
      setPaymentDialog({ open: true, type: confirmType, pendingStage: newStage, source: 'save' });
      return;
    }

    await proceedWithSave();
  };

  const handleLostReasonConfirm = async (lostData) => {
    const source = lostReasonDialog.source;
    setLostReasonDialog({ open: false, source: null });
    if (source === 'quick') {
      await performQuickStageChange('perdido', lostData);
    } else {
      await proceedWithSave(lostData);
    }
  };

  const handleLostReasonCancel = () => {
    if (lostReasonDialog.source === 'quick') {
      setEditedProject(prev => ({ ...(prev || project), pipeline_stage: project.pipeline_stage }));
    }
    setLostReasonDialog({ open: false, source: null });
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const openWhatsApp = () => {
    if (client?.whatsapp) {
      const phone = client.whatsapp.replace(/\D/g, '');
      window.open(`https://wa.me/${phone}`, '_blank');
    }
  };

  if (projectLoading) {
    return (
      <div className="min-h-screen bg-[#18151B] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white/60" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-[#18151B] flex flex-col items-center justify-center">
        <p className="text-white/60 mb-4">Projeto não encontrado</p>
        <Link to={createPageUrl('Clients')}>
          <Button className="bg-[#231F20] text-white hover:bg-[#18151B]">Voltar aos Clientes</Button>
        </Link>
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
                to={project?.client_id ? createPageUrl(`ClientDetails?id=${project.client_id}`) : createPageUrl('Clients')}
                className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/70 transition-all hover:bg-white/10 hover:text-white"
              >
                <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
              </Link>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/50">Projeto</p>
                <h1 className="mt-2 text-3xl sm:text-4xl font-display text-white">{client?.name || 'Cliente'}</h1>
                <p className="mt-2 text-sm text-white/65">Gerencie detalhes, etapa, imagens e histórico do projeto no mesmo padrão visual da operação.</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={isEditing ? handleSave : () => setIsEditing(true)}
              disabled={updateProjectMutation.isPending}
              className={`h-11 rounded-2xl border-white/10 px-4 ${isEditing ? 'bg-[#B89A66] text-white hover:bg-[#A88959]' : 'bg-white/5 text-white hover:bg-white/10 hover:text-white'}`}
            >
              {updateProjectMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isEditing ? (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </>
              ) : (
                <>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Editar
                </>
              )}
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
            <div className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr] lg:items-start">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={`${stageConfig[project.pipeline_stage]?.color || 'bg-slate-100 text-slate-700'} border-0`}>
                    {stageConfig[project.pipeline_stage]?.label || project.pipeline_stage}
                  </Badge>
                  {project.style && (
                    <Badge className="border border-[#E5D6BF] bg-[#F7F0E6] text-[#8F7445]">{project.style}</Badge>
                  )}
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-display text-[#231F20]">{project.description || 'Projeto sem descrição'}</h2>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm text-[#6E6761]">
                    {project.session_date && (
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-[#9C8A6D]" />
                        {format(new Date(project.session_date), "dd/MM/yyyy 'às' HH:mm")}
                      </span>
                    )}
                    {(project.total_value_confirmed_method || project.payment_method) && (
                      <span className="flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4 text-[#9C8A6D]" />
                        {project.total_value_confirmed_method || project.payment_method}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={openWhatsApp}
                    className="h-11 rounded-2xl bg-[#231F20] px-5 text-white hover:bg-[#18151B]"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Chamar no WhatsApp
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="rounded-2xl border border-[#E8DED1] bg-white px-4 py-4 text-center">
                  <p className="text-lg font-semibold text-[#231F20]">{formatCurrency(project.total_value)}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#9C8A6D]">Valor Total</p>
                </div>
                <div className="rounded-2xl border border-[#E8DED1] bg-white px-4 py-4 text-center">
                  <p className="text-lg font-semibold text-[#231F20]">{formatCurrency(project.deposit_value)}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#9C8A6D]">Sinal</p>
                </div>
                <div className="rounded-2xl border border-[#E8DED1] bg-white px-4 py-4 text-center col-span-2">
                  {!isEditing ? (
                    <Select value={project.pipeline_stage} onValueChange={handleStageChange}>
                      <SelectTrigger className="h-11 rounded-2xl border-[#E5DDD2] bg-white text-[#231F20]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(stageConfig).map(([key, config]) => (
                          <SelectItem key={key} value={key}>{config.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-[#231F20]">Edição ativa</p>
                      <p className="mt-1 text-xs text-[#7A736C]">Você pode alterar a etapa dentro da aba Projeto.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.section>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid h-auto w-full grid-cols-4 rounded-[22px] border border-[#E7DED2] bg-[#FCF8F4] p-1">
              <TabsTrigger value="project" className="rounded-[18px] data-[state=active]:bg-white data-[state=active]:text-[#231F20] data-[state=active]:shadow-sm">
                <FileText className="w-4 h-4 mr-2" />
                Projeto
              </TabsTrigger>
              <TabsTrigger value="images" className="rounded-[18px] data-[state=active]:bg-white data-[state=active]:text-[#231F20] data-[state=active]:shadow-sm">
                <ImageIcon className="w-4 h-4 mr-2" />
                Imagens
              </TabsTrigger>
              <TabsTrigger value="health" className="rounded-[18px] data-[state=active]:bg-white data-[state=active]:text-[#231F20] data-[state=active]:shadow-sm">
                <Heart className="w-4 h-4 mr-2" />
                Saúde
              </TabsTrigger>
              <TabsTrigger value="history" className="rounded-[18px] data-[state=active]:bg-white data-[state=active]:text-[#231F20] data-[state=active]:shadow-sm">
                <History className="w-4 h-4 mr-2" />
                Histórico
              </TabsTrigger>
            </TabsList>

            <TabsContent value="project">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                {isEditing && (
                  <div className="rounded-[28px] border border-[#E7DED2] bg-[#FCF8F4] p-5 sm:p-6 shadow-[0_12px_30px_rgba(35,31,32,0.05)]">
                    <h3 className="mb-4 text-base font-display text-[#231F20]">Gerenciar Etapa do Pipeline</h3>
                    <Select
                      value={editedProject?.pipeline_stage || project.pipeline_stage}
                      onValueChange={(value) => setEditedProject({ ...editedProject, pipeline_stage: value })}
                    >
                      <SelectTrigger className="h-11 rounded-2xl border-[#E5DDD2] bg-white text-[#231F20]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(stageConfig).map(([key, config]) => (
                          <SelectItem key={key} value={key}>{config.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-2 text-xs text-[#7A736C]">A mudança de etapa será registrada no histórico ao salvar.</p>
                  </div>
                )}

                <div className="rounded-[28px] border border-[#E7DED2] bg-[#FCF8F4] p-5 sm:p-6 shadow-[0_12px_30px_rgba(35,31,32,0.05)]">
                  <ProjectForm
                    project={editedProject}
                    onChange={setEditedProject}
                    disabled={!isEditing}
                    settings={financialSettings}
                  />
                </div>
                <ProjectFollowUpTimeline
                  tasks={followUpTasks}
                  whatsapp={client?.whatsapp}
                  project={project}
                  settings={followUpSettings[0] || {}}
                />
              </motion.div>
            </TabsContent>

            <TabsContent value="images">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-[28px] border border-[#E7DED2] bg-[#FCF8F4] p-5 sm:p-6 shadow-[0_12px_30px_rgba(35,31,32,0.05)]">
                <ImageGallery
                  images={editedProject?.project_images || project?.project_images}
                  onImagesChange={(newImages) => setEditedProject({ ...editedProject, project_images: newImages })}
                  disabled={!isEditing}
                />
              </motion.div>
            </TabsContent>

            <TabsContent value="health">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-[28px] border border-[#E7DED2] bg-[#FCF8F4] p-5 sm:p-6 shadow-[0_12px_30px_rgba(35,31,32,0.05)]">
                <HealthRecordForm
                  record={editedHealth}
                  onChange={setEditedHealth}
                  disabled={!isEditing}
                />
              </motion.div>
            </TabsContent>

            <TabsContent value="history">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-[28px] border border-[#E7DED2] bg-[#FCF8F4] p-5 sm:p-6 shadow-[0_12px_30px_rgba(35,31,32,0.05)]">
                <h3 className="mb-4 text-base font-display text-[#231F20] flex items-center gap-2">
                  <History className="w-5 h-5 text-[#B08954]" />
                  Histórico de Etapas
                </h3>
                {stageHistory.length === 0 ? (
                  <div className="rounded-2xl border border-[#E8DED1] bg-white py-10 text-center">
                    <History className="w-12 h-12 text-[#C8B8A3] mx-auto mb-3" />
                    <p className="text-[#6E6761]">Nenhum histórico registrado</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stageHistory.map((record) => (
                      <div key={record.id} className="rounded-2xl border border-[#E8DED1] bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-[#231F20]">{stageConfig[record.pipeline_stage]?.label}</p>
                            {record.session_date && (
                              <p className="mt-1 text-xs text-[#7A736C]">Sessão: {format(new Date(record.session_date), "dd/MM/yyyy 'às' HH:mm")}</p>
                            )}
                            {record.pipeline_stage === 'revisao' && project?.revision_datetime && (
                              <p className="mt-0.5 text-xs text-[#9C6DB0]">Revisão: {format(new Date(project.revision_datetime), "dd/MM/yyyy 'às' HH:mm")}</p>
                            )}
                          </div>
                          <p className="text-xs text-[#9C8A6D]">{format(new Date(record.changed_at), "dd/MM/yyyy 'às' HH:mm")}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </TabsContent>
          </Tabs>

          <section className="rounded-[18px] border border-[#F6D9D5] bg-[#FFF9F8] px-3 py-3 sm:px-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFE9E6]">
                  <Trash2 className="h-3.5 w-3.5 text-[#F07C74]" />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-[14px] font-semibold text-[#2B2627]">Zona de Perigo</h3>
                  <p className="truncate text-[12px] text-[#7F7772]">Ao excluir este projeto, ele será removido permanentemente.</p>
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="h-9 rounded-[10px] border-[#F5D4D0] bg-[#FFFDFC] px-3 text-[#F07C74] hover:bg-[#FFF3F1] hover:text-[#EA6E66]">
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir projeto?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. O projeto será permanentemente removido.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteProjectMutation.mutate()}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </section>
        </div>
      </main>

      <FloatingActionButton />
      <BottomNav currentPage="Clients" />
      <PaymentConfirmationDialog
        type={paymentDialog.type}
        project={project}
        open={paymentDialog.open}
        onConfirm={handlePaymentConfirm}
        onCancel={handlePaymentCancel}
      />
      <LostReasonDialog
        open={lostReasonDialog.open}
        onConfirm={handleLostReasonConfirm}
        onCancel={handleLostReasonCancel}
      />
      <Footer />
    </div>
  );
}