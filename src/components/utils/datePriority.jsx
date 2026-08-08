const toDate = (value, isDateOnly = false) => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const normalizedValue = isDateOnly && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T12:00:00`
    : value;

  const date = new Date(normalizedValue);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getRevisionBaseDate = (project) => {
  return toDate(project?.tattoo_date, true) || toDate(project?.session_date);
};

const getRevisionDate = (project) => {
  return toDate(project?.revision_datetime) || toDate(project?.revision_date, true) || getRevisionBaseDate(project);
};

const getPostSaleDate = (project) => {
  const revisionDate = getRevisionDate(project);
  if (!revisionDate) return null;

  const postSaleDate = new Date(revisionDate);
  postSaleDate.setMonth(postSaleDate.getMonth() + 2);
  return postSaleDate;
};

export const getProjectPriorityDate = (project) => {
  if (!project) return null;

  switch (project.pipeline_stage) {
    case 'agendado':
      return toDate(project.session_date) || toDate(project.tattoo_date, true) || toDate(project.stage_updated_at) || toDate(project.created_date);
    case 'agendado_orcamento_presencial':
      return toDate(project.session_date) || toDate(project.evaluation_date, true) || toDate(project.stage_updated_at) || toDate(project.created_date);
    case 'revisao':
      return toDate(project.post_sale_contact_date) || getRevisionDate(project) || toDate(project.stage_updated_at) || toDate(project.created_date);
    case 'pos_venda':
      return toDate(project.post_sale_contact_date) || getPostSaleDate(project) || toDate(project.stage_updated_at) || toDate(project.created_date);
    case 'followup_orcamento':
    case 'followup_fechamento':
    case 'aguardando_sinal':
    case 'novo_contato':
    case 'perdido':
    default:
      return toDate(project.stage_updated_at) || toDate(project.created_date);
  }
};

export const getFollowUpTaskPriorityDate = (task) => toDate(task?.due_date || task?.data?.due_date, true);

export const getProjectDisplayDate = (project) => {
  if (!project) return null;

  switch (project.pipeline_stage) {
    case 'agendado':
      return toDate(project.session_date) || toDate(project.tattoo_date, true);
    case 'agendado_orcamento_presencial':
      return toDate(project.session_date) || toDate(project.evaluation_date, true);
    case 'revisao':
      return toDate(project.revision_datetime) || toDate(project.revision_date, true) || getRevisionDate(project);
    case 'pos_venda':
      return toDate(project.post_sale_contact_date) || getPostSaleDate(project);
    default:
      return getProjectPriorityDate(project);
  }
};

const getComparableTime = (value, isDateOnly = false) => {
  return toDate(value, isDateOnly)?.getTime() || Number.POSITIVE_INFINITY;
};

export const sortByClosestDate = (items, getDate) => {
  return [...items].sort((a, b) => {
    const timeA = getComparableTime(getDate(a));
    const timeB = getComparableTime(getDate(b));

    if (timeA !== timeB) {
      return timeA - timeB;
    }

    const fallbackA = getComparableTime(a?.client_registration_date, true) || getComparableTime(a?.created_date);
    const fallbackB = getComparableTime(b?.client_registration_date, true) || getComparableTime(b?.created_date);
    return fallbackA - fallbackB;
  });
};

export const getOldestDateFirst = (items, getDate) => {
  return [...items].sort((a, b) => {
    const timeA = getComparableTime(getDate(a));
    const timeB = getComparableTime(getDate(b));

    if (timeA !== timeB) {
      return timeA - timeB;
    }

    const fallbackA = getComparableTime(a?.client_registration_date, true) || getComparableTime(a?.created_date);
    const fallbackB = getComparableTime(b?.client_registration_date, true) || getComparableTime(b?.created_date);
    return fallbackA - fallbackB;
  });
};