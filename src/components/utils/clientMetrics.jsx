import { getCommissionRate } from '@/components/utils/commissionHelper';
import { getProjectPaidAmount, getProjectPaymentEntries } from '@/components/utils/paymentMetrics';

const proposalStages = [
  'agendado_orcamento_presencial',
  'followup_fechamento',
  'followup_orcamento',
  'aguardando_sinal',
  'agendado',
  'revisao',
  'pos_venda',
  'perdido',
  'orcamento_enviado'
];

const getProjectTime = (project) => {
  const value = project?.stage_updated_at || project?.updated_date || project?.created_date;
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
};

export const getLatestClientProject = (projects = []) => {
  return [...projects].sort((a, b) => getProjectTime(b) - getProjectTime(a))[0] || null;
};

export const getClientProposalCount = (projects = []) => {
  return projects.filter((project) => proposalStages.includes(project.pipeline_stage)).length;
};

export const getClientCompletedProjects = (projects = []) => {
  return projects.filter((project) => {
    const hasConfirmedPayment = Boolean(
      project.total_value_confirmed ||
      project.total_value_confirmed_at ||
      project.payment_date ||
      Number(project.total_value_confirmed_value) > 0
    );

    const isCompletedStage = ['revisao', 'pos_venda'].includes(project.pipeline_stage);
    return hasConfirmedPayment || isCompletedStage;
  });
};

export const getClientPaidAmount = (projects = []) => {
  return projects.reduce((sum, project) => {
    const paidAmount = getProjectPaidAmount(project);

    if (paidAmount > 0) {
      return sum + paidAmount;
    }

    const hasAnyConfirmationData = Boolean(
      project.total_value_confirmed ||
      project.total_value_confirmed_at ||
      project.total_value_confirmed_value ||
      project.payment_date ||
      project.deposit_confirmed ||
      project.deposit_confirmed_at
    );

    const isImportedCompletedProject = ['revisao', 'pos_venda'].includes(project.pipeline_stage);
    const fallbackAmount = !hasAnyConfirmationData && isImportedCompletedProject ? Number(project.total_value) || 0 : 0;

    return sum + fallbackAmount;
  }, 0);
};

export const getClientAccumulatedProfit = (projects = [], financialSettings = {}) => {
  return getClientCompletedProjects(projects).reduce((sum, project) => {
    let entries = getProjectPaymentEntries(project);

    // Fallback for imported completed projects (revisao/pos_venda with zero confirmation data)
    if (entries.length === 0) {
      const hasAnyConfirmationData = Boolean(
        project.total_value_confirmed ||
        project.total_value_confirmed_at ||
        project.total_value_confirmed_value ||
        project.payment_date ||
        project.deposit_confirmed ||
        project.deposit_confirmed_at
      );

      if (!hasAnyConfirmationData && ['revisao', 'pos_venda'].includes(project.pipeline_stage)) {
        const amount = Number(project.total_value) || 0;
        if (amount > 0) {
          entries = [{ amount, method: project.payment_method, installments: project.installments }];
        }
      }
    }

    const projectProfit = entries.reduce((entrySum, entry) => {
      const rate = getCommissionRate(entry.method, entry.installments, financialSettings);
      return entrySum + (entry.amount * rate);
    }, 0);

    return sum + projectProfit;
  }, 0);
};