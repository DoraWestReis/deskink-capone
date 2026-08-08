import React, { useState, useRef, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext } from '@hello-pangea/dnd';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { createPageUrl } from '@/utils';
import { addDays, startOfMonth, endOfMonth, startOfDay, endOfDay, startOfYear } from 'date-fns';

import BottomNav from '@/components/ui/BottomNav';
import FloatingActionButton from '@/components/ui/FloatingActionButton';
import PipelineColumn from '@/components/pipeline/PipelineColumn';
import PipelineScrollArea from '@/components/pipeline/PipelineScrollArea';
import PaymentConfirmationDialog from '@/components/pipeline/PaymentConfirmationDialog';
import StageDateDialog, { getStageDateConfig } from '@/components/pipeline/StageDateDialog';
import LostReasonDialog from '@/components/pipeline/LostReasonDialog';
import DateRangeFilter from '@/components/ui/DateRangeFilter';
import Footer from '@/components/ui/Footer';
import { getProjectPriorityDate, sortByClosestDate } from '@/components/utils/datePriority';

const pipelineStages = [
  'novo_contato',
  'agendado_orcamento_presencial',
  'followup_fechamento',
  'perdido',
  'followup_orcamento',
  'aguardando_sinal',
  'agendado',
  'revisao',
  'pos_venda',
  'concluido'
];

export default function Pipeline() {
  const [searchQuery, setSearchQuery] = useState('');
  const [period, setPeriod] = useState('all_time');
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);
  const [paymentDialog, setPaymentDialog] = useState({ open: false, type: null, projectId: null, newStage: null, oldStage: null });
  const [stageDateDialog, setStageDateDialog] = useState({ open: false, stage: null, projectId: null, newStage: null, oldStage: null });
  const [lostReasonDialog, setLostReasonDialog] = useState({ open: false, projectId: null });
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date'),
  });

  const updateProjectMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Project.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['projects'] });
      const previousProjects = queryClient.getQueryData(['projects']);
      
      queryClient.setQueryData(['projects'], (old) =>
        old.map((p) => (p.id === id ? { ...p, ...data } : p))
      );
      
      return { previousProjects };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['projects'], context.previousProjects);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const needsPaymentConfirmation = (oldStage, newStage) => {
    if (oldStage === 'aguardando_sinal' && newStage === 'agendado') return 'deposit';
    if (oldStage === 'agendado' && newStage === 'revisao') return 'total_value';
    return null;
  };

  const performStageChange = async (projectId, newStage, extraData = {}) => {
    const project = projects.find(p => p.id === projectId);
    const now = new Date().toISOString();

    await base44.entities.ProjectStageHistory.create({
      project_id: projectId,
      pipeline_stage: newStage,
      session_date: extraData.session_date || project?.session_date || null,
      changed_at: now
    });

    // Auto-set closing_date when moving to followup_fechamento
    if (newStage === 'followup_fechamento' && !extraData.closing_date) {
      const todayParts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
      }).formatToParts(new Date());
      const todayMap = Object.fromEntries(todayParts.map((p) => [p.type, p.value]));
      extraData.closing_date = `${todayMap.year}-${todayMap.month}-${todayMap.day}`;
    }

    // Calculate revision_date if tattoo_date is provided and moving to revisao
    if (newStage === 'revisao' && extraData.tattoo_date && !extraData.revision_date) {
      const tattooDate = new Date(`${extraData.tattoo_date}T12:00:00-03:00`);
      tattooDate.setDate(tattooDate.getDate() + 20);
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
      }).formatToParts(tattooDate);
      const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
      extraData.revision_date = `${map.year}-${map.month}-${map.day}`;
    }

    await updateProjectMutation.mutateAsync({
      id: projectId,
      data: {
        pipeline_stage: newStage,
        stage_updated_at: now,
        ...extraData
      }
    });

    queryClient.invalidateQueries({ queryKey: ['projects'] });
    queryClient.invalidateQueries({ queryKey: ['follow-up-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['project-follow-up-tasks', projectId] });
    queryClient.invalidateQueries({ queryKey: ['stage-history', projectId] });

    // Sync with Google Calendar for scheduled stages
    const isScheduledStage = newStage === 'agendado' || newStage === 'agendado_orcamento_presencial';
    const sessionDate = extraData.session_date || project?.session_date;
    if (isScheduledStage && sessionDate) {
      try {
        await base44.functions.invoke('syncCalendar', {
          action: project?.calendar_event_id ? 'update' : 'create',
          projectId: projectId
        });
      } catch (error) {
        console.error('Calendar sync failed:', error);
      }
    }

    // Schedule follow-up events for revisao and pos_venda
    if (newStage === 'revisao' || newStage === 'pos_venda') {
      try {
        await base44.functions.invoke('scheduleFollowUpEvent', {
          projectId: projectId,
          eventType: newStage
        });
      } catch (error) {
        console.error('Follow-up event scheduling failed:', error);
      }
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    
    const { draggableId, destination } = result;
    const newStage = destination.droppableId;
    const project = projects.find(p => p.id === draggableId);
    const oldStage = project?.pipeline_stage;

    if (oldStage === newStage) return;

    // Moving to "perdido" requires a loss reason
    if (newStage === 'perdido') {
      setLostReasonDialog({ open: true, projectId: draggableId });
      return;
    }

    // Check if payment confirmation is needed
    const confirmType = needsPaymentConfirmation(oldStage, newStage);
    if (confirmType) {
      // For aguardando_sinal -> agendado: need payment + session date
      // For agendado -> revisao: need payment + tattoo date
      setPaymentDialog({ open: true, type: confirmType, projectId: draggableId, newStage, oldStage });
      return;
    }

    // Check if this stage requires date input
    const dateConfig = getStageDateConfig(newStage);
    if (dateConfig) {
      setStageDateDialog({ open: true, stage: newStage, projectId: draggableId, newStage, oldStage });
      return;
    }
    
    await performStageChange(draggableId, newStage);
  };

  const handlePaymentConfirm = async ({ value, method, date }) => {
    const { type, projectId, newStage } = paymentDialog;
    const confirmedAt = `${date}T12:00:00-03:00`;
    const project = projects.find(p => p.id === projectId);

    let extraData = {};
    if (type === 'deposit') {
      extraData = {
        deposit_confirmed: true,
        deposit_confirmed_at: confirmedAt,
        deposit_confirmed_value: value,
        deposit_confirmed_method: method,
      };
    } else {
      extraData = {
        total_value_confirmed: true,
        total_value_confirmed_at: confirmedAt,
        total_value_confirmed_value: value,
        total_value_confirmed_method: method,
        payment_date: date,
      };
    }

    setPaymentDialog({ open: false, type: null, projectId: null, newStage: null, oldStage: null });

    // After payment, also check if the new stage needs a date
    const dateConfig = getStageDateConfig(newStage);
    if (dateConfig) {
      // Store payment data and open date dialog
      setStageDateDialog({ open: true, stage: newStage, projectId, newStage, oldStage: paymentDialog.oldStage, pendingExtraData: extraData });
    } else {
      await performStageChange(projectId, newStage, extraData);
    }
  };

  const handlePaymentCancel = () => {
    setPaymentDialog({ open: false, type: null, projectId: null, newStage: null, oldStage: null });
  };

  const handleStageDateConfirm = async (dateData) => {
    const { projectId, newStage, pendingExtraData } = stageDateDialog;
    setStageDateDialog({ open: false, stage: null, projectId: null, newStage: null, oldStage: null });
    // Merge any pending payment data with date data
    const allExtraData = { ...(pendingExtraData || {}), ...dateData };
    await performStageChange(projectId, newStage, allExtraData);
  };

  const handleStageDateCancel = () => {
    setStageDateDialog({ open: false, stage: null, projectId: null, newStage: null, oldStage: null });
  };

  const handleLostReasonConfirm = async (lostData) => {
    const { projectId } = lostReasonDialog;
    setLostReasonDialog({ open: false, projectId: null });
    await performStageChange(projectId, 'perdido', lostData);
  };

  const handleLostReasonCancel = () => {
    setLostReasonDialog({ open: false, projectId: null });
  };

  // Period filter logic
  const now = new Date();
  const getPeriodDates = () => {
    switch (period) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'current_month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'current_year':
        return { start: startOfYear(now), end: now };
      case 'custom':
        return { 
          start: customStartDate ? startOfDay(customStartDate) : null, 
          end: customEndDate ? endOfDay(customEndDate) : null 
        };
      case 'all_time':
      default:
        return { start: null, end: null };
    }
  };

  const { start: periodStart, end: periodEnd } = getPeriodDates();

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    // If no period filter, show all
    if (!periodStart || !periodEnd) return true;

    // Prioridade: session_date (demanda agendada) > stage_updated_at > created_date
    const dateRef = p.session_date || p.stage_updated_at || p.created_date;
    if (!dateRef) return true;
    const refDate = new Date(dateRef);
    return refDate >= periodStart && refDate <= periodEnd;
  });

  const getRevisionVisibilityDate = (project) => {
    if (project.revision_datetime) return new Date(project.revision_datetime);
    if (project.revision_date) return new Date(`${project.revision_date}T12:00:00`);

    const baseDate = project.tattoo_date
      ? new Date(`${project.tattoo_date}T12:00:00`)
      : project.session_date
        ? new Date(project.session_date)
        : null;

    if (!baseDate) return null;

    const revisionWindowDate = new Date(baseDate);
    revisionWindowDate.setDate(revisionWindowDate.getDate() + 20);
    return revisionWindowDate;
  };

  const getProjectsByStage = (stage) => {
    const stageProjects = filteredProjects.filter((project) => {
      if (project.pipeline_stage !== stage) return false;
      if (stage !== 'revisao') return true;

      const visibilityDate = getRevisionVisibilityDate(project);
      if (!visibilityDate) return false;

      if (periodStart && periodEnd) {
        return visibilityDate >= periodStart && visibilityDate <= periodEnd;
      }

      return true;
    });

    return sortByClosestDate(stageProjects, getProjectPriorityDate);
  };

  const handleCardClick = (project) => {
    window.location.href = createPageUrl(`ProjectDetails?id=${project.id}`);
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-[#18151B] pb-[120px]">
      <header className="sticky top-0 z-30 flex-shrink-0 border-b border-white/5 bg-[radial-gradient(circle_at_top_left,_rgba(184,154,102,0.22),_transparent_35%),linear-gradient(135deg,#221D25_0%,#18151B_55%,#131017_100%)] backdrop-blur-xl">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-5 sm:py-7">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/50">Pipeline comercial</p>
              <h1 className="mt-2 text-3xl sm:text-4xl font-display text-white">Jornada do Cliente</h1>
              <p className="mt-2 text-sm text-white/65">{projects.length} projetos para acompanhar e mover com mais clareza.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/45" strokeWidth={1.5} />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar cliente ou projeto..."
                className="h-11 rounded-2xl border border-white/10 bg-white/5 pl-10 text-white placeholder:text-white/45"
              />
            </div>

            <DateRangeFilter
              period={period}
              onPeriodChange={setPeriod}
              startDate={customStartDate}
              endDate={customEndDate}
              onDateChange={(start, end) => { setCustomStartDate(start); setCustomEndDate(end); }}
            />
          </div>
        </div>
      </header>

      <main className="relative z-10 -mt-2 flex-1 min-h-0 rounded-t-[30px] bg-[#F6F1EC]">
        <div className="container mx-auto flex h-full min-h-0 max-w-7xl px-0 sm:px-2">
          <PipelineScrollArea onDragEnd={handleDragEnd}>
            {pipelineStages.map((stage) => (
              <PipelineColumn
                key={stage}
                stage={stage}
                projects={getProjectsByStage(stage)}
                onCardClick={handleCardClick}
              />
            ))}
          </PipelineScrollArea>
        </div>
      </main>

      <PaymentConfirmationDialog
        type={paymentDialog.type}
        project={projects.find(p => p.id === paymentDialog.projectId)}
        open={paymentDialog.open}
        onConfirm={handlePaymentConfirm}
        onCancel={handlePaymentCancel}
      />

      <StageDateDialog
        open={stageDateDialog.open}
        stage={stageDateDialog.stage}
        project={projects.find(p => p.id === stageDateDialog.projectId)}
        onConfirm={handleStageDateConfirm}
        onCancel={handleStageDateCancel}
      />

      <LostReasonDialog
        open={lostReasonDialog.open}
        onConfirm={handleLostReasonConfirm}
        onCancel={handleLostReasonCancel}
      />

      <FloatingActionButton />
      <BottomNav currentPage="Pipeline" />
      <Footer />
    </div>
  );
}