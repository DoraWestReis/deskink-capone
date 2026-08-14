import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Loader2, MessageCircle, Minus, Plus, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import StudioFlowComposer from '@/components/ai/StudioFlowComposer';
import StudioFlowMessageBubble from '@/components/ai/StudioFlowMessageBubble';
import { getPreviewDataMode } from '@/lib/previewDataMode';
import { getCommissionRate } from '@/components/utils/commissionHelper';

const AGENT_NAME = 'studioflow_ai';
const BOOTSTRAP_MESSAGE = '__studioflow_bootstrap__';
const HIDDEN_REQUEST_PREFIX = '__studioflow_internal__::';
const BOOTSTRAP_STORAGE_PREFIX = 'studioflow_ai_last_bootstrap_window';
const CONVERSATION_STORAGE_PREFIX = 'studioflow_ai_conversation';
const CHAT_VERSION = 'deskink_v2';
const CHAT_REFRESH_HOURS = [6, 18];
const FULL_SCAN_BATCH_SIZE = 200;
const MAX_MATCHED_CLIENTS = 8;
const MAX_MATCHED_PROJECTS = 12;
const MAX_DAILY_PROJECTS = 20;
const CONTEXT_INSTRUCTION = 'Use apenas o contexto abaixo como fonte única de verdade. Esse contexto representa a base ativa atual do DeskInk e contém somente dados de clientes, dados de projetos, tarefas de follow-up, análises do app, regras de cálculo, regras de uso e comandos do desenvolvedor. Antes de responder, analise com atenção essas informações e nunca use conhecimento externo, memória antiga, nomes antigos do produto ou suposições fora desse contexto. Você é o assistente interno do DeskInk para gestão de estúdio de tatuagem. Nunca chame o app de StudioFlow ou qualquer outro nome. Se surgir informação antiga ou conflitante, considere DeskInk como o único nome correto. Responda em linguagem simples, prática e objetiva, com foco em usabilidade real do sistema. Seja breve por padrão e evite respostas longas, repetitivas ou com contexto desnecessário. Não termine a resposta repetindo a mesma conclusão em um texto final de reforço. Se já respondeu, encerre ali. Nunca cite código, funções internas, banco de dados, credenciais, desenvolvimento ou detalhes técnicos. Nunca invente campos, nomes de telas, botões ou regras que não estejam no contexto ativo. Se o usuário mencionar um campo, confirme pelos nomes presentes no contexto antes de explicar. Se houver mudança recente de nomenclatura, priorize sempre o nome mais atual do contexto ativo. Para perguntas sobre clientes, projetos, etapas, agenda, histórico, financeiro, filtros, telas, botões, reagendamentos ou cálculos, considere que a busca deve olhar toda a base ativa do app, e não apenas registros recentes. Quando houver os campos client_search_results, matched_clients ou matched_client_projects no contexto, use-os como prioridade para localizar clientes e etapas antes de dizer que não encontrou alguém. Use recortes por data apenas para insights, prioridades e tomada de decisão diária. Sempre que o usuário perguntar como o app calcula lucro, comissão, faturamento, ticket médio ou valores por projeto, explique usando as regras presentes em calculation_rules e, se existir, use também calculation_examples e daily_financial_context para mostrar de onde veio o valor. Ao explicar a área de follow-up, considere estas regras atuais: o botão Reagendar pode aparecer também em tarefas sugeridas pelo app; ao reagendar uma sugestão, ela deixa de ser apenas sugestão e vira uma tarefa real para a nova data escolhida; os prazos automáticos devem seguir sempre as configurações salvas em Configurações. Ao explicar esse botão, diga que ele serve para adiar a próxima ação e manter o cliente na rotina de acompanhamento. Quando o usuário pedir ajuda de uso, priorize orientar por tela, botão, campo, filtro, card e próximos passos. Se o tatuador pedir para agendar revisão com data, hora ou duração específicas, trate isso como pedido de ação e gere um bloco studioflow_action do tipo schedule_revision quando o projeto estiver claro no contexto. Se o tatuador pedir para criar cliente, criar projeto ou mover etapa, nunca diga que a ação foi concluída; em vez disso, peça confirmação e inclua um bloco studioflow_action com JSON válido para o app executar. Quando explicar campos do projeto, use esta referência: Data da Avaliação = data da avaliação/orçamento presencial; Data da Sessão = data e hora agendadas para executar a tatuagem; Data da Tatuagem = data real em que a tatuagem foi realizada; Data do Fechamento = data em que o valor total da tatuagem foi recebido; Data do Pagamento = data usada para registrar recebimento no faturamento por competência; Data e Hora da Revisão = agendamento da revisão; Duração da Revisão = tempo previsto da revisão.';

const getCurrentBootstrapWindowKey = () => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dayKey = formatter.format(now);
  const localHour = Number(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    hour12: false,
  }).format(now));
  const currentWindow = CHAT_REFRESH_HOURS.reduce((selected, hour) => (
    localHour >= hour ? hour : selected
  ), CHAT_REFRESH_HOURS[0]);

  return `${dayKey}:${String(currentWindow).padStart(2, '0')}`;
};

const getEnvironmentConversationKey = () => {
  const mode = getPreviewDataMode();
  return `${CONVERSATION_STORAGE_PREFIX}:${CHAT_VERSION}:${mode}`;
};

const getBootstrapStorageKey = () => `${BOOTSTRAP_STORAGE_PREFIX}:${CHAT_VERSION}:${getPreviewDataMode()}`;

export default function StudioFlowFloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [isBooting, setIsBooting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [actionStates, setActionStates] = useState({});
  const [actionFeedback, setActionFeedback] = useState({});
  const bottomRef = useRef(null);
  const scrollAreaRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);
  const bootstrappedConversations = useRef(new Set());
  const queryClient = useQueryClient();

  const visibleMessages = useMemo(
    () => messages
      .map((message) => {
        if (typeof message.content !== 'string') return message;

        const requestPrefix = '\n\nSolicitação: ';
        const requestIndex = message.content.indexOf(requestPrefix);

        if (requestIndex === -1) return message;

        const visibleContent = message.content.slice(requestIndex + requestPrefix.length).trim();
        const sanitizedContent = visibleContent
          .replace(HIDDEN_REQUEST_PREFIX, '')
          .replace(/\s*\((Projeto|Task) ID [^)]+\)/gi, '')
          .replace(/\b(Projeto|Task) ID\s+[a-z0-9-]+:?/gi, '')
          .replace(/\bID:\s*[A-Za-z0-9-]{8,}\b/gi, '')
          .replace(/[ \t]{2,}/g, ' ')
          .trim();

        if (visibleContent.startsWith(HIDDEN_REQUEST_PREFIX) || sanitizedContent === BOOTSTRAP_MESSAGE) {
          return { ...message, content: BOOTSTRAP_MESSAGE };
        }

        return { ...message, content: sanitizedContent };
      })
      .filter((message) => message.content !== BOOTSTRAP_MESSAGE),
    [messages]
  );

  const loadAllEntities = async (entityApi) => {
    const results = [];
    let skip = 0;

    while (true) {
      const batch = await entityApi.list('-updated_date', FULL_SCAN_BATCH_SIZE, skip);
      if (!batch?.length) break;
      results.push(...batch);
      skip += batch.length;
      if (batch.length < FULL_SCAN_BATCH_SIZE) break;
    }

    return results;
  };

  const getSearchTerms = (content) => normalizeText(content)
    .split(/\s+/)
    .filter((term) => term.length >= 3)
    .filter((term) => !['cliente', 'clientes', 'buscar', 'busca', 'procura', 'procurar', 'encontre', 'encontrar', 'achar', 'ache', 'cadastro', 'contato', 'nome', 'etapa', 'etapas', 'projeto', 'projetos', 'agenda', 'hoje', 'qual', 'quais'].includes(term));

  const searchClientsByMessage = async (content, allClients) => {
    const normalizedContent = normalizeText(content);
    const searchTerms = getSearchTerms(content);

    if (searchTerms.length === 0) {
      return [];
    }

    const clients = allClients || await loadAllEntities(base44.entities.Client);

    return (clients || [])
      .map((client) => {
        const normalizedName = normalizeText(client.name);
        const matchedTerms = searchTerms.filter((term) => normalizedName.includes(term)).length;
        const exactPhraseMatch = normalizedName.includes(normalizedContent) || normalizedContent.includes(normalizedName);
        const score = exactPhraseMatch ? 100 : matchedTerms;

        return {
          client,
          score,
        };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_MATCHED_CLIENTS)
      .map(({ client, score }) => ({
        id: client.id,
        client_id: client.client_id,
        codigo_sequencial: client.codigo_sequencial,
        name: client.name,
        whatsapp: client.whatsapp,
        birth_date: client.birth_date,
        lead_origin: client.lead_origin,
        total_spent_history: client.total_spent_history,
        match_score: score,
      }));
  };

  const toLocalDate = (value) => {
    if (!value) return '';
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(value));
  };

  const summarizeClient = (client) => ({
    id: client.id,
    client_id: client.client_id,
    codigo_sequencial: client.codigo_sequencial,
    name: client.name,
    whatsapp: client.whatsapp,
    birth_date: client.birth_date,
    lead_origin: client.lead_origin,
    total_spent_history: client.total_spent_history,
    match_score: client.match_score,
  });

  const summarizeProject = (project) => ({
    id: project.id,
    client_id: project.client_id,
    client_name: project.client_name,
    description: typeof project.description === 'string' ? project.description.slice(0, 180) : project.description,
    style: project.style,
    pipeline_stage: project.pipeline_stage,
    session_date: project.session_date,
    evaluation_date: project.evaluation_date,
    closing_date: project.closing_date,
    tattoo_date: project.tattoo_date,
    revision_date: project.revision_date,
    post_sale_contact_date: project.post_sale_contact_date,
    total_value: project.total_value,
    total_value_confirmed_value: project.total_value_confirmed_value,
    deposit_confirmed: project.deposit_confirmed,
    needs_retouch: project.needs_retouch,
    attendance_status: project.attendance_status,
    post_sale_status: project.post_sale_status,
    stage_updated_at: project.stage_updated_at,
  });

  const summarizeFollowUpTask = (task) => ({
    id: task.id,
    project_id: task.project_id,
    client_name: task.client_name,
    follow_up_type: task.follow_up_type,
    step_number: task.step_number,
    step_label: task.step_label,
    due_date: task.due_date,
    status: task.status,
    message: task.message,
  });

  const searchProjectsByMessage = (content, projects = [], matchedClients = []) => {
    const normalizedContent = normalizeText(content);
    const searchTerms = getSearchTerms(content);
    const matchedClientIds = new Set(matchedClients.flatMap(getClientIdentifiers));

    return projects
      .map((project) => {
        const normalizedClientName = normalizeText(project.client_name);
        const normalizedDescription = normalizeText(project.description);
        const normalizedStyle = normalizeText(project.style);
        const matchedTerms = searchTerms.filter((term) => (
          normalizedClientName.includes(term) ||
          normalizedDescription.includes(term) ||
          normalizedStyle.includes(term)
        )).length;
        const exactPhraseMatch = normalizedClientName.includes(normalizedContent) || normalizedDescription.includes(normalizedContent);
        const clientMatch = matchedClientIds.has(project.client_id);
        const score = (exactPhraseMatch ? 100 : 0) + matchedTerms + (clientMatch ? 50 : 0);

        return { project, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_MATCHED_PROJECTS)
      .map(({ project }) => project);
  };

  const buildFinancialKnowledge = (projects = [], settings = {}) => {
    const paymentLabels = {
      pix: settings?.pix_label || 'Pix',
      cash: settings?.cash_label || 'Dinheiro',
      cardNoInterest: settings?.card_no_interest_label || 'Cartão sem juros',
      cardWithInterest: settings?.card_with_interest_label || 'Cartão com juros',
      other: settings?.other_label || 'Outros',
    };

    const today = toLocalDate(new Date());
    const getProjectValue = (project) => Number(project.total_value_confirmed_value) || Number(project.total_value) || 0;
    const getPaymentMethod = (project) => project.total_value_confirmed_method || project.payment_method || null;
    const getProjectDate = (project) => {
      if (project.total_value_confirmed_at) return toLocalDate(project.total_value_confirmed_at);
      if (project.payment_date) return project.payment_date;
      if (project.session_date) return toLocalDate(project.session_date);
      if (project.tattoo_date) return project.tattoo_date;
      return null;
    };

    const todaysProjects = projects.filter((project) => getProjectValue(project) > 0 && getProjectDate(project) === today);

    return {
      financial_settings_snapshot: {
        pix_cash_commission: settings?.pix_cash_commission ?? 50,
        card_no_interest_commission: settings?.card_no_interest_commission ?? settings?.debit_card_commission ?? 50,
        card_with_interest_commission: settings?.card_with_interest_commission ?? settings?.installment_credit_commission ?? 50,
        other_commission: settings?.other_commission ?? settings?.pix_cash_commission ?? 50,
        labels: paymentLabels,
      },
      calculation_rules: {
        revenue_rule: 'Faturamento usa o valor total confirmado quando existir; se não existir, usa o valor total do projeto.',
        profit_rule: 'Lucro/comissão usa a forma de pagamento do valor total da tatuagem e aplica o percentual configurado para essa forma.',
        payment_method_rules: {
          pix_and_cash: `Pix e ${paymentLabels.cash} usam pix_cash_commission.`,
          card_no_interest: `${paymentLabels.cardNoInterest} usa card_no_interest_commission.`,
          card_with_interest: `${paymentLabels.cardWithInterest} usa card_with_interest_commission.`,
          other: `${paymentLabels.other} usa other_commission.`,
          legacy_credit: 'Cartão Crédito legado com mais de 1 parcela usa cartão com juros; com 1 parcela usa cartão sem juros.',
          legacy_debit: 'Cartão Débito legado usa cartão sem juros.',
          custom_labels: 'Nomes personalizados das formas de pagamento seguem a mesma regra da categoria configurada.',
        },
        deposit_rule: 'O sinal pode ter forma de pagamento própria. Quando a pergunta for sobre o lucro principal da tatuagem, vale a forma de pagamento do valor total. Quando a pergunta for sobre o sinal, vale a forma de pagamento do sinal.',
      },
      calculation_examples: todaysProjects.slice(0, 10).map((project) => {
        const value = getProjectValue(project);
        const method = getPaymentMethod(project);
        const rate = getCommissionRate(method, project.installments, settings);
        return {
          client_name: project.client_name,
          project_description: project.description,
          reference_date: getProjectDate(project),
          total_value_used: value,
          payment_method_used: method,
          installments: project.installments || 1,
          commission_percentage: Number((rate * 100).toFixed(2)),
          estimated_profit: Number((value * rate).toFixed(2)),
        };
      }),
      daily_financial_context: {
        reference_date: today,
        projects_considered: todaysProjects.slice(0, 20).map((project) => {
          const value = getProjectValue(project);
          const method = getPaymentMethod(project);
          const rate = getCommissionRate(method, project.installments, settings);
          return {
            client_name: project.client_name,
            description: project.description,
            value_used: value,
            payment_method_used: method,
            commission_percentage: Number((rate * 100).toFixed(2)),
            profit_value: Number((value * rate).toFixed(2)),
          };
        }),
      },
    };
  };

  const buildAnalysisSummary = (projects = [], clients = []) => {
    const visits = projects.filter((project) => Boolean(project.evaluation_date));
    const closedProjects = projects.filter((project) => Boolean(project.closing_date));
    const completedProjects = projects.filter((project) => Boolean(project.tattoo_date));
    const paidProjects = projects.filter((project) => Number(project.total_value_confirmed_value) > 0 || Number(project.total_value) > 0);
    const totalRevenue = paidProjects.reduce((sum, project) => sum + (Number(project.total_value_confirmed_value) || Number(project.total_value) || 0), 0);
    const averageTicket = completedProjects.length
      ? completedProjects.reduce((sum, project) => sum + (Number(project.total_value_confirmed_value) || Number(project.total_value) || 0), 0) / completedProjects.length
      : 0;

    const clientsByOrigin = clients.reduce((acc, client) => {
      const origin = client.lead_origin || 'Não definido';
      acc[origin] = (acc[origin] || 0) + 1;
      return acc;
    }, {});

    const projectsByStage = projects.reduce((acc, project) => {
      const stage = project.pipeline_stage || 'sem_etapa';
      acc[stage] = (acc[stage] || 0) + 1;
      return acc;
    }, {});

    const stylesByRevenue = projects.reduce((acc, project) => {
      const style = project.style || 'Não definido';
      if (!acc[style]) {
        acc[style] = { quantity: 0, revenue: 0 };
      }
      acc[style].quantity += 1;
      acc[style].revenue += Number(project.total_value_confirmed_value) || Number(project.total_value) || 0;
      return acc;
    }, {});

    return {
      totals: {
        clients: clients.length,
        projects: projects.length,
        visits: visits.length,
        closed_projects: closedProjects.length,
        completed_projects: completedProjects.length,
        total_revenue: totalRevenue,
        average_ticket: averageTicket,
        conversion_rate: visits.length ? Number(((closedProjects.length / visits.length) * 100).toFixed(1)) : 0,
      },
      top_origins: Object.entries(clientsByOrigin)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([origin, quantity]) => ({ origin, quantity })),
      projects_by_stage: Object.entries(projectsByStage)
        .sort((a, b) => b[1] - a[1])
        .map(([stage, quantity]) => ({ stage, quantity })),
      top_styles: Object.entries(stylesByRevenue)
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, 5)
        .map(([style, stats]) => ({
          style,
          quantity: stats.quantity,
          revenue: stats.revenue,
        })),
    };
  };

  const getClientIdentifiers = (client) => ([
    client?.id,
    client?.client_id,
    client?.codigo_sequencial?.toString(),
    client?.codigo_sequencial ? `CLI${client.codigo_sequencial}` : null,
  ].filter((value) => value && value !== 'NaN'));

  const dedupeById = (items = []) => Array.from(
    new Map(items.filter(Boolean).map((item) => [item.id, item])).values()
  );

  const loadMatchedProjects = async (clientSearchResults = []) => {
    const identifiers = Array.from(new Set(clientSearchResults.flatMap(getClientIdentifiers)));

    if (identifiers.length === 0) {
      return [];
    }

    const projectGroups = await Promise.all(
      identifiers.map((clientId) => base44.entities.Project.filter({ client_id: clientId }, '-updated_date', 20))
    );

    return dedupeById(projectGroups.flat());
  };

  const buildActiveDatabaseContext = async (content = '') => {
    const [allProjects, allClients, allFollowUpTasks, allFinancialSettings] = await Promise.all([
      loadAllEntities(base44.entities.Project),
      loadAllEntities(base44.entities.Client),
      loadAllEntities(base44.entities.FollowUpTask),
      loadAllEntities(base44.entities.FinancialSettings),
    ]);

    const clientSearchResults = await searchClientsByMessage(content, allClients);
    const matchedProjectsFromClients = await loadMatchedProjects(clientSearchResults);
    const matchedProjectsFromQuery = searchProjectsByMessage(content, allProjects, clientSearchResults);
    const matchedProjects = dedupeById([...(matchedProjectsFromClients || []), ...(matchedProjectsFromQuery || [])]).slice(0, MAX_MATCHED_PROJECTS);
    const matchedClients = clientSearchResults.map(summarizeClient);
    const today = toLocalDate(new Date());
    const pendingFollowUpTasks = (allFollowUpTasks || []).filter((task) => task.status === 'pending');
    const matchedProjectIds = new Set(matchedProjects.map((project) => project.id));
    const matchedProjectFollowUpTasks = pendingFollowUpTasks
      .filter((task) => matchedProjectIds.has(task.project_id))
      .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
      .slice(0, 12);
    const dailyProjects = allProjects.filter((project) => {
      const relevantDates = [
        project.session_date,
        project.evaluation_date,
        project.tattoo_date,
        project.revision_date,
        project.post_sale_contact_date,
        project.stage_updated_at,
      ].filter(Boolean);

      return relevantDates.some((value) => toLocalDate(value) === today);
    }).slice(0, MAX_DAILY_PROJECTS);
    const dueFollowUpTasks = pendingFollowUpTasks
      .filter((task) => task.due_date && task.due_date <= today)
      .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
      .slice(0, 20);
    const appAnalysis = buildAnalysisSummary(allProjects || [], allClients || []);
    const financialKnowledge = buildFinancialKnowledge(allProjects || [], allFinancialSettings?.[0] || {});

    return JSON.stringify({
      generated_at: new Date().toISOString(),
      data_mode: getPreviewDataMode(),
      knowledge_scope: ['clients', 'projects', 'follow_up_tasks', 'app_analysis', 'financial_rules', 'usability_rules', 'developer_commands'],
      search_scope: 'full_database',
      database_totals: {
        clients: allClients.length,
        projects: allProjects.length,
        follow_up_tasks: allFollowUpTasks.length,
      },
      query_focus: content,
      client_search_results: matchedClients,
      matched_clients: matchedClients,
      matched_client_projects: matchedProjects.map(summarizeProject),
      matched_project_follow_up_tasks: matchedProjectFollowUpTasks.map(summarizeFollowUpTask),
      follow_up_tasks: pendingFollowUpTasks.slice(0, 40).map(summarizeFollowUpTask),
      app_analysis: appAnalysis,
      ...financialKnowledge,
      daily_decision_context: {
        reference_date: today,
        projects: dailyProjects.map(summarizeProject),
        follow_up_tasks: dueFollowUpTasks.map(summarizeFollowUpTask),
      },
    });
  };

  const sendContextualMessage = async (targetConversation, content, options = {}) => {
    const activeContext = await buildActiveDatabaseContext(content);
    const promptContent = options.hidden ? `${HIDDEN_REQUEST_PREFIX}${content}` : content;

    await base44.agents.addMessage(targetConversation, {
      role: 'user',
      content: `${CONTEXT_INSTRUCTION}\n\n[CONTEXTO_ATIVO]\n${activeContext}\n[/CONTEXTO_ATIVO]\n\nSolicitação: ${promptContent}`,
    });
  };

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    setIsBooting(true);

    const loadConversation = async () => {
      const storageKey = getEnvironmentConversationKey();
      const savedConversationId = localStorage.getItem(storageKey);

      let currentConversation = null;

      if (savedConversationId) {
        currentConversation = await base44.agents.getConversation(savedConversationId).catch(() => null);
      }

      if (!currentConversation) {
        currentConversation = await base44.agents.createConversation({
          agent_name: AGENT_NAME,
          metadata: {
            name: `Desk IA • ${new Date().toLocaleString('pt-BR')}`,
            description: 'Assistente interno do estúdio',
          },
        });
      }

      localStorage.setItem(storageKey, currentConversation.id);

      if (!active) return;

      setConversation(currentConversation);
      setMessages(currentConversation.messages || []);
      setDraft('');
      setIsBooting(false);
    };

    loadConversation();

    return () => {
      active = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!conversation?.id || !isOpen) return;

    let active = true;

    const refreshConversation = async () => {
      const freshConversation = await base44.agents.getConversation(conversation.id).catch(() => null);

      if (!active || !freshConversation) return;

      setConversation(freshConversation);
      setMessages(freshConversation.messages || []);
    };

    refreshConversation();
    const intervalId = window.setInterval(refreshConversation, 2000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [conversation?.id, isOpen]);

  useEffect(() => {
    const currentBootstrapWindowKey = getCurrentBootstrapWindowKey();
    const bootstrapStorageKey = getBootstrapStorageKey();
    const storedBootstrapWindowKey = localStorage.getItem(bootstrapStorageKey);

    if (!conversation?.id) {
      return;
    }

    if (storedBootstrapWindowKey && storedBootstrapWindowKey !== currentBootstrapWindowKey) {
      localStorage.removeItem(getEnvironmentConversationKey());
      if (conversation.messages?.length || messages.length) {
        handleNewConversation();
        return;
      }
    }

    const alreadyBootstrappedInWindow = storedBootstrapWindowKey === currentBootstrapWindowKey;

    if (messages.length > 0 || bootstrappedConversations.current.has(conversation.id) || alreadyBootstrappedInWindow) {
      return;
    }

    bootstrappedConversations.current.add(conversation.id);
    localStorage.setItem(bootstrapStorageKey, currentBootstrapWindowKey);
    sendContextualMessage(conversation, BOOTSTRAP_MESSAGE, { hidden: true });
  }, [conversation, messages.length]);

  const scrollToBottom = (behavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior });
  };

  const handleScroll = () => {
    const element = scrollAreaRef.current;
    if (!element) return;

    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom < 80;
  };

  useEffect(() => {
    if (!isOpen) return;
    shouldAutoScrollRef.current = true;
    scrollToBottom('auto');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !shouldAutoScrollRef.current) return;
    scrollToBottom(isSending ? 'smooth' : 'auto');
  }, [visibleMessages, isSending, isOpen]);

  const handleSend = async () => {
    const content = draft.trim();

    if (!content || !conversation || isSending) return;

    setDraft('');
    shouldAutoScrollRef.current = true;
    setIsSending(true);

    try {
      await sendContextualMessage(conversation, content);
    } catch (error) {
      console.error('Desk IA send failed:', error);
      setDraft(content);
    } finally {
      setIsSending(false);
    }
  };

  const createClientRecord = async (data) => {
    const allClients = await base44.entities.Client.list('-created_date');
    const maxSequential = allClients.reduce((max, client) => {
      const seq = client.codigo_sequencial || 0;
      return seq > max ? seq : max;
    }, 0);

    const nextSequential = maxSequential + 1;

    return base44.entities.Client.create({
      ...data,
      client_id: `CLI${nextSequential}`,
      codigo_sequencial: nextSequential,
    });
  };

  function normalizeText(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  const findClientByName = async (name) => {
    if (!name) return null;

    const targetName = normalizeText(name);
    const clients = await loadAllEntities(base44.entities.Client);

    return clients.find((client) => normalizeText(client.name) === targetName) || null;
  };

  const createProjectRecord = async (data) => {
    const resolvedClient = data.client_id
      ? null
      : await findClientByName(data.client_name);

    const payload = {
      ...data,
      client_id: data.client_id || resolvedClient?.id,
      client_name: data.client_name || resolvedClient?.name || data.client_name,
      description: typeof data.description === 'string' ? data.description.trim() : data.description,
    };

    if (!payload.client_id) {
      throw new Error('CLIENT_REQUIRED');
    }

    if (!payload.description) {
      throw new Error('DESCRIPTION_REQUIRED');
    }

    return base44.entities.Project.create(payload);
  };

  const updateProjectStageRecord = async (action) => {
    const projects = await base44.entities.Project.filter({ id: action.project_id });
    const project = projects[0];

    if (!project) {
      throw new Error('Projeto não encontrado');
    }

    if (project.pipeline_stage !== action.pipeline_stage) {
      await base44.entities.ProjectStageHistory.create({
        project_id: project.id,
        pipeline_stage: action.pipeline_stage,
        session_date: project.session_date,
        changed_at: new Date().toISOString(),
      });
    }

    return base44.entities.Project.update(project.id, {
      ...project,
      pipeline_stage: action.pipeline_stage,
      stage_updated_at: new Date().toISOString(),
    });
  };

  const normalizeLocalDateTime = (value) => {
    if (!value) return value;
    let normalized = value;
    if (!normalized.includes('T')) normalized = `${normalized}T00:00:00`;
    if (normalized.length === 16) normalized = `${normalized}:00`;
    if (!normalized.includes('Z') && !normalized.includes('+') && !normalized.includes('-', 10)) {
      normalized = `${normalized}-03:00`;
    }
    return normalized;
  };

  const scheduleRevisionRecord = async (action) => {
    const projects = await base44.entities.Project.filter({ id: action.project_id });
    const project = projects[0];

    if (!project) {
      throw new Error('Projeto não encontrado');
    }

    if (!action.revision_datetime) {
      throw new Error('REVISION_DATA_REQUIRED');
    }

    if (action.pipeline_stage && project.pipeline_stage !== action.pipeline_stage) {
      await base44.entities.ProjectStageHistory.create({
        project_id: project.id,
        pipeline_stage: action.pipeline_stage,
        session_date: project.session_date,
        changed_at: new Date().toISOString(),
      });
    }

    const normalizedRevisionDateTime = normalizeLocalDateTime(action.revision_datetime);

    const updateData = {
      ...project,
      revision_date: normalizedRevisionDateTime.slice(0, 10),
      revision_datetime: normalizedRevisionDateTime,
      revision_duration_minutes: action.revision_duration_minutes || project.revision_duration_minutes || 60,
      pipeline_stage: action.pipeline_stage || project.pipeline_stage,
      stage_updated_at: action.pipeline_stage && project.pipeline_stage !== action.pipeline_stage
        ? new Date().toISOString()
        : project.stage_updated_at,
    };

    const updatedProject = await base44.entities.Project.update(project.id, updateData);

    await base44.functions.invoke('scheduleFollowUpEvent', {
      projectId: project.id,
      eventType: 'revisao',
    });

    if (project.pos_venda_calendar_event_id) {
      await base44.functions.invoke('scheduleFollowUpEvent', {
        projectId: project.id,
        eventType: 'pos_venda',
      });
    }

    return updatedProject;
  };

  const executeConfirmedAction = async (action) => {
    if (action.type === 'create_client') {
      if (!action.data?.name || !action.data?.whatsapp) {
        throw new Error('CLIENT_DATA_REQUIRED');
      }
      return createClientRecord(action.data || {});
    }

    if (action.type === 'create_project') {
      return createProjectRecord(action.data || {});
    }

    if (action.type === 'create_client_and_project') {
      if (!action.client?.name || !action.client?.whatsapp) {
        throw new Error('CLIENT_DATA_REQUIRED');
      }
      const createdClient = await createClientRecord(action.client || {});
      const createdProject = await createProjectRecord({
        ...(action.project || {}),
        client_id: createdClient.id,
        client_name: createdClient.name,
      });

      return { client: createdClient, project: createdProject };
    }

    if (action.type === 'update_project_stage') {
      if (!action.project_id || !action.pipeline_stage) {
        throw new Error('STAGE_DATA_REQUIRED');
      }
      return updateProjectStageRecord(action);
    }

    if (action.type === 'schedule_revision') {
      if (!action.project_id || !action.revision_datetime) {
        throw new Error('REVISION_DATA_REQUIRED');
      }
      return scheduleRevisionRecord(action);
    }

    if (action.type === 'create_note') {
      const data = action.data || {};
      if (!data.title || !String(data.title).trim()) {
        throw new Error('NOTE_TITLE_REQUIRED');
      }
      if (data.is_task && !data.due_date) {
        throw new Error('NOTE_DUE_DATE_REQUIRED');
      }
      return base44.entities.Note.create({
        title: String(data.title).trim(),
        content: data.content || '',
        category: data.category || 'Outros',
        is_task: Boolean(data.is_task),
        due_date: data.due_date || undefined,
        priority: data.priority || 'medium',
        status: 'pending',
        pinned: Boolean(data.pinned),
        source: 'manual',
        client_id: data.client_id || undefined,
        client_name: data.client_name || undefined,
      });
    }

    throw new Error('Ação não suportada');
  };

  const handleConfirmAction = async (message, action, actionKey) => {
    setActionStates((prev) => ({ ...prev, [actionKey]: 'loading' }));
    setActionFeedback((prev) => ({ ...prev, [actionKey]: '' }));

    try {
      await executeConfirmedAction(action);
      await queryClient.invalidateQueries();
      setActionStates((prev) => ({ ...prev, [actionKey]: 'done' }));
      setActionFeedback((prev) => ({
        ...prev,
        [actionKey]: 'Ação concluída com sucesso.'
      }));
    } catch (error) {
      setActionStates((prev) => ({ ...prev, [actionKey]: 'error' }));

      const missingInfoMessage = error?.message === 'CLIENT_REQUIRED'
        ? 'Confirme o cliente correto ou cadastre o contato primeiro.'
        : error?.message === 'DESCRIPTION_REQUIRED'
          ? 'Falta a descrição do projeto para continuar.'
          : error?.message === 'CLIENT_DATA_REQUIRED'
            ? 'Faltam nome e WhatsApp do cliente.'
            : error?.message === 'STAGE_DATA_REQUIRED'
              ? 'Faltam os dados da etapa que deve ser alterada.'
              : error?.message === 'REVISION_DATA_REQUIRED'
                ? 'Faltam data e hora da revisão para concluir o agendamento.'
                : error?.message === 'NOTE_TITLE_REQUIRED'
                  ? 'Falta o título da nota para criá-la no InkBoard.'
                  : error?.message === 'NOTE_DUE_DATE_REQUIRED'
                    ? 'Falta a data de vencimento da tarefa.'
                    : 'Não foi possível concluir a ação com os dados atuais.';

      setActionFeedback((prev) => ({
        ...prev,
        [actionKey]: missingInfoMessage,
      }));
    }
  };

  const handleDismissAction = (actionKey) => {
    setActionStates((prev) => ({ ...prev, [actionKey]: 'dismissed' }));
  };

  const handleNewConversation = async () => {
    setIsBooting(true);
    const nextConversation = await base44.agents.createConversation({
      agent_name: AGENT_NAME,
      metadata: {
        name: `Desk IA • ${new Date().toLocaleString('pt-BR')}`,
        description: 'Assistente interno do estúdio',
      },
    });

    localStorage.setItem(getEnvironmentConversationKey(), nextConversation.id);
    setConversation(nextConversation);
    setMessages(nextConversation.messages || []);
    setDraft('');
    setActionStates({});
    setIsBooting(false);
  };

  const isAssistantWorking =
    isSending ||
    messages.some((message) =>
      message.tool_calls?.some((toolCall) => ['pending', 'running', 'in_progress'].includes(toolCall.status))
    );

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-4 z-[70] h-[min(68vh,640px)] w-[min(420px,calc(100vw-1.5rem))] overflow-hidden rounded-[30px] border border-[#E5DDD2] bg-[#FCF8F4] shadow-[0_24px_70px_rgba(24,21,27,0.22)]"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[#E5DDD2] bg-[linear-gradient(135deg,#231F20_0%,#18151B_100%)] px-4 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-[#E7C990]">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Desk IA</p>
                  <p className="text-[11px] leading-none text-white/65 whitespace-nowrap">Assistente com Inteligência Artificial</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={base44.agents.getWhatsAppConnectURL(AGENT_NAME)}
                  target="_blank"
                  rel="noreferrer"
                  title="Falar com o assistente no WhatsApp"
                  className="flex h-9 items-center gap-1.5 rounded-2xl bg-[#25D366] px-3 text-[11px] font-semibold text-[#0B2E13] transition-opacity hover:opacity-90"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-9 w-9 rounded-2xl text-white hover:bg-white/10 hover:text-white"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNewConversation}
                  className="h-9 w-9 rounded-2xl text-white hover:bg-white/10 hover:text-white"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-9 w-9 rounded-2xl text-white hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex h-[calc(100%-72px)] flex-col">
              <div
                ref={scrollAreaRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-4 py-4"
              >
                {isBooting ? (
                  <div className="flex h-full items-center justify-center gap-3 text-sm text-[#8B837B]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Abrindo seu assistente...
                  </div>
                ) : (
                  <div className="space-y-4">
                    {visibleMessages.length === 0 && !isAssistantWorking && (
                      <div className="rounded-3xl border border-dashed border-[#D9CCBB] bg-[#FFF9F2] px-5 py-6 text-sm text-[#6E6258]">
                        Peça um resumo do dia, follow-ups pendentes, clientes prioritários ou próximos atendimentos.
                      </div>
                    )}

                    {visibleMessages.map((message, index) => (
                      <StudioFlowMessageBubble
                        key={`${message.role}-${message.created_date || index}`}
                        message={message}
                        actionStates={actionStates}
                        actionFeedback={actionFeedback}
                        onConfirmAction={handleConfirmAction}
                        onDismissAction={handleDismissAction}
                      />
                    ))}

                    {isAssistantWorking && (
                      <div className="flex justify-start">
                        <div className="rounded-3xl border border-[#E5DDD2] bg-white px-4 py-3 text-sm text-[#6E6258] shadow-sm">
                          Desk IA está pensando...
                        </div>
                      </div>
                    )}

                    <div ref={bottomRef} />
                  </div>
                )}
              </div>

              <div className="border-t border-[#E5DDD2] bg-[#F8F2EA] p-4">
                <StudioFlowComposer
                  value={draft}
                  onChange={setDraft}
                  onSend={handleSend}
                  disabled={isBooting || isSending || !conversation}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isOpen && (
        <div className="group fixed bottom-40 right-5 z-[70] sm:bottom-44">
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setIsOpen(true)}
            className="flex h-14 w-14 items-center justify-center rounded-full border border-[#E5DDD2] bg-[linear-gradient(135deg,#231F20_0%,#18151B_100%)] text-[#E7C990] shadow-[0_16px_40px_rgba(24,21,27,0.22)]"
            aria-label="Abrir Desk IA"
          >
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
              <Bot className="h-5 w-5" />
              <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-[#C8A66B] ring-2 ring-[#231F20]" />
            </div>
          </motion.button>

          <div className="pointer-events-none absolute right-16 top-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <div className="whitespace-nowrap rounded-2xl bg-[#231F20] px-4 py-2 text-xs font-medium text-white shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
              Abrir chat
            </div>
          </div>
        </div>
      )}
    </>
  );
}