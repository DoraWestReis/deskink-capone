import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { startOfMonth, endOfMonth, startOfYear, startOfDay, endOfDay } from 'date-fns';
import { nowInSalvador } from '@/components/utils/timezone';
import { motion } from 'framer-motion';
import { TrendingUp, Users, Target, DollarSign, Palette, Crown, MapPin } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import ClientLTVRanking from '@/components/analyses/ClientLTVRanking';
import AIAnalysisPanel from '@/components/analyses/AIAnalysisPanel';
import AnalysisDetailDialog from '@/components/analyses/AnalysisDetailDialog';
import LossReasonsPanel from '@/components/analyses/LossReasonsPanel';
import InsightRankingPanel from '@/components/analyses/InsightRankingPanel';

import BottomNav from '@/components/ui/BottomNav';
import DateRangeFilter from '@/components/ui/DateRangeFilter';
import Footer from '@/components/ui/Footer';
import { getProjectPaymentEntries } from '@/components/utils/paymentMetrics';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);
};

export default function Analyses() {
  const [period, setPeriod] = useState('current_month');
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date'),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date'),
  });

  const getPeriodDates = () => {
    const now = nowInSalvador();
    switch (period) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'current_month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'current_year':
        return { start: startOfYear(now), end: now };
      case 'all_time':
        return { start: new Date(2020, 0, 1), end: now };
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

  const parseMetricDate = (dateValue) => {
    if (!dateValue) return null;

    const normalizedValue = /^\d{4}-\d{2}-\d{2}$/.test(dateValue)
      ? `${dateValue}T12:00:00`
      : dateValue;

    const checkDate = new Date(normalizedValue);
    return Number.isNaN(checkDate.getTime()) ? null : checkDate;
  };

  const isWithinPeriod = (dateValue) => {
    const checkDate = parseMetricDate(dateValue);
    return checkDate ? checkDate >= periodStart && checkDate <= periodEnd : false;
  };

  const filteredClients = period === 'all_time'
    ? clients
    : clients.filter((client) => isWithinPeriod(client.created_date));

  const projectsInPeriod = period === 'all_time'
    ? projects
    : projects.filter((project) => isWithinPeriod(project.created_date));

  const visits = projects.filter((project) => isWithinPeriod(project.evaluation_date));

  const closedTattoos = projects.filter((project) => {
    if (!project.closing_date) return false;
    return isWithinPeriod(project.closing_date);
  });

  const conversionRate = visits.length > 0 ? ((closedTattoos.length / visits.length) * 100).toFixed(1) : 0;

  const clientsByOrigin = filteredClients.reduce((acc, client) => {
    const origin = client.lead_origin || 'Não definido';
    acc[origin] = (acc[origin] || 0) + 1;
    return acc;
  }, {});

  // Helper: best available value
  const getProjectValue = (project) => {
    if (project.total_value_confirmed_value) return Number(project.total_value_confirmed_value) || 0;
    if (project.deposit_confirmed && project.deposit_confirmed_value) return Number(project.deposit_confirmed_value) || 0;
    return Number(project.total_value) || 0;
  };

  const doneStages = ['agendado', 'revisao', 'pos_venda'];

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

  const completedTattoos = projects.filter((project) => {
    const value = getProjectValue(project);
    if (value <= 0) return false;

    let dateRef = project.tattoo_date || (doneStages.includes(project.pipeline_stage) ? project.session_date : null);

    if (!dateRef && isImportedPosvenda(project)) {
      dateRef = project.created_date || project.updated_date;
    }

    if (!dateRef) return false;
    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(dateRef) ? `${dateRef}T12:00:00` : dateRef;
    const d = new Date(normalized);
    return !isNaN(d.getTime()) && d >= periodStart && d <= periodEnd;
  });

  const paymentEntries = projects.flatMap((project) => {
    const entries = getProjectPaymentEntries(project).filter((entry) => entry.date >= periodStart && entry.date <= periodEnd);

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

  const totalRevenue = paymentEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const averageTicket = completedTattoos.length > 0
    ? completedTattoos.reduce((sum, project) => sum + getProjectValue(project), 0) / completedTattoos.length
    : 0;

  const styleStats = completedTattoos.reduce((acc, project) => {
    const style = project.style || 'Não definido';
    if (!acc[style]) {
      acc[style] = { count: 0, revenue: 0 };
    }
    acc[style].count += 1;
    acc[style].revenue += getProjectValue(project);
    return acc;
  }, {});

  const topStyles = Object.entries(styleStats)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);

  const mostProfitableStyles = Object.entries(styleStats)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 2);

  const topOrigins = Object.entries(clientsByOrigin)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const lostProjects = projects.filter((project) => {
    if (project.pipeline_stage !== 'perdido') return false;
    return isWithinPeriod(project.lost_at || project.stage_updated_at);
  });

  const lostByReason = lostProjects.reduce((acc, project) => {
    const reason = project.lost_reason || 'Não informado';
    acc[reason] = (acc[reason] || 0) + 1;
    return acc;
  }, {});

  const lossDetail = {
    title: 'Detalhamento dos motivos de perda',
    description: 'Veja os projetos marcados como perdidos no período e o motivo registrado.',
    sections: [
      {
        title: 'Projetos perdidos',
        subtitle: 'Projetos com etapa "Perdido" dentro do filtro selecionado.',
        items: lostProjects.map((project) => ({
          id: project.id,
          primary: project.client_name || 'Cliente sem nome',
          secondary: [project.description, project.lost_reason].filter(Boolean).join(' • ') || 'Sem motivo informado',
          dateLabel: project.lost_at || project.stage_updated_at,
          stage: project.pipeline_stage,
          link: `/ProjectDetails?id=${project.id}`,
        })),
      },
    ],
  };

  const undefinedOriginCount = filteredClients.filter((client) => !client.lead_origin).length;
  const bestStyle = topStyles[0];
  const bestOrigin = topOrigins[0];
  const rateValue = parseFloat(conversionRate);
  const periodText = {
    today: { heading: 'do seu dia', section: 'do dia', in: 'no dia' },
    current_month: { heading: 'do seu mês', section: 'do mês', in: 'no mês' },
    current_year: { heading: 'do seu ano', section: 'do ano', in: 'no ano' },
    all_time: { heading: 'de todo o período', section: 'do período', in: 'no período' },
    custom: { heading: 'do seu período', section: 'do período', in: 'no período' },
  }[period] || { heading: 'do seu período', section: 'do período', in: 'no período' };

  const conversionLabel = rateValue >= 50 ? 'Excelente resultado.' : rateValue >= 30 ? 'Bom resultado.' : 'Ponto de atenção.';

  const analysisInput = {
    periodo: period,
    recorte_texto: periodText.section,
    intervalo: {
      inicio: periodStart.toISOString(),
      fim: periodEnd.toISOString(),
    },
    funil: {
      clientes_no_periodo: filteredClients.length,
      projetos_no_periodo: projectsInPeriod.length,
      orcamentos_em_andamento_ou_negociacao: visits.length,
      tatuagens_fechadas: closedTattoos.length,
      taxa_de_conversao: rateValue,
      clientes_sem_origem_definida: undefinedOriginCount,
    },
    financeiro: {
      faturamento: totalRevenue,
      ticket_medio: averageTicket,
      tatuagens_concluidas: completedTattoos.length,
    },
    origens: topOrigins.map(([origem, quantidade]) => ({ origem, quantidade })),
    estilos_mais_vendidos: topStyles.map(([estilo, stats]) => ({
      estilo,
      quantidade: stats.count,
      faturamento: stats.revenue,
    })),
    estilos_mais_lucrativos: mostProfitableStyles.map(([estilo, stats]) => ({
      estilo,
      quantidade: stats.count,
      faturamento: stats.revenue,
    })),
  };

  const diagnosticCards = useMemo(() => [
    {
      title: 'Conversão',
      value: `${conversionRate}%`,
      description: `${conversionLabel} ${closedTattoos.length} fechamentos para ${visits.length} orçamentos ${periodText.in}.`,
      tooltip: 'Mostra quantos orçamentos viraram tatuagens fechadas no período.',
      icon: <TrendingUp className="h-4 w-4 text-emerald-600" strokeWidth={1.8} />,
      iconBg: 'bg-emerald-50',
      detail: {
        title: 'Detalhamento da conversão',
        description: 'Veja os projetos que tiveram orçamento no período e quais deles fecharam.',
        sections: [
          {
            title: 'Orçamentos no período',
            subtitle: 'Projetos com data de avaliação dentro do filtro selecionado.',
            items: visits.map((project) => ({
              id: project.id,
              primary: project.client_name || 'Cliente sem nome',
              secondary: project.description,
              dateLabel: project.evaluation_date,
              stage: project.pipeline_stage,
              link: `/ProjectDetails?id=${project.id}`,
            })),
          },
          {
            title: 'Fecharam no período',
            subtitle: 'Projetos com data de fechamento dentro do filtro selecionado.',
            items: closedTattoos.map((project) => ({
              id: project.id,
              primary: project.client_name || 'Cliente sem nome',
              secondary: project.description,
              dateLabel: project.closing_date,
              valueLabel: getProjectValue(project),
              stage: project.pipeline_stage,
              link: `/ProjectDetails?id=${project.id}`,
            })),
          },
        ],
      },
    },
    {
      title: 'Ticket Médio',
      value: formatCurrency(averageTicket),
      description: completedTattoos.length === 0
        ? `Nenhuma tatuagem concluída ${periodText.in}.`
        : `${completedTattoos.length} ${completedTattoos.length === 1 ? 'tatuagem concluída' : 'tatuagens concluídas'} ${periodText.in}.`,
      tooltip: 'É o valor médio que cada tatuagem concluída trouxe no período.',
      icon: <Target className="h-4 w-4 text-[#B08954]" strokeWidth={1.8} />,
      iconBg: 'bg-[#F3E8D6]',
      detail: {
        title: 'Detalhamento do ticket médio',
        description: 'Lista das tatuagens concluídas consideradas no cálculo do ticket médio.',
        sections: [
          {
            title: 'Tatuagens consideradas',
            subtitle: 'Projetos concluídos com valor dentro do período selecionado.',
            items: completedTattoos.map((project) => ({
              id: project.id,
              primary: project.client_name || 'Cliente sem nome',
              secondary: project.description,
              dateLabel: project.tattoo_date || project.session_date,
              valueLabel: getProjectValue(project),
              stage: project.pipeline_stage,
              link: `/ProjectDetails?id=${project.id}`,
            })),
          },
        ],
      },
    },
    {
      title: 'Faturamento',
      value: formatCurrency(totalRevenue),
      description: `Projetos concluídos e pagos ${periodText.in}.`,
      tooltip: 'É a soma dos valores pagos e confirmados no período.',
      icon: <DollarSign className="h-4 w-4 text-sky-600" strokeWidth={1.8} />,
      iconBg: 'bg-sky-50',
      detail: {
        title: 'Detalhamento do faturamento',
        description: 'Veja os projetos e valores que entraram no faturamento do período.',
        sections: [
          {
            title: 'Tattoos e pagamentos considerados',
            subtitle: 'Inclui sinais e valores totais pagos no período.',
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
      },
    },
    {
      title: 'Orçamentos Realizados',
      value: String(visits.length),
      description: `Avaliações realizadas ${periodText.in}.`,
      tooltip: 'Conta quantos atendimentos de avaliação aconteceram no período.',
      icon: <Users className="h-4 w-4 text-violet-600" strokeWidth={1.8} />,
      iconBg: 'bg-violet-50',
      detail: {
        title: 'Detalhamento dos orçamentos realizados',
        description: 'Lista dos projetos com avaliação registrada no período.',
        sections: [
          {
            title: 'Avaliações do período',
            subtitle: 'Projetos com data de avaliação dentro do filtro selecionado.',
            items: visits.map((project) => ({
              id: project.id,
              primary: project.client_name || 'Cliente sem nome',
              secondary: project.description,
              dateLabel: project.evaluation_date,
              stage: project.pipeline_stage,
              link: `/ProjectDetails?id=${project.id}`,
            })),
          },
        ],
      },
    },
  ], [averageTicket, closedTattoos, completedTattoos, conversionLabel, conversionRate, paidProjects, periodText.in, visits]);

  return (
    <div className="min-h-screen bg-[#18151B] pb-[112px]">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[radial-gradient(circle_at_top_left,_rgba(184,154,102,0.22),_transparent_35%),linear-gradient(135deg,#221D25_0%,#18151B_55%,#131017_100%)] backdrop-blur-xl">
        <div className="container mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-7">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/50">Indicadores do negócio</p>
          <h1 className="mt-2 text-3xl font-display text-white sm:text-4xl">Análises</h1>
          <p className="mt-2 text-sm text-white/65">Uma visão clara do que está funcionando e do que merece atenção.</p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:max-w-xs">
              <DateRangeFilter period={period} onPeriodChange={setPeriod} startDate={customStartDate} endDate={customEndDate} onDateChange={handleDateChange} />
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 -mt-2 min-h-[calc(100vh-140px)] rounded-t-[30px] bg-[#F6F1EC]">
        <div className="container mx-auto max-w-7xl space-y-8 px-4 py-6 sm:space-y-10 sm:px-6 sm:py-8">
          <section className="space-y-3">
            <div className="flex flex-wrap items-baseline gap-x-2 text-[#9C8A6D]">
              <h2 className="text-sm font-display sm:text-base">Diagnóstico</h2>
              <span className="text-[10px] uppercase tracking-[0.16em]">— Leitura rápida {periodText.section}</span>
            </div>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
              <TooltipProvider delayDuration={120}>
                <div className="grid grid-cols-2 gap-2.5 lg:col-span-8">
                  {diagnosticCards.map((card, index) => (
                    <motion.button type="button" key={card.title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} onClick={() => setSelectedDetail(card.detail)} className="rounded-[16px] border border-[#E7DED2] bg-[#FCF8F4] p-3 text-left shadow-[0_8px_24px_rgba(35,31,32,0.05)] transition hover:-translate-y-0.5">
                      <div className="flex items-center gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild><div className={`flex h-7 w-7 shrink-0 cursor-help items-center justify-center rounded-xl ${card.iconBg}`}>{card.icon}</div></TooltipTrigger>
                          <TooltipContent className="max-w-[220px] rounded-xl bg-[#231F20] px-3 py-2 text-[11px] leading-relaxed text-white">{card.tooltip}</TooltipContent>
                        </Tooltip>
                        <h3 className="truncate text-[11px] font-semibold text-[#231F20] sm:text-xs">{card.title}</h3>
                      </div>
                      <p className="mt-2 text-lg font-semibold leading-none text-[#231F20] sm:text-xl">{card.value}</p>
                      <p className="mt-1.5 line-clamp-2 text-[9.5px] leading-relaxed text-[#6E6761] sm:text-[10px]">{card.description}</p>
                    </motion.button>
                  ))}
                </div>
              </TooltipProvider>
              <div className="lg:col-span-4"><LossReasonsPanel lostProjects={lostProjects} lostByReason={lostByReason} periodIn={periodText.in} onOpenDetail={() => setSelectedDetail(lossDetail)} /></div>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-baseline gap-x-2 text-[#9C8A6D]">
              <h2 className="text-sm font-display sm:text-base">Análise por IA</h2>
              <span className="text-[10px] uppercase tracking-[0.16em]">— Inteligência do negócio</span>
            </div>
            <AIAnalysisPanel analysisInput={analysisInput} periodText={periodText} />
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-baseline gap-x-2 text-[#9C8A6D]">
              <h2 className="text-sm font-display sm:text-base">Insights</h2>
              <span className="text-[10px] uppercase tracking-[0.16em]">— Origens, estilos e clientes</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <InsightRankingPanel icon={MapPin} title="Origens dos leads" subtitle={`De onde vieram os clientes ${periodText.in}`} items={topOrigins.map(([origin, count]) => ({ label: origin, value: `${count} leads`, progress: count }))} barClass="bg-violet-400" />
              <InsightRankingPanel icon={Palette} title="Estilos mais vendidos" subtitle={`Por volume de tatuagens ${periodText.in}`} items={topStyles.map(([style, stats]) => ({ label: style, value: `${stats.count} tattoos`, progress: stats.count }))} barClass="bg-[#C9A96E]" delay={0.05} />
              <InsightRankingPanel icon={DollarSign} title="Estilos mais lucrativos" subtitle={`Por faturamento ${periodText.in}`} items={mostProfitableStyles.map(([style, stats]) => ({ label: style, value: formatCurrency(stats.revenue), progress: stats.revenue, meta: `${stats.count} ${stats.count === 1 ? 'tatuagem' : 'tatuagens'}` }))} barClass="bg-sky-400" delay={0.1} />
              <ClientLTVRanking projects={paidProjects.map(({ project }) => project)} clients={clients} subtitle={`Quem mais gerou faturamento ${periodText.in}`} periodLabel={periodText.in} />
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-baseline gap-x-2 text-[#9C8A6D]">
              <h2 className="text-sm font-display sm:text-base">Resumo consolidado</h2>
              <span className="text-[10px] uppercase tracking-[0.16em]">— Destaques do período</span>
            </div>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-[28px] border border-[#2C2530] bg-[radial-gradient(circle_at_top_left,rgba(184,154,102,0.18),transparent_30%),linear-gradient(135deg,#2C2530_0%,#1B171F_100%)] p-4 shadow-[0_10px_24px_rgba(12,10,14,0.2)] sm:p-5">
              <div className="mb-4 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-white/10"><Crown className="h-3.5 w-3.5 text-[#E7C990]" strokeWidth={1.8} /></div>
                <div><h3 className="text-[13px] font-display text-white">Resumo do período</h3><p className="text-[10.5px] text-white/60">Uma visão consolidada dos destaques</p></div>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div><p className="text-[10px] text-white/55">Clientes</p><p className="mt-1 text-xl font-semibold text-white">{filteredClients.length}</p></div>
                <div><p className="text-[10px] text-white/55">Projetos</p><p className="mt-1 text-xl font-semibold text-white">{projectsInPeriod.length}</p></div>
                <div><p className="text-[10px] text-white/55">Origem forte</p><p className="mt-1 truncate text-sm font-semibold text-white">{bestOrigin?.[0] || 'Sem dados'}</p></div>
                <div><p className="text-[10px] text-white/55">Estilo destaque</p><p className="mt-1 truncate text-sm font-semibold text-white">{bestStyle?.[0] || 'Sem dados'}</p></div>
              </div>
            </motion.div>
          </section>
        </div>
      </main>

      <AnalysisDetailDialog open={Boolean(selectedDetail)} onOpenChange={(open) => !open && setSelectedDetail(null)} detail={selectedDetail} />
      <BottomNav currentPage="Analyses" />
      <Footer />
    </div>
  );
}