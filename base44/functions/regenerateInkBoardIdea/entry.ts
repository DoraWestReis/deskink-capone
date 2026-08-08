import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TZ = 'America/Sao_Paulo';

function toLocalYMD(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const todayYMD = toLocalYMD(new Date());

    // Limite: 1 regeneração por dia por usuário
    const recent = await base44.asServiceRole.entities.Note.filter(
      { source: 'ai', created_by: user.email }, '-created_date', 20
    );
    const alreadyToday = recent.find(
      n => n.ai_regenerated_at && toLocalYMD(new Date(n.ai_regenerated_at)) === todayYMD
    );
    if (alreadyToday) {
      return Response.json({
        skipped: true,
        reason: 'limit_reached',
        message: 'Você já regenerou uma sugestão hoje. Tente novamente amanhã.',
      }, { status: 429 });
    }

    const today = new Date();
    const [projects, clients, followUps] = await Promise.all([
      base44.asServiceRole.entities.Project.filter({}, '-session_date', 20),
      base44.asServiceRole.entities.Client.list('name', 100),
      base44.asServiceRole.entities.FollowUpTask.filter({ status: 'pending' }, 'due_date', 30),
    ]);

    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const upcomingSessions = projects.filter(p => {
      if (!p.session_date) return false;
      const d = new Date(p.session_date);
      return d >= today && d <= nextWeek;
    });

    const todayYMDStr = toLocalYMD(today);
    const overdueFollowUps = followUps.filter(f => f.due_date && f.due_date < todayYMDStr);
    const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
    const birthdayClients = clients.filter(c => c.birth_date && c.birth_date.slice(5, 7) === currentMonth);
    const waitingDeposit = projects.filter(p => p.pipeline_stage === 'aguardando_sinal');

    const contextLines = [];
    if (upcomingSessions.length > 0) contextLines.push(`${upcomingSessions.length} sessão(ões) de tatuagem agendada(s) nos próximos 7 dias.`);
    if (overdueFollowUps.length > 0) contextLines.push(`${overdueFollowUps.length} follow-up(s) de cliente(s) em atraso.`);
    if (birthdayClients.length > 0) contextLines.push(`${birthdayClients.length} cliente(s) fazem aniversário este mês.`);
    if (waitingDeposit.length > 0) contextLines.push(`${waitingDeposit.length} projeto(s) aguardando confirmação de sinal.`);
    if (contextLines.length === 0) contextLines.push('Estúdio de tatuagem em operação regular.');

    const promptContext = contextLines.join(' ');

    const llm = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Você é um assistente de gestão para um estúdio de tatuagem. Com base no contexto abaixo, gere UMA dica prática DIFERENTE e criativa (é uma regeneração — evite o óbvio).\n\nContexto: ${promptContext}\n\nRegras:\n- Título até 60 chars começando com "Ideia:" ou "Lembrete:".\n- Content até 140 chars com a dica concreta.\n- ai_reason até 160 chars explicando a relevância.\n- Português do Brasil, tom prático e direto.`,
      response_json_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          content: { type: 'string' },
          ai_reason: { type: 'string' },
        },
        required: ['title', 'content', 'ai_reason'],
      },
    });

    const note = await base44.asServiceRole.entities.Note.create({
      title: llm.title,
      content: llm.content,
      ai_reason: llm.ai_reason,
      category: 'Ideias',
      priority: 'medium',
      is_task: false,
      source: 'ai',
      status: 'pending',
      ai_regenerated_at: new Date().toISOString(),
    });

    return Response.json({ created: true, note });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});