// Salvador, Bahia - America/Sao_Paulo
const SALVADOR_TZ = 'America/Sao_Paulo';

/**
 * Converte uma data UTC para o horário de Salvador
 */
export function toSalvadorTime(date) {
  if (!date) return null;
  const d = new Date(date);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SALVADOR_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (type) => parts.find((p) => p.type === type)?.value || '0';
  return new Date(
    Number(get('year')),
    Number(get('month')) - 1,
    Number(get('day')),
    Number(get('hour')),
    Number(get('minute')),
    Number(get('second'))
  );
}

/**
 * Converte uma data do horário de Salvador para UTC
 */
export function fromSalvadorTime(date) {
  if (!date) return null;
  const salvadorDate = new Date(date);
  salvadorDate.setHours(salvadorDate.getHours() + 3);
  return salvadorDate;
}

/**
 * Retorna a data/hora atual no horário de Salvador
 */
export function nowInSalvador() {
  return toSalvadorTime(new Date());
}

/**
 * Formata uma data UTC para exibição no horário de Salvador
 */
export function formatInSalvadorTime(date, formatStr, formatFn) {
  if (!date) return '';
  const salvadorDate = toSalvadorTime(date);
  return formatFn(salvadorDate, formatStr);
}