import { addDays, differenceInCalendarDays, parseISO, startOfDay } from 'date-fns';
import { nowInSalvador } from '@/components/utils/timezone';

const defaultTone = 'bg-slate-50 text-slate-600 border-slate-200';

const actionMap = {
  followup_orcamento: {
    label: 'Reagendar orçamento',
    tone: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  followup_fechamento: {
    label: 'Retomar fechamento',
    tone: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  aguardando_sinal: {
    label: 'Cobrar sinal',
    tone: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  revisao: {
    label: 'Confirmar revisão',
    tone: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  pos_venda: {
    label: 'Fazer pós-venda',
    tone: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
};

const dueOffsetByStage = {
  followup_orcamento: 2,
  followup_fechamento: 2,
  aguardando_sinal: 3,
};

function getProjectedDueDate(project) {
  if (!project) return null;

  if (project.pipeline_stage === 'revisao' && project.session_date) {
    return addDays(new Date(project.session_date), 20);
  }

  if (project.pipeline_stage === 'pos_venda') {
    if (project.post_sale_contact_date) {
      return new Date(project.post_sale_contact_date);
    }

    if (project.session_date) {
      const revisaoDate = addDays(new Date(project.session_date), 20);
      const posVendaDate = new Date(revisaoDate);
      posVendaDate.setMonth(posVendaDate.getMonth() + 2);
      return posVendaDate;
    }
  }

  const offset = dueOffsetByStage[project.pipeline_stage];
  const referenceDate = project.stage_updated_at || project.created_date;

  if (offset !== undefined && referenceDate) {
    return addDays(new Date(referenceDate), offset);
  }

  return null;
}

export function getFollowUpAction(project) {
  return actionMap[project?.pipeline_stage] || {
    label: 'Entrar em contato',
    tone: defaultTone,
  };
}

export function getFollowUpStatus(project, task = null) {
  if (project?.pipeline_stage === 'pos_venda' && !task) {
    return {
      label: 'Aguardando tarefa',
      tone: defaultTone,
    };
  }

  const taskDueDateValue = task?.due_date || task?.data?.due_date;
  const dueDate = taskDueDateValue
    ? parseISO(`${taskDueDateValue}T12:00:00`)
    : getProjectedDueDate(project);

  if (!dueDate) {
    return {
      label: 'Sem prazo',
      tone: defaultTone,
    };
  }

  const diff = differenceInCalendarDays(startOfDay(dueDate), startOfDay(nowInSalvador()));

  if (diff < 0) {
    return {
      label: `Atrasado ${Math.abs(diff)}d`,
      tone: 'bg-red-50 text-red-700 border-red-200',
    };
  }

  if (diff === 0) {
    return {
      label: 'Hoje',
      tone: 'bg-amber-50 text-amber-700 border-amber-200',
    };
  }

  if (diff === 1) {
    return {
      label: 'Amanhã',
      tone: 'bg-blue-50 text-blue-700 border-blue-200',
    };
  }

  return {
    label: `Em ${diff}d`,
    tone: defaultTone,
  };
}