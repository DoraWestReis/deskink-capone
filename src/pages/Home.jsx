import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay, isToday, subMonths, subDays, startOfYear, addDays, addMonths, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { nowInSalvador, toSalvadorTime } from '@/components/utils/timezone';
import { motion } from 'framer-motion';
import AssistantGreeting from '@/components/home/AssistantGreeting';
import HomeActionBar from '@/components/home/HomeActionBar';
import CollapsibleSection from '@/components/home/CollapsibleSection';
import PeriodMetricsBar from '@/components/home/PeriodMetricsBar';
import PendingActionsPanel from '@/components/home/PendingActionsPanel';

import BottomNav from '@/components/ui/BottomNav';
import FloatingActionButton from '@/components/ui/FloatingActionButton';
import DateRangeFilter from '@/components/ui/DateRangeFilter';
import AnalysisDetailDialog from '@/components/analyses/AnalysisDetailDialog';
import FollowUpBlock from '@/components/home/FollowUpBlock';
import FollowUpTasks from '@/components/home/FollowUpTasks';
import MonthlyBirthdays from '@/components/home/MonthlyBirthdays';
import Footer from '@/components/ui/Footer';
import PlanAlertBanner from '@/components/home/PlanAlertBanner';
import { Calendar, DollarSign, Heart } from 'lucide-react';
import { getCommissionRate } from '@/components/utils/commissionHelper';
import { getProjectPaymentEntries } from '@/components/utils/paymentMetrics';
import { buildPendingEngine } from '@/components/gamification/pendingEngine';

export default function Home() {
  const [user, setUser] = useState(null);
  const [period, setPeriod] = useState('today');
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: projects = [], isSuccess: projectsReady } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date'),
  });

  const { data: clients = [], isSuccess: clientsReady } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: settings = [], isSuccess: settingsReady } = useQuery({
    queryKey: ['financial-settings'],
    queryFn: () => base44.entities.FinancialSettings.list(),
  });

  const { data: followUpTasks = [], isSuccess: tasksReady } = useQuery({
    queryKey: ['follow-up-tasks'],
    queryFn: () => base44.entities.FollowUpTask.list('-created_date'),
  });

  const { data: referralProgress = { total: 0, current_month: 0 }, isSuccess: referralsReady } = useQuery({
    queryKey: ['referral-progress'],
    queryFn: async () => (await base44.functions.invoke('getMyReferralProgress', {})).data,
  });

  // Map clients to projects for WhatsApp
  const clientsMap = clients.reduce((acc, client) => {
    acc[client.id] = client;
    return acc;
  }, {});

  const projectsWithClientInfo = projects.map(project => ({
    ...project,
    client_whatsapp: clientsMap[project.client_id]?.whatsapp,
    client_registration_date: clientsMap[project.client_id]?.registration_date,
  }));

  const projectWhatsappMap = projectsWithClientInfo.reduce((acc, project) => {
    acc[project.id] = project.client_whatsapp;
    return acc;
  }, {});

  const financialSettings = settings[0] || {
    debit_card_fee: 2.5,
    credit_card_fee: 4.5,
    installment_credit_fee: 6.5,
    pix_cash_fee: 0,
    tattoo_artist_commission: 50,
    monthly_goal: 5000
  };

  const followUpTasksWithClientInfo = followUpTasks.map(task => {
    const normalizedTask = task?.data ? { ...task.data, id: task.data.id || task.id, recordId: task.id } : task;
    const project = projectsWithClientInfo.find((item) => item.id === normalizedTask.project_id);
    return {
      ...normalizedTask,
      project_id: normalizedTask.project_id,
      client_whatsapp: projectWhatsappMap[normalizedTask.project_id],
      project_exists: Boolean(project),
    };
  });

  // Calculate period dates
  const now = nowInSalvador();

  const getPeriodDates = () => {
    switch (period) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'current_month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'current_year':
        return { start: startOfYear(now), end: now };
      case 'all_time':
        return { start: null, end: null };
      case 'custom':
        return { 
          start: customStartDate ? startOfDay(customStartDate) : startOfMonth(now), 
          end: customEndDate ? endOfDay(customEndDate) : endOfMonth(now) 
        };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const handleDateChange = (start, end) => {
    setCustomStartDate(start);
    setCustomEndDate(end);
  };

  const { start: periodStart, end: periodEnd } = getPeriodDates();

  const periodLabel = {
    today: 'dia',
    current_month: 'mês',
    current_year: 'ano',
    all_time: 'período',
    custom: 'período',
  }[period] || 'período';

  const isShortPeriod = period === 'today';

  const getStageBasedFollowUpDate = (project) => {
    if (project.pipeline_stage === 'revisao') {
      if (project.revision_datetime) return new Date(project.revision_datetime);
      if (project.revision_date) return new Date(`${project.revision_date}T12:00:00`);
      if (project.session_date) {
        const date = new Date(project.session_date);
        if (!Number.isNaN(date.getTime())) {
          date.setDate(date.getDate() + 20);
          return date;
        }
      }
    }

    if (project.pipeline_stage === 'pos_venda') {
      if (project.post_sale_contact_date) return new Date(project.post_sale_contact_date);
      const revisionBase = project.revision_datetime
        ? new Date(project.revision_datetime)
        : project.revision_date
          ? new Date(`${project.revision_date}T12:00:00`)
          : project.session_date
            ? new Date(project.session_date)
            : null;

      if (revisionBase && !Number.isNaN(revisionBase.getTime())) {
        if (!project.revision_datetime && !project.revision_date) {
          revisionBase.setDate(revisionBase.getDate() + 20);
        }
        revisionBase.setMonth(revisionBase.getMonth() + 2);
        return revisionBase;
      }
    }

    return null;
  };

  const isProjectInFilter = (project) => {
    const relatedTaskDates = followUpTasksWithClientInfo
      .filter((task) =>
        task.project_id === project.id &&
        task.status === 'pending' &&
        ['followup_orcamento', 'followup_fechamento', 'aguardando_sinal', 'session_reminder', 'pos_venda', 'revisao'].includes(task.follow_up_type)
      )
      .map((task) => {
        const value = task.due_date;
        if (!value) return null;
        return new Date(`${value}T12:00:00`);
      })
      .filter((date) => date && !Number.isNaN(date.getTime()));

    const stageDate = getStageBasedFollowUpDate(project);
    const relevantDates = [...relatedTaskDates, stageDate].filter((date) => date && !Number.isNaN(date.getTime()));

    if (relevantDates.length === 0) {
      return false;
    }

    if (!periodStart && !periodEnd) return true;

    if (period === 'today') {
      return relevantDates.some((date) => date <= periodEnd);
    }

    return relevantDates.some((date) => date >= periodStart && date <= periodEnd);
  };

  const followupOrcamento = projectsWithClientInfo
    .filter((p) => p.pipeline_stage === 'followup_orcamento' && isProjectInFilter(p));

  const followupVendas = projectsWithClientInfo
    .filter((p) => (p.pipeline_stage === 'followup_fechamento' || p.pipeline_stage === 'aguardando_sinal') && isProjectInFilter(p));

  const followupCuidado = projectsWithClientInfo
    .filter((p) => (p.pipeline_stage === 'revisao' || p.pipeline_stage === 'pos_venda') && isProjectInFilter(p));

  const salesReceivableAmount = followupVendas.reduce((sum, project) => {
    const projectValue = Number(project.total_value) || 0;
    const confirmedDeposit = project.deposit_confirmed ? (Number(project.deposit_confirmed_value) || 0) : 0;

    if (project.pipeline_stage === 'aguardando_sinal') {
      const depositValue = Number(project.deposit_value) || 0;
      return sum + Math.max(depositValue - confirmedDeposit, 0);
    }

    return sum + projectValue;
  }, 0);

  // === Revenue logic aligned with Analyses page ===
  const isImportedPosvenda = (project) => {
    const hasAnyConfirmationData = Boolean(
      project.total_value_confirmed ||
      project.total_value_confirmed_at ||
      project.total_value_confirmed_value ||
      project.payment_date ||
      project.deposit_confirmed ||
      project.deposit_confirmed_at
    );
    return !hasAnyConfirmationData && project.pipeline_stage === 'pos_venda';
  };

  const isWithinPeriod = (dateValue) => {
    if (!dateValue) return false;
    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(dateValue) ? `${dateValue}T12:00:00` : dateValue;
    const d = new Date(normalized);
    if (isNaN(d.getTime())) return false;
    if (!periodStart && !periodEnd) return true;
    return d >= periodStart && d <= periodEnd;
  };

  const paymentEntries = projects.flatMap((project) => {
    const entries = getProjectPaymentEntries(project).filter((entry) => (
      !periodStart && !periodEnd ? true : entry.date >= periodStart && entry.date <= periodEnd
    ));

    if (entries.length > 0) {
      return entries.map((entry) => ({ ...entry, project }));
    }

    if (isImportedPosvenda(project) && isWithinPeriod(project.created_date || project.updated_date)) {
      return [{
        type: 'imported_total',
        amount: Number(project.total_value) || 0,
        method: project.total_value_confirmed_method || project.payment_method,
        installments: project.installments,
        date: new Date(project.created_date || project.updated_date),
        project,
      }];
    }

    return [];
  }).filter((entry) => entry.amount > 0);

  const paidProjects = paymentEntries.map((entry, index) => ({
    id: `${entry.project.id}-${entry.type}-${index}`,
    project: entry.project,
    entry,
  }));

  const grossRevenue = paymentEntries.reduce((sum, entry) => sum + entry.amount, 0);

  const myProfit = paymentEntries.reduce((sum, entry) => {
    const rate = getCommissionRate(entry.method, entry.installments, financialSettings);
    return sum + entry.amount * rate;
  }, 0);

  const monthlyGoal = financialSettings.monthly_goal || 5000;
  const selectedPeriodGoal = period === 'current_year' ? monthlyGoal * 12 : monthlyGoal;
  const goalProgress = Math.min((myProfit / selectedPeriodGoal) * 100, 100);

  const revenueDetail = {
    title: 'Detalhamento do faturamento',
    description: 'Veja os clientes e projetos que entraram no cálculo do faturamento do período.',
    sections: [
      {
        title: 'Projetos considerados',
        subtitle: 'Valores confirmados no período.',
        items: paidProjects.map(({ id, project, entry }) => ({
          id,
          primary: project.client_name || 'Cliente sem nome',
          secondary: project.description,
          dateLabel: entry.date?.toISOString?.() || entry.date,
          valueLabel: entry.amount,
          stage: project.pipeline_stage,
          link: `/ProjectDetails?id=${project.id}`,
        })),
      },
    ],
  };

  const profitDetail = {
    title: 'Detalhamento do lucro',
    description: 'Veja os clientes e projetos que entraram no cálculo do lucro do período.',
    sections: [
      {
        title: 'Projetos considerados',
        subtitle: 'Valores confirmados no período com a comissão aplicada.',
        items: paidProjects.map(({ id, project, entry }) => ({
          id,
          primary: project.client_name || 'Cliente sem nome',
          secondary: project.description,
          dateLabel: entry.date?.toISOString?.() || entry.date,
          valueLabel: entry.amount * getCommissionRate(entry.method, entry.installments, financialSettings),
          stage: project.pipeline_stage,
          link: `/ProjectDetails?id=${project.id}`,
        })),
      },
    ],
  };

  const todayAppointmentCount = projectsWithClientInfo.filter((project) => {
    if (!project.session_date) return false;
    const date = toSalvadorTime(new Date(project.session_date));
    return !Number.isNaN(date.getTime()) && isToday(date);
  }).length;
  const pendingEngine = buildPendingEngine(followUpTasksWithClientInfo, projectsWithClientInfo, now);
  const pendingCount = pendingEngine.length;
  const historicalClientLTV = clients.reduce((sum, client) => sum + (Number(client.total_spent_history) || 0), 0);
  const historicalProjectLTV = projects.reduce((sum, project) => sum + ((project.total_value_confirmed || ['pos_venda', 'concluido'].includes(project.pipeline_stage)) ? (Number(project.total_value_confirmed_value) || Number(project.total_value) || 0) : 0), 0);
  const gamificationStats = {
    closedCount: projects.filter((project) => project.closing_date || ['agendado', 'revisao', 'pos_venda', 'concluido'].includes(project.pipeline_stage)).length,
    scheduledCount: projects.filter((project) => project.session_date && new Date(project.session_date) >= startOfDay(now)).length,
    totalLTV: Math.max(historicalClientLTV, historicalProjectLTV),
    completeProfilesCount: clients.filter((client) => client.name && client.whatsapp && client.email && client.birth_date).length,
    referralClosedThisMonth: referralProgress.current_month,
    deskinkReferralsCount: referralProgress.total,
    isAdmin: user?.role === 'admin',
  };
  const gamificationReady = Boolean(user) && projectsReady && clientsReady && settingsReady && tasksReady && referralsReady;

  return (
    <div className="min-h-screen bg-[#18151B] pb-[112px]">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[radial-gradient(circle_at_top_left,_rgba(184,154,102,0.22),_transparent_35%),linear-gradient(135deg,#221D25_0%,#18151B_55%,#131017_100%)] backdrop-blur-xl">
        <div className="container mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-7">
          <div className="flex items-start justify-between gap-3">
            <AssistantGreeting
              name={user?.full_name?.split(' ')[0]}
              appointmentCount={todayAppointmentCount}
              pendingCount={pendingCount}
              goalProgress={goalProgress}
            >
              <DateRangeFilter
                compact
                period={period}
                onPeriodChange={setPeriod}
                startDate={customStartDate}
                endDate={customEndDate}
                onDateChange={handleDateChange}
              />
            </AssistantGreeting>
            <HomeActionBar />
          </div>
        </div>
      </header>

      <main className="relative z-10 -mt-2 min-h-[calc(100vh-140px)] rounded-t-[30px] bg-[#F6F1EC]">
        <div className="container mx-auto max-w-7xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8">
          <CollapsibleSection id="resumo" label={`Resumo do seu ${periodLabel}`}>
            <PeriodMetricsBar profit={myProfit} revenue={grossRevenue} goal={selectedPeriodGoal} progress={goalProgress} onProfitClick={() => setSelectedDetail(profitDetail)} onRevenueClick={() => setSelectedDetail(revenueDetail)} />
          </CollapsibleSection>

          <CollapsibleSection id="atencao" title="Precisa da sua atenção">
            <PendingActionsPanel pendingEngine={pendingEngine} gamificationStats={gamificationStats} gamificationReady={gamificationReady} />
          </CollapsibleSection>

          <CollapsibleSection id="tarefas-agenda" label="Agenda do dia" title="Tarefas e aniversários">
            <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1.4fr_0.9fr]">
              <FollowUpTasks tasks={followUpTasksWithClientInfo} periodStart={period === 'all_time' ? null : periodStart} periodEnd={period === 'all_time' ? null : periodEnd} isShortPeriod={isShortPeriod} />
              <MonthlyBirthdays clients={clients} />
            </div>
          </CollapsibleSection>

          <CollapsibleSection id="follow-ups" label="Acompanhamento" title="Follow-ups">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <FollowUpBlock title="Follow-up Orçamento" description="Reagendar quem faltou" projects={followupOrcamento} followUpTasks={followUpTasksWithClientInfo} icon={Calendar} variant="orcamento" periodStart={periodStart} periodEnd={periodEnd} />
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <FollowUpBlock title="Follow-up Vendas" description="Confirmar o fechamento" projects={followupVendas} followUpTasks={followUpTasksWithClientInfo} icon={DollarSign} amountLabel="À receber" amountValue={salesReceivableAmount} periodStart={periodStart} periodEnd={periodEnd} />
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                <FollowUpBlock title="Revisão e Pós-Venda" description="Garantir satisfação" projects={followupCuidado} followUpTasks={followUpTasksWithClientInfo} icon={Heart} showScheduleDate variant="cuidado" periodStart={periodStart} periodEnd={periodEnd} />
              </motion.div>
            </div>
          </CollapsibleSection>
        </div>
      </main>

      <AnalysisDetailDialog open={Boolean(selectedDetail)} onOpenChange={(open) => !open && setSelectedDetail(null)} detail={selectedDetail} />
      <FloatingActionButton />
      <BottomNav currentPage="Home" />
      <Footer />
    </div>
  );
}