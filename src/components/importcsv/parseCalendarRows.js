const SERVICE_WORDS = [
  'tattoo', 'tatuagem', 'tatoo', 'sessao', 'sessão', 'cobertura', 'reforma', 'retoque',
  'fineline', 'realismo', 'orcamento', 'orçamento', 'avaliacao', 'avaliação',
  'revisao', 'revisão', 'colorido', 'blackwork', 'black', 'work', 'de', 'da', 'do', 'com', '-',
];

const strip = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const capitalize = (s) => s.split(/\s+/).filter(Boolean)
  .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

export function parseTitle(rawTitle) {
  const title = String(rawTitle || '').replace(/\s+/g, ' ').trim();
  const tokens = title.split(' ').filter(Boolean);
  const serviceTokens = [];
  const nameTokens = [];
  tokens.forEach((token) => {
    const clean = strip(token.replace(/[^\p{L}\p{N}-]/gu, ''));
    if (!clean) return;
    if (SERVICE_WORDS.includes(clean)) serviceTokens.push(token);
    else nameTokens.push(token);
  });
  const name = capitalize(nameTokens.join(' ')) || 'Sem nome';
  const description = capitalize(serviceTokens.filter((t) => strip(t) !== 'de' && strip(t) !== 'da' && strip(t) !== 'do').join(' ')) || 'Tatuagem';
  return { name, description };
}

export function extractContact(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  const match = raw.match(/(\+?\d[\d\s().-]{8,})/);
  return match ? match[1].replace(/[^\d+]/g, '') : raw.slice(0, 120);
}

export function parseCalendarRows(rows, now = new Date()) {
  const groups = new Map();

  (rows || []).forEach((row) => {
    const start = new Date(row.data_inicio);
    if (Number.isNaN(start.getTime())) return;
    const end = new Date(row.data_termino);
    const duration = Number.isNaN(end.getTime())
      ? 120
      : Math.max(30, Math.round((end.getTime() - start.getTime()) / 60000));

    const { name, description } = parseTitle(row.titulo);
    const contact = extractContact(row.descricao_contato);
    const key = strip(name);

    if (!groups.has(key)) groups.set(key, { key, name, contact, sessions: [] });
    const group = groups.get(key);
    if (!group.contact && contact) group.contact = contact;

    group.sessions.push({
      description,
      session_date: start.toISOString(),
      session_duration_minutes: duration,
      pipeline_stage: start > now ? 'agendado' : 'concluido',
      notes: String(row.descricao_contato || '').trim() || undefined,
      contact,
      title: row.titulo,
    });
  });

  const list = Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name));
  return {
    groups: list,
    totalClients: list.length,
    totalSessions: list.reduce((sum, g) => sum + g.sessions.length, 0),
    withoutContact: list.filter((g) => !g.contact).length,
  };
}