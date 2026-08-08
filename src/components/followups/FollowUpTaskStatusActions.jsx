import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, CheckCircle2, RotateCcw, X } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import ProjectConclusionDialog from '@/components/project/ProjectConclusionDialog';
import FollowUpCycleDecisionDialog, { NEXT_STAGE_MAP } from '@/components/followups/FollowUpCycleDecisionDialog';
import { invokeFollowUpFunction } from '@/components/followups/invokeFollowUpFunction';
import { useToast } from '@/components/ui/use-toast';

const CYCLE_TYPES = ['followup_orcamento', 'followup_fechamento'];
const FINAL_STEP_BY_TYPE = { followup_orcamento: 4, followup_fechamento: 5 };

export default function FollowUpTaskStatusActions({ task, projectId, clientName, showCalendarButton = false, pipelineStage = null }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const showActionError = (error) => toast({
    variant: 'destructive',
    title: 'Não foi possível salvar',
    description: error?.message || 'Tente novamente em instantes.',
  });
  const normalizedTask = task?.data ? { ...task.data, id: task.data.id || task.id, recordId: task.id } : task;
  const taskId = normalizedTask?.recordId || normalizedTask?.id;
  const projectIdValue = normalizedTask?.project_id || projectId;
  const taskStatus = normalizedTask?.status;
  const isFallback = normalizedTask?.isFallback;
  const taskClientName = normalizedTask?.client_name || clientName || 'Cliente';
  const isGoogleCalendarDisabled = pipelineStage === 'pos_venda';
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('reschedule');
  const [customDays, setCustomDays] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [showConclusionDialog, setShowConclusionDialog] = useState(false);
  const [isCycleDialogOpen, setIsCycleDialogOpen] = useState(false);

  useEffect(() => {
    setSelectedDate(new Date());
    setSelectedTime('09:00');
    setCustomDays('');
  }, [taskId]);

  // Fetch post-sale tasks to determine when the project can be concluded.
  const { data: allProjectTasks = [] } = useQuery({
    queryKey: ['project-follow-up-tasks', projectIdValue],
    queryFn: () => base44.entities.FollowUpTask.filter({ project_id: projectIdValue }, 'due_date'),
    enabled: !!projectIdValue && normalizedTask?.follow_up_type === 'pos_venda',
  });

  const isFinalCycleStep = CYCLE_TYPES.includes(normalizedTask?.follow_up_type)
    && Number(normalizedTask?.step_number) === FINAL_STEP_BY_TYPE[normalizedTask?.follow_up_type];

  const concludeProjectMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      await base44.entities.ProjectStageHistory.create({
        project_id: projectIdValue,
        pipeline_stage: 'concluido',
        changed_at: now,
      });
      await base44.entities.Project.update(projectIdValue, {
        is_concluded: true,
        pipeline_stage: 'concluido',
        stage_updated_at: now,
      });
    },
    onSuccess: () => {
      setShowConclusionDialog(false);
      queryClient.invalidateQueries({ queryKey: ['follow-up-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['project-follow-up-tasks', projectIdValue] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', projectIdValue] });
    },
  });

  const checkAndPromptConclusion = () => {
    // Check remaining pending pos_venda tasks EXCLUDING the current one being completed
    const normalizedAllTasks = allProjectTasks.map((t) => (t?.data ? { ...t.data, id: t.data.id || t.id } : t));
    const remainingPending = normalizedAllTasks.filter(
      (t) => t.follow_up_type === 'pos_venda' && t.status === 'pending' && t.id !== taskId
    );
    if (remainingPending.length === 0) {
      setShowConclusionDialog(true);
    }
  };

  const updateTaskMutation = useMutation({
    mutationFn: async (status) => {
      if (isFallback) {
        const createdTask = await base44.entities.FollowUpTask.create({
          project_id: projectIdValue,
          client_name: taskClientName,
          follow_up_type: normalizedTask.follow_up_type,
          step_number: normalizedTask.step_number || 1,
          step_label: normalizedTask.step_label || 'Contato',
          due_date: new Date().toISOString().split('T')[0],
          status,
          message: normalizedTask.step_label || 'Contato pendente',
        });

        if (normalizedTask.follow_up_type === 'pos_venda' && status === 'completed' && projectIdValue) {
          await base44.entities.Project.update(projectIdValue, {
            post_sale_status: 'feito',
          });
        }

        return createdTask;
      }

      const updatedTask = await invokeFollowUpFunction('updateFollowUpTaskStatus', {
        taskId,
        status,
      });

      if (normalizedTask.follow_up_type === 'pos_venda' && projectIdValue) {
        await base44.entities.Project.update(projectIdValue, {
          post_sale_status: status === 'completed' ? 'feito' : 'pendente',
        });
      }

      return updatedTask;
    },
    onSuccess: (_, status) => {
      queryClient.setQueryData(['follow-up-tasks'], (current = []) =>
        current.filter((item) => {
          const itemData = item?.data ? item.data : item;
          const itemId = itemData?.id || item?.id;
          const itemRecordId = item?.recordId || item?.id;
          return itemId !== taskId && itemRecordId !== taskId;
        })
      );
      queryClient.setQueryData(['project-follow-up-tasks', projectIdValue], (current = []) =>
        current.filter((item) => {
          const itemData = item?.data ? item.data : item;
          const itemId = itemData?.id || item?.id;
          const itemRecordId = item?.recordId || item?.id;
          return itemId !== taskId && itemRecordId !== taskId;
        })
      );
      queryClient.invalidateQueries({ queryKey: ['follow-up-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['project-follow-up-tasks', projectIdValue] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });

      // After completing a pos_venda task, check if project can be concluded
      if (status === 'completed' && normalizedTask?.follow_up_type === 'pos_venda') {
        checkAndPromptConclusion();
      }
    },
    onError: showActionError,
  });

  const cycleDecisionMutation = useMutation({
    mutationFn: async ({ decision }) => {
      await invokeFollowUpFunction('updateFollowUpTaskStatus', { taskId, status: 'completed' });

      if (decision === 'restart') {
        return invokeFollowUpFunction('resetProjectFollowUpTasks', {
          projectId: projectIdValue,
          followUpType: normalizedTask.follow_up_type,
        });
      }

      return base44.entities.Project.update(projectIdValue, {
        pipeline_stage: NEXT_STAGE_MAP[normalizedTask.follow_up_type],
        stage_updated_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      setIsCycleDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['follow-up-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['project-follow-up-tasks', projectIdValue] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', projectIdValue] });
    },
    onError: showActionError,
  });

  const rescheduleTaskMutation = useMutation({
    mutationFn: (payload) => {
      if (isFallback) {
        return base44.entities.FollowUpTask.create({
          project_id: projectIdValue,
          client_name: taskClientName,
          follow_up_type: normalizedTask.follow_up_type,
          step_number: normalizedTask.step_number || 1,
          step_label: normalizedTask.step_label || 'Contato',
          due_date: payload.newDueDate,
          status: 'pending',
          message: normalizedTask.message || normalizedTask.step_label || 'Contato pendente',
        });
      }

      return invokeFollowUpFunction('rescheduleFollowUpTask', { taskId, ...payload });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-up-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['project-follow-up-tasks', projectIdValue] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', projectIdValue] });
      setIsDialogOpen(false);
    },
    onError: showActionError,
  });

  const createCalendarEventMutation = useMutation({
    mutationFn: () => invokeFollowUpFunction('createFollowUpCalendarEvent', {
      projectId: projectIdValue,
      taskId,
      date: format(selectedDate, 'yyyy-MM-dd'),
      time: selectedTime,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-up-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsDialogOpen(false);
    },
    onError: showActionError,
  });

  const handleCompleteClick = () => {
    if (isFinalCycleStep) {
      setIsCycleDialogOpen(true);
      return;
    }
    updateTaskMutation.mutate('completed');
  };

  const isActionable = taskStatus === 'pending';

  if (!normalizedTask || (!taskId && !isFallback) || !isActionable) {
    return null;
  }

  return (
    <>
      <div className="flex shrink-0 items-center gap-1 [&>*]:shrink-0">
        <button
          type="button"
          title="Marcar como resolvido"
          aria-label="Marcar como resolvido"
          disabled={updateTaskMutation.isPending || rescheduleTaskMutation.isPending || cycleDecisionMutation.isPending}
          onClick={handleCompleteClick}
          className="flex h-7 w-7 items-center justify-center rounded-full text-[#18B663] transition-colors hover:bg-[#EAF8F0] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <CheckCircle2 className="h-4 w-4" strokeWidth={2.2} />
        </button>
        <button
          type="button"
          title="Reagendar follow-up"
          aria-label="Reagendar follow-up"
          disabled={updateTaskMutation.isPending || rescheduleTaskMutation.isPending}
          onClick={() => {
            setDialogMode('reschedule');
            setIsDialogOpen(true);
          }}
          className="flex h-7 w-7 items-center justify-center rounded-full text-[#B08954] transition-colors hover:bg-[#F4EEE7] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RotateCcw className="h-4 w-4" strokeWidth={2} />
        </button>
        {showCalendarButton && (
          <button
            type="button"
            title={isGoogleCalendarDisabled ? "Google Agenda indisponível no Pós-Venda" : "Agendar no Google Agenda"}
            aria-label={isGoogleCalendarDisabled ? "Google Agenda indisponível no Pós-Venda" : "Agendar no Google Agenda"}
            disabled={isGoogleCalendarDisabled}
            onClick={() => {
              if (isGoogleCalendarDisabled) return;
              setDialogMode('calendar');
              setIsDialogOpen(true);
            }}
            className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${isGoogleCalendarDisabled ? 'cursor-not-allowed text-[#B8B1A8] bg-[#F3EEE8]' : 'text-[#2B9AF3] hover:bg-[#EEF7FF]'}`}
          >
            <CalendarDays className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          title="Retirar da lista"
          aria-label="Retirar da lista"
          disabled={updateTaskMutation.isPending || rescheduleTaskMutation.isPending}
          onClick={() => updateTaskMutation.mutate('dismissed')}
          className="flex h-7 w-7 items-center justify-center rounded-full text-[#9A9188] transition-colors hover:bg-[#F4EEE7] hover:text-[#7F766E] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[360px] rounded-2xl border-[#E8E5E0] bg-[#FCF8F4] p-0">
          <DialogHeader className="px-5 pt-5">
            <DialogTitle className="text-base text-[#231F20]">{dialogMode === 'calendar' ? 'Agendar no Google Agenda' : 'Reagendar follow-up'}</DialogTitle>
            <DialogDescription className="text-[#7A736C]">
              {dialogMode === 'calendar'
                ? 'Escolha o dia e horário para criar o evento no Google Agenda.'
                : 'Escolha uma nova data ou informe quantos dias deseja adiar este contato.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-3 pb-1">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              className="mx-auto"
            />
            {dialogMode === 'calendar' ? (
              <div className="px-2">
                <label className="mb-1 block text-sm text-[#7A736C]">Horário</label>
                <Input type="time" value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)} />
              </div>
            ) : (
              <div className="px-2">
                <label className="mb-1 block text-sm text-[#7A736C]">Ou informe quantos dias deseja adiar</label>
                <Input type="number" min="1" value={customDays} onChange={(e) => setCustomDays(e.target.value)} placeholder="Ex: 3" />
              </div>
            )}
          </div>

          <DialogFooter className="px-5 pb-5 sm:justify-between sm:space-x-0">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (dialogMode === 'calendar') {
                  createCalendarEventMutation.mutate();
                  return;
                }
                const payload = customDays
                  ? { customDays: Number(customDays) }
                  : { newDueDate: format(selectedDate, 'yyyy-MM-dd') };
                rescheduleTaskMutation.mutate(payload);
              }}
              disabled={!selectedDate || rescheduleTaskMutation.isPending || createCalendarEventMutation.isPending}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <FollowUpCycleDecisionDialog
        open={isCycleDialogOpen}
        onOpenChange={setIsCycleDialogOpen}
        followUpType={normalizedTask.follow_up_type}
        isProcessing={cycleDecisionMutation.isPending}
        onAdvance={() => cycleDecisionMutation.mutate({ decision: 'advance' })}
        onRestart={() => cycleDecisionMutation.mutate({ decision: 'restart' })}
      />
      <ProjectConclusionDialog
        open={showConclusionDialog}
        onConfirm={() => concludeProjectMutation.mutate()}
        onCancel={() => setShowConclusionDialog(false)}
        clientName={taskClientName}
        isPending={concludeProjectMutation.isPending}
      />
    </>
  );
}