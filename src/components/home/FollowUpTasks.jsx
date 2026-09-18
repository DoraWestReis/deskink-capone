import React from 'react';
import { motion } from 'framer-motion';
import { Bell, MessageCircle, Lightbulb, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, differenceInCalendarDays, startOfDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { nowInSalvador } from '@/components/utils/timezone';
import { getFollowUpTaskPriorityDate, sortByClosestDate } from '@/components/utils/datePriority';
import FollowUpTaskStatusActions from '@/components/followups/FollowUpTaskStatusActions';

export default function FollowUpTasks({ tasks = [], periodStart = null, periodEnd = null, isShortPeriod = false }) {
  const queryClient = useQueryClient();

  const { data: notes = [] } = useQuery({
    queryKey: ['notes'],
    queryFn: () => base44.entities.Note.list('-created_date'),
  });

  const { data: allClients = [] } = useQuery({
    queryKey: ['clients-for-notes-whatsapp'],
    queryFn: () => base44.entities.Client.list('name', 500),
  });

  const clientWhatsappMap = React.useMemo(() => {
    const map = {};
    allClients.forEach((c) => { map[c.id] = c.whatsapp; });
    return map;
  }, [allClients]);

  const completeNoteMutation = useMutation({
    mutationFn: (note) => base44.entities.Note.update(note.id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
  });

  const inkboardTasks = notes
    .filter((n) => n.is_task && n.status === 'pending' && n.due_date)
    .filter((n) => {
      if (!periodEnd) return true;
      const due = new Date(`${n.due_date}T12:00:00`);
      if (isShortPeriod) return due <= periodEnd;
      if (periodStart) return due >= periodStart && due <= periodEnd;
      return true;
    })
    .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));

  const getWhatsAppLink = (whatsapp) => {
    if (!whatsapp) return null;
    const phone = whatsapp.replace(/\D/g, '');
    return `https://wa.me/55${phone}`;
  };

  const normalizedTasks = tasks.map((task) => task?.data ? { ...task.data, id: task.data.id || task.id, recordId: task.id } : task);

  const pendingTasks = sortByClosestDate(
    Object.values(normalizedTasks.reduce((acc, task) => {
      if (task.status !== 'pending') return acc;
      const dueDate = getFollowUpTaskPriorityDate(task);
      if (!dueDate) return acc;
      if (periodEnd) {
        if (isShortPeriod && dueDate > periodEnd) return acc;
        if (!isShortPeriod && periodStart && (dueDate < periodStart || dueDate > periodEnd)) return acc;
      }

      const projectKey = `${task.project_id || task.id}-${task.follow_up_type || ''}`;
      const current = acc[projectKey];
      if (!current || getFollowUpTaskPriorityDate(task) < getFollowUpTaskPriorityDate(current)) {
        acc[projectKey] = task;
      }
      return acc;
    }, {})),
    getFollowUpTaskPriorityDate
  );

  const getTypeLabel = (type) => {
    if (type === 'aguardando_sinal') return 'Aguardando sinal';
    if (type === 'followup_orcamento') return 'Follow-up de orçamento';
    if (type === 'followup_fechamento') return 'Follow-up de fechamento';
    if (type === 'session_reminder') return 'Lembrete de sessão';
    return 'Pós-venda';
  };

  const parseTaskDate = (value, isDateOnly = false) => {
    if (!value) return null;
    return new Date(isDateOnly ? `${value}T12:00:00` : value);
  };

  const formatTaskDate = (value, isDateOnly = false) => {
    const date = parseTaskDate(value, isDateOnly);
    if (!date) return null;

    const currentYear = nowInSalvador().getFullYear();
    const pattern = date.getFullYear() === currentYear ? "d 'de' MMM" : "d 'de' MMM yyyy";
    return format(date, pattern, { locale: ptBR });
  };

  const getPendingState = (dueDate) => {
    if (!dueDate) return null;

    const today = startOfDay(nowInSalvador());
    const due = startOfDay(parseTaskDate(dueDate, true));
    const diff = differenceInCalendarDays(today, due);

    if (diff > 0) {
      return {
        label: `Pendente há ${diff} ${diff === 1 ? 'dia' : 'dias'}`,
        className: 'bg-red-50 text-red-700',
      };
    }

    if (diff === 0) {
      return {
        label: 'Pendente para hoje',
        className: 'bg-amber-50 text-amber-700',
      };
    }

    const daysUntil = Math.abs(diff);
    return {
      label: `Programada em ${daysUntil} ${daysUntil === 1 ? 'dia' : 'dias'}`,
      className: 'bg-emerald-50 text-emerald-700',
    };
  };

  if (pendingTasks.length === 0 && inkboardTasks.length === 0) {
    return null;
  }

  const totalCount = pendingTasks.length + inkboardTasks.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[28px] border border-[#E7DED2] bg-[#FCF8F4] p-5 shadow-[0_12px_30px_rgba(35,31,32,0.05)]"
    >
      <div className="mb-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F3E8D6]">
            <Bell className="h-5 w-5 text-[#B08954]" />
          </div>
          <div>
            <h3 className="text-base font-display text-[#231F20]">Lista de tarefas</h3>
            <p className="text-xs text-[#7A736C]">{totalCount} {totalCount === 1 ? 'tarefa aguardando ação' : 'tarefas aguardando ação'}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E7DED2] bg-white px-4 py-3">
          <p className="text-xs text-[#6E6761]">Entre em contato, acompanhe o cliente e marque quando a tarefa estiver resolvida.</p>
          <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-medium text-[#9C8A6D]">
            <span>✓ Resolvido</span>
            <span>↺ Resolver e reagendar</span>
            <span>× Retirar da lista</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {inkboardTasks.map((note) => {
          const dueFormatted = format(parseISO(`${note.due_date}T12:00:00`), "d 'de' MMM", { locale: ptBR });
          const pendingState = getPendingState(note.due_date);
          return (
            <div
              key={`inkboard-${note.id}`}
              className="rounded-2xl border border-[#E9E0D4] bg-white p-4 shadow-[0_6px_18px_rgba(35,31,32,0.04)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B89A66]">
                    <Lightbulb className="h-3 w-3" />
                    Tarefa pendente - InkBoard
                  </p>
                  <Link to="/inkboard" className="block">
                    <p className="truncate text-sm font-semibold text-[#231F20] hover:text-[#9C8A6D]">{note.title}</p>
                  </Link>
                  {note.content && (
                    <p className="mt-2 text-xs leading-relaxed text-[#6E6761]">{note.content}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-[#F7F2EA] px-2.5 py-1 text-[11px] font-medium text-[#7A736C]">
                      Prevista para {dueFormatted}
                    </span>
                    {pendingState && (
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${pendingState.className}`}>
                        {pendingState.label}
                      </span>
                    )}
                    {note.category && (
                      <span className="rounded-full bg-[#F3E8D6] px-2.5 py-1 text-[11px] font-semibold text-[#8F7445]">
                        {note.category}
                      </span>
                    )}
                    {(() => {
                      const linkedClients = Array.isArray(note.clients) && note.clients.length > 0
                        ? note.clients
                        : (note.client_id ? [{ id: note.client_id, name: note.client_name }] : []);
                      return linkedClients.map((c) => {
                        const waLink = getWhatsAppLink(clientWhatsappMap[c.id]);
                        return (
                          <span
                            key={c.id || c.name}
                            className="inline-flex items-center gap-1.5 rounded-full bg-[#EEF2FF] px-2.5 py-1 text-[11px] font-medium text-[#4F6BBF]"
                          >
                            {c.name}
                            {waLink && (
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={`Abrir WhatsApp de ${c.name}`}
                                aria-label={`Abrir WhatsApp de ${c.name}`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#25D366] transition-colors hover:bg-[#20BD5A]"
                              >
                                <MessageCircle className="h-2.5 w-2.5 text-white" />
                              </a>
                            )}
                          </span>
                        );
                      });
                    })()}
                  </div>
                </div>
                <div className="flex shrink-0 items-center self-start">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      completeNoteMutation.mutate(note);
                    }}
                    disabled={completeNoteMutation.isPending}
                    title="Concluir tarefa"
                    className="flex h-9 w-9 touch-manipulation items-center justify-center rounded-full text-[#2F8A6E] transition-colors hover:bg-[#E8F3EE] disabled:opacity-40"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {pendingTasks.slice(0, 5).map((task) => {
          const pendingState = getPendingState(task.due_date);

          return (
            <div
              key={task.id}
              className="rounded-2xl border border-[#E9E0D4] bg-white p-4 shadow-[0_6px_18px_rgba(35,31,32,0.04)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B89A66]">Tarefa pendente</p>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/ProjectDetails?id=${task.project_id}`}
                      className="truncate text-sm font-semibold text-[#231F20] hover:text-[#9C8A6D]"
                    >
                      {task.client_name}
                    </Link>
                    {getWhatsAppLink(task.client_whatsapp || task.project_whatsapp || task.whatsapp) && (
                      <a
                        href={getWhatsAppLink(task.client_whatsapp || task.project_whatsapp || task.whatsapp)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Abrir conversa no WhatsApp"
                        aria-label="Abrir conversa no WhatsApp"
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#25D366] transition-colors hover:bg-[#20BD5A]"
                      >
                        <MessageCircle className="h-3.5 w-3.5 text-white" />
                      </a>
                    )}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-[#6E6761]">{task.message}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {task.due_date && (
                      <span className="rounded-full bg-[#F7F2EA] px-2.5 py-1 text-[11px] font-medium text-[#7A736C]">
                        Prevista para {formatTaskDate(task.due_date, true)}
                      </span>
                    )}
                    {pendingState && (
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${pendingState.className}`}>
                        {pendingState.label}
                      </span>
                    )}
                    {task.step_label && (
                      <span className="rounded-full bg-[#F3E8D6] px-2.5 py-1 text-[11px] font-semibold text-[#8F7445]">
                        {task.step_number ? `${task.step_number}. ${task.step_label}` : task.step_label}
                      </span>
                    )}
                    <span className="rounded-full bg-[#F7F2EA] px-2.5 py-1 text-[11px] font-medium text-[#7A736C]">
                      {getTypeLabel(task.follow_up_type)}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1 self-start [&>*]:shrink-0">
                  <FollowUpTaskStatusActions task={task} projectId={task.project_id} showCalendarButton />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}