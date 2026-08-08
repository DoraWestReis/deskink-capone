import React from 'react';
import { formatDistanceToNowStrict, parseISO, format, differenceInHours } from 'date-fns';
import { nowInSalvador } from '@/components/utils/timezone';
import { ptBR } from 'date-fns/locale';
import { MessageCircle, Calendar, Clock } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getFollowUpAction, getFollowUpStatus } from '@/components/home/followUpActionHelper';
import { addDays } from 'date-fns';
import { getFollowUpTaskPriorityDate, getProjectPriorityDate, getProjectDisplayDate, sortByClosestDate } from '@/components/utils/datePriority';
import { getProjectFollowUpState } from '@/components/project/projectFollowUpState';
import FollowUpTaskStatusActions from '@/components/followups/FollowUpTaskStatusActions';

export default function FollowUpBlock({ title, description, projects, followUpTasks = [], icon: Icon, showScheduleDate = false, variant = "vendas", amountLabel = null, amountValue = null, periodStart = null, periodEnd = null }) {
  const openWhatsApp = (clientWhatsapp) => {
    if (clientWhatsapp) {
      const phone = clientWhatsapp.replace(/\D/g, '');
      window.open(`https://wa.me/${phone}`, '_blank');
    }
  };

  const getProjectStageReferenceDate = (project) => {
    return (
      project.stage_updated_at ||
      (project.pipeline_stage === 'followup_orcamento' ? project.evaluation_date : null) ||
      (project.pipeline_stage === 'followup_fechamento' ? project.closing_date : null) ||
      (project.pipeline_stage === 'aguardando_sinal' ? project.closing_date : null) ||
      (project.pipeline_stage === 'agendado' ? project.session_date : null) ||
      (project.pipeline_stage === 'revisao' ? (project.revision_datetime || project.revision_date || project.tattoo_date || project.session_date) : null) ||
      (project.pipeline_stage === 'pos_venda' ? project.post_sale_contact_date : null) ||
      project.created_date
    );
  };

  const getStageInfo = (project) => {
    const referenceDate = getProjectStageReferenceDate(project);
    if (!referenceDate) return { label: 'tempo indefinido', entryDate: null, hoursInStage: 0 };
    const updatedDate = parseISO(referenceDate);
    const hoursInStage = differenceInHours(nowInSalvador(), updatedDate);
    const label = formatDistanceToNowStrict(updatedDate, { addSuffix: false, locale: ptBR });
    const entryDate = format(updatedDate, "dd/MM/yyyy", { locale: ptBR });
    return { label, entryDate, hoursInStage };
  };

  const getScheduleDate = (project, task) => {
    const taskDueDateValue = task?.due_date || task?.data?.due_date;
    if (taskDueDateValue) {
      return `${format(parseISO(`${taskDueDateValue}T12:00:00`), 'dd/MM/yyyy', { locale: ptBR })} às 09:00`;
    }
    return null;
  };

  const getChecklistExpectedDate = (project) => {
    if (!project) return null;

    let dateValue = null;

    if (project.pipeline_stage === 'followup_orcamento' || project.pipeline_stage === 'followup_fechamento') {
      const referenceDate = project.stage_updated_at || project.created_date;
      dateValue = referenceDate ? addDays(new Date(referenceDate), 2) : null;
    } else if (project.pipeline_stage === 'aguardando_sinal') {
      const referenceDate = project.stage_updated_at || project.created_date;
      dateValue = referenceDate ? addDays(new Date(referenceDate), 3) : null;
    } else {
      dateValue = getProjectDisplayDate(project) || getProjectPriorityDate(project);
    }

    if (!dateValue) return null;
    return format(dateValue, 'dd/MM/yyyy', { locale: ptBR });
  };

  const getStageLabel = (stage) => {
    if (stage === 'revisao') return 'Revisão';
    if (stage === 'pos_venda') return 'Pós-Venda';
    if (stage === 'followup_fechamento') return 'Fechamento';
    if (stage === 'aguardando_sinal') return 'Aguardando sinal';
    if (stage === 'followup_orcamento') return 'Orçamento';
    return null;
  };

  const isWithinPeriod = (date) => {
    if (!date) return false;
    const isTodayFilter = periodStart && periodEnd && periodEnd.getTime() - periodStart.getTime() <= 24 * 60 * 60 * 1000;
    if (periodEnd && date > periodEnd) return false;
    if (!isTodayFilter && periodStart && date < periodStart) return false;
    return true;
  };

  const stageBadgeColors = {
    revisao: 'bg-[#F5EDFF] text-[#6B4EA0] border-[#E2D2FF]',
    pos_venda: 'bg-[#F5F1EC] text-[#7A736C] border-[#E6DDD2]',
    followup_fechamento: 'bg-[#EEF4FF] text-[#3E63A8] border-[#D7E3FF]',
    aguardando_sinal: 'bg-[#FFF4E8] text-[#A35F1E] border-[#F5D8B4]',
    followup_orcamento: 'bg-[#FFF8E7] text-[#A17400] border-[#F2DE9C]',
  };

  const getTaskTypesForStage = (stage) => {
    if (stage === 'followup_orcamento') return ['followup_orcamento'];
    if (stage === 'followup_fechamento') return ['followup_fechamento'];
    if (stage === 'aguardando_sinal') return ['aguardando_sinal'];
    if (stage === 'revisao') return ['revisao'];
    if (stage === 'pos_venda') return ['pos_venda'];
    return [];
  };

  const getProjectTaskState = (project) => {
    const taskTypes = getTaskTypesForStage(project.pipeline_stage);
    const normalizedTasks = followUpTasks.map((task) => (task?.data ? { ...task.data, id: task.data.id || task.id } : task));
    const baseState = getProjectFollowUpState(project, normalizedTasks);
    const relatedPendingTasks = sortByClosestDate(
      (baseState.pendingTasks || []).filter((task) => taskTypes.includes(task.follow_up_type)),
      getFollowUpTaskPriorityDate
    );
    const pendingTask = relatedPendingTasks[0] || null;
    const hasAnyPendingTask = relatedPendingTasks.length > 0;

    if (project.pipeline_stage === 'pos_venda') {
      const postSalePending = (project.post_sale_status || 'pendente') === 'pendente';
      return { visible: postSalePending && hasAnyPendingTask, task: pendingTask, hasAnyRelatedTask: hasAnyPendingTask };
    }

    if (project.pipeline_stage === 'revisao') {
      return { visible: hasAnyPendingTask, task: pendingTask, hasAnyRelatedTask: hasAnyPendingTask };
    }

    return { visible: hasAnyPendingTask, task: pendingTask, hasAnyRelatedTask: hasAnyPendingTask };
  };

  const stageOrder = {
    followup_orcamento: 1,
    followup_fechamento: 2,
    aguardando_sinal: 3,
    revisao: 4,
    pos_venda: 5,
    concluido: 6,
  };

  const projectEntries = projects
    .map((project) => ({ project, followUpState: getProjectTaskState(project) }))
    .filter(({ project, followUpState }) => {
      if (!followUpState.visible) return false;
      if (project.pipeline_stage === 'pos_venda' && !followUpState.task) return false;
      return true;
    })
    .sort((a, b) => {
      const stageDiff = (stageOrder[a.project.pipeline_stage] || 99) - (stageOrder[b.project.pipeline_stage] || 99);
      if (stageDiff !== 0) return stageDiff;

      const dateA = getFollowUpTaskPriorityDate(a.followUpState.task) || getProjectDisplayDate(a.project) || getProjectPriorityDate(a.project) || getProjectStageReferenceDate(a.project);
      const dateB = getFollowUpTaskPriorityDate(b.followUpState.task) || getProjectDisplayDate(b.project) || getProjectPriorityDate(b.project) || getProjectStageReferenceDate(b.project);

      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;

      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

  return (
    <div className="flex h-full flex-col rounded-[28px] border border-[#E7DED2] bg-[#FCF8F4] p-5 shadow-[0_12px_30px_rgba(35,31,32,0.05)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F3E8D6]">
            <Icon className="h-4 w-4 text-[#B08954]" strokeWidth={1.7} />
          </div>
          <div>
            <h3 className="text-base font-display text-[#231F20]">{title}</h3>
            <p className="text-xs text-[#7A736C]">{description}</p>
          </div>
        </div>
        {amountValue !== null && (
          <div className="rounded-2xl border border-[#E7DED2] bg-white px-3 py-2 text-right shadow-[0_6px_18px_rgba(35,31,32,0.04)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9C8A6D]">{amountLabel || 'Valor'}</p>
            <p className="mt-1 text-sm font-display text-[#231F20]">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amountValue)}
            </p>
          </div>
        )}
      </div>

      <div className="flex-1 space-y-3">
        {projectEntries.length === 0 ? (
          <p className="py-6 text-center text-xs text-[#7A736C]">Nenhum cliente nesta etapa</p>
        ) : (
          projectEntries.map(({ project, followUpState }) => {
            const scheduleDate = showScheduleDate ? getScheduleDate(project, followUpState.task) : null;
            const { label: timeLabel, entryDate, hoursInStage } = getStageInfo(project);
            const isUrgent = variant === 'orcamento' && hoursInStage > 48;
            const stageLabel = getStageLabel(project.pipeline_stage);
            const nextAction = getFollowUpAction(project);
            const nextStatus = getFollowUpStatus(project, followUpState.task);
            const checklistExpectedDate = getChecklistExpectedDate(project);

            return (
              <div key={project.id} className="rounded-[24px] border border-[#E9E0D4] bg-white px-4 py-4 sm:px-5 sm:py-5 shadow-[0_6px_18px_rgba(35,31,32,0.04)]">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      to={createPageUrl('ProjectDetails') + `?id=${project.id}`}
                      className="cursor-pointer text-[15px] font-semibold leading-snug text-[#231F20] transition-colors hover:text-[#9C8A6D]"
                    >
                      {project.client_name || 'Cliente'}
                    </Link>
                    {stageLabel && (
                      <Badge className={`mt-1 border px-2 py-0.5 text-[9px] font-medium ${stageBadgeColors[project.pipeline_stage] || 'bg-[#F5F1EC] text-[#7A736C] border-[#E6DDD2]'}`}>
                        {stageLabel}
                      </Badge>
                    )}
                  </div>
                  {project.client_whatsapp && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#25D366] p-0 hover:bg-[#20BD5A]"
                      onClick={() => openWhatsApp(project.client_whatsapp)}
                    >
                      <MessageCircle className="h-3.5 w-3.5 text-white" />
                    </Button>
                  )}
                </div>

                <p className="mb-3 text-[11px] leading-relaxed text-[#7A736C]">
                  {project.description || 'Projeto sem descrição'}
                </p>

                <div className="space-y-2 border-t border-[#EEE4D7] pt-3">
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9C8A6D]">Próxima ação</p>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge className={`border px-2 py-0.5 text-[9px] font-medium ${nextAction.tone}`}>
                        {nextAction.label}
                      </Badge>
                      <Badge className={`border px-2 py-0.5 text-[9px] font-medium ${nextStatus.tone}`}>
                        {nextStatus.label}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-1 text-[#7A736C]">
                    {variant === 'orcamento' && entryDate && (
                      <p className="text-[10px]">Entrou em: {entryDate}</p>
                    )}
                    {variant === 'orcamento' && (
                      <p className={`flex items-center gap-1 text-[11px] font-medium ${isUrgent ? 'text-[#C75B39]' : 'text-[#7A736C]'}`}>
                        <Clock className="h-3 w-3" strokeWidth={1.5} />
                        há {timeLabel} nesta etapa
                        {isUrgent && <span className="ml-1 rounded-full bg-[#C75B39]/10 px-1.5 py-0.5 text-[9px] font-semibold text-[#C75B39]">URGENTE</span>}
                      </p>
                    )}
                    {variant === 'vendas' && (
                      <>
                        {entryDate && <p className="text-[10px]">Entrou em: {entryDate}</p>}
                        <p className="flex items-center gap-1 text-[10px]">
                          <Clock className="h-3 w-3" strokeWidth={1.5} />
                          há {timeLabel}
                        </p>
                      </>
                    )}
                    {variant === 'cuidado' && (() => {
                      const stage = project.pipeline_stage;
                      const stageEntryDate = project.stage_updated_at || project.created_date;
                      const entryFormatted = stageEntryDate ? format(parseISO(stageEntryDate), 'dd/MM/yyyy', { locale: ptBR }) : null;

                      let scheduleDateLabel = null;
                      let stageNameLabel = null;

                      if (stage === 'revisao') {
                        stageNameLabel = 'revisão';
                        const rd = project.revision_datetime || project.revision_date;
                        if (rd) scheduleDateLabel = format(parseISO(rd.length === 10 ? `${rd}T12:00:00` : rd), 'dd/MM/yyyy', { locale: ptBR });
                      } else if (stage === 'pos_venda') {
                        stageNameLabel = 'pós-venda';
                        const pd = project.post_sale_contact_date;
                        if (pd) scheduleDateLabel = format(parseISO(pd.length === 10 ? `${pd}T12:00:00` : pd), 'dd/MM/yyyy', { locale: ptBR });
                      }

                      return (
                        <>
                          {entryFormatted && stageNameLabel && (
                            <p className="text-[10px] text-[#7A736C]">
                              Entrou em {stageNameLabel}: {entryFormatted}
                            </p>
                          )}
                          {scheduleDateLabel && stageNameLabel && (
                            <p className="flex items-center gap-1 text-[10px] text-[#7A736C]">
                              <Calendar className="h-3 w-3" strokeWidth={1.5} />
                              Agendamento da {stageNameLabel}: {scheduleDateLabel}
                            </p>
                          )}
                          {!entryFormatted && !scheduleDateLabel && (
                            <p className="flex items-center gap-1 text-[10px] text-[#7A736C]">
                              <Clock className="h-3 w-3" strokeWidth={1.5} />
                              há {timeLabel}
                            </p>
                          )}
                        </>
                      );
                    })()}
                    {scheduleDate && variant !== 'cuidado' && (
                      <p className="flex items-center gap-1 text-[10px]">
                        <Calendar className="h-2.5 w-2.5" />
                        {scheduleDate}
                      </p>
                    )}
                  </div>

                  <div className="flex items-start justify-between gap-3 rounded-[18px] border border-[#E8DCCF] bg-[#FCF8F4] px-4 py-3">
                    <div className="min-w-0 flex-1">
                     <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#B08B57]">Checklist</p>
                     <div className="space-y-1">
                       <p className="truncate text-[13px] text-[#6E6761]">
                         {followUpState.task
                           ? ((followUpState.task.step_number || followUpState.task.data?.step_number)
                               ? `${followUpState.task.step_number || followUpState.task.data?.step_number}. ${followUpState.task.step_label || followUpState.task.data?.step_label || 'Contato'}`
                               : followUpState.task.step_label || followUpState.task.data?.step_label || 'Contato pendente')
                           : 'Checklist aguardando criação automática'}
                       </p>
                       {followUpState.task && (followUpState.task.due_date || followUpState.task.data?.due_date) && (
                         <p className="flex items-center gap-1 text-[10px] text-[#9C8A6D]">
                           <Calendar className="h-3 w-3" strokeWidth={1.5} />
                           Previsto para {format(parseISO(`${followUpState.task.due_date || followUpState.task.data?.due_date}T12:00:00`), 'dd/MM/yyyy', { locale: ptBR })}
                         </p>
                       )}
                       {!followUpState.task && !followUpState.hasAnyRelatedTask && checklistExpectedDate && (
                         <p className="text-[11px] text-[#9C8A6D]">
                           Vai aparecer em {checklistExpectedDate}.
                         </p>
                       )}
                     </div>
                    </div>
                    <div className="flex shrink-0 items-start gap-1 pt-0.5">
                      {followUpState.task ? (
                        <FollowUpTaskStatusActions
                          task={followUpState.task}
                          projectId={project.id}
                          clientName={project.client_name}
                          pipelineStage={project.pipeline_stage}
                          showCalendarButton
                        />
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}