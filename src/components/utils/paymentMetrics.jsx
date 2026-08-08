export const parseMetricDate = (dateValue) => {
  if (!dateValue) return null;

  const normalizedValue = /^\d{4}-\d{2}-\d{2}$/.test(dateValue)
    ? `${dateValue}T12:00:00`
    : dateValue;

  const parsedDate = new Date(normalizedValue);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

export const getConfirmedDepositAmount = (project = {}) => {
  const hasDepositPayment = Boolean(
    project.deposit_confirmed ||
    project.deposit_confirmed_at ||
    Number(project.deposit_confirmed_value) > 0
  );

  if (!hasDepositPayment) return 0;
  return Number(project.deposit_confirmed_value) || Number(project.deposit_value) || 0;
};

export const getProjectDepositMetricDate = (project = {}) => {
  return parseMetricDate(project.deposit_confirmed_at);
};

export const getProjectTotalPaymentMetricDate = (project = {}) => {
  return parseMetricDate(project.payment_date || project.total_value_confirmed_at);
};

export const getProjectRemainingBalance = (project = {}) => {
  const totalValue = Number(project.total_value) || 0;
  const confirmedDeposit = getConfirmedDepositAmount(project);

  if (totalValue <= 0) return 0;
  return Math.max(totalValue - confirmedDeposit, 0);
};

export const getConfirmedTotalPaymentAmount = (project = {}) => {
  const hasTotalPayment = Boolean(
    project.total_value_confirmed ||
    project.total_value_confirmed_at ||
    project.payment_date ||
    Number(project.total_value_confirmed_value) > 0
  );

  if (!hasTotalPayment) return 0;

  const confirmedTotal = Number(project.total_value_confirmed_value) || Number(project.total_value) || 0;
  const totalValue = Number(project.total_value) || 0;
  const confirmedDeposit = getConfirmedDepositAmount(project);

  if (confirmedDeposit > 0 && totalValue > 0 && confirmedTotal >= totalValue) {
    return Math.max(confirmedTotal - confirmedDeposit, 0);
  }

  return confirmedTotal;
};

export const getProjectPaymentEntries = (project = {}) => {
  const entries = [];

  const depositDate = getProjectDepositMetricDate(project);
  const depositAmount = getConfirmedDepositAmount(project);
  if (depositDate && depositAmount > 0) {
    entries.push({
      type: 'deposit',
      amount: depositAmount,
      method: project.deposit_confirmed_method || project.payment_method,
      installments: project.installments,
      date: depositDate,
    });
  }

  const totalDate = getProjectTotalPaymentMetricDate(project);
  const totalAmount = getConfirmedTotalPaymentAmount(project);
  if (totalDate && totalAmount > 0) {
    entries.push({
      type: 'total_value',
      amount: totalAmount,
      method: project.total_value_confirmed_method || project.payment_method,
      installments: project.installments,
      date: totalDate,
    });
  }

  return entries;
};

export const getProjectPaidAmount = (project = {}) => {
  const entriesTotal = getProjectPaymentEntries(project).reduce((sum, entry) => sum + entry.amount, 0);

  // If we got a value from confirmed payment entries, use it (manual/AI flow)
  if (entriesTotal > 0) return entriesTotal;

  // Fallback ONLY for imported projects: stage is pos_venda but has NO confirmation fields
  // (manual projects always have total_value_confirmed_at or payment_date from the confirmation flow)
  const hasAnyConfirmationData = Boolean(
    project.total_value_confirmed ||
    project.total_value_confirmed_at ||
    project.total_value_confirmed_value ||
    project.payment_date ||
    project.deposit_confirmed ||
    project.deposit_confirmed_at
  );

  if (!hasAnyConfirmationData && project.pipeline_stage === 'pos_venda') {
    return Number(project.total_value) || 0;
  }

  return 0;
};