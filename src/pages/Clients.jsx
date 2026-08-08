import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus, User, Filter, CalendarDays } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

import BottomNav from '@/components/ui/BottomNav';
import FloatingActionButton from '@/components/ui/FloatingActionButton';
import Footer from '@/components/ui/Footer';
import ClientListItem from '@/components/clients/ClientListItem';
import { getClientPaidAmount } from '@/components/utils/clientMetrics';

const stageLabels = {
  novo_contato: 'Novo Contato',
  agendado_orcamento_presencial: 'Orç. Presencial',
  followup_fechamento: 'Follow-up Fechamento',
  perdido: 'Perdido',
  followup_orcamento: 'Follow-up Orçamento',
  aguardando_sinal: 'Aguardando Sinal',
  agendado: 'Agendado',
  revisao: 'Revisão',
  pos_venda: 'Pós-Venda',
  concluido: 'Concluído',
};

export default function Clients() {
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: financialSettings = {} } = useQuery({
    queryKey: ['financial-settings'],
    queryFn: async () => {
      const settings = await base44.entities.FinancialSettings.list();
      return settings[0] || {};
    },
    staleTime: 10 * 60 * 1000,
  });

  const getClientProjects_ = (client) => {
    const clientIdentifiers = [
      client.id,
      client.client_id,
      client.codigo_sequencial?.toString(),
      `CLI${client.codigo_sequencial}`
    ].filter(id => id && id !== 'NaN');
    return projects.filter(p => clientIdentifiers.includes(p.client_id));
  };

  const filteredClients = useMemo(() => {
    let result = clients.filter(c =>
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.whatsapp?.includes(searchQuery) ||
      c.cpf?.includes(searchQuery)
    );

    if (stageFilter !== 'all') {
      const clientIdsWithStage = new Set();
      projects.forEach(p => {
        if (p.pipeline_stage === stageFilter) {
          clientIdsWithStage.add(p.client_id);
        }
      });
      result = result.filter(c => {
        const ids = [c.id, c.client_id, c.codigo_sequencial?.toString(), `CLI${c.codigo_sequencial}`].filter(Boolean);
        return ids.some(id => clientIdsWithStage.has(id));
      });
    }

    if (dateFrom || dateTo) {
      result = result.filter(c => {
        const reg = c.registration_date ? new Date(`${c.registration_date}T12:00:00`) : (c.created_date ? new Date(c.created_date) : null);
        if (!reg) return false;
        if (dateFrom && reg < dateFrom) return false;
        if (dateTo) {
          const end = new Date(dateTo);
          end.setHours(23, 59, 59, 999);
          if (reg > end) return false;
        }
        return true;
      });
    }

    // Ordem alfabética ignorando espaços iniciais
    result.sort((a, b) => (a.name || '').trim().localeCompare((b.name || '').trim(), 'pt-BR'));

    return result;
  }, [clients, projects, searchQuery, stageFilter, dateFrom, dateTo]);

  const getClientProjects = (client) => {
    const clientIdentifiers = [
      client.id,
      client.client_id,
      client.codigo_sequencial?.toString(),
      `CLI${client.codigo_sequencial}`
    ].filter(id => id && id !== 'NaN');
    
    return projects.filter(p => clientIdentifiers.includes(p.client_id));
  };

  const hydratedClients = filteredClients.map((client) => {
    const clientProjects = getClientProjects(client);
    const computedLtv = getClientPaidAmount(clientProjects);

    return {
      ...client,
      total_spent_history: Math.max(Number(client.total_spent_history) || 0, computedLtv),
      _clientProjects: clientProjects,
    };
  });

  return (
    <div className="min-h-screen bg-[#18151B] pb-[112px]">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[radial-gradient(circle_at_top_left,_rgba(184,154,102,0.22),_transparent_35%),linear-gradient(135deg,#221D25_0%,#18151B_55%,#131017_100%)] backdrop-blur-xl">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-5 sm:py-7">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/50">Relacionamento</p>
              <h1 className="mt-2 text-3xl sm:text-4xl font-display text-white">Clientes</h1>
              <p className="mt-2 text-sm text-white/65">{clients.length} clientes cadastrados para acompanhar com mais clareza.</p>
            </div>
            <Link to={createPageUrl('NewClient')}>
              <Button size="sm" className="rounded-2xl bg-[#B89A66] text-white hover:bg-[#A88959]">
                <Plus className="w-4 h-4 mr-1" strokeWidth={1.5} />
                Novo Cliente
              </Button>
            </Link>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto] lg:items-start">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/45" strokeWidth={1.5} />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome, telefone ou CPF..."
                className="h-11 rounded-2xl border border-white/10 bg-white/5 pl-10 text-white placeholder:text-white/45"
              />
            </div>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 text-sm text-white shadow-none [&>svg]:text-white/60">
                <div className="flex min-w-0 items-center gap-2">
                  <Filter className="w-4 h-4 text-white/60" strokeWidth={1.5} />
                  <span className="truncate"><SelectValue placeholder="Etapa" /></span>
                </div>
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-[#241F26] text-white">
                <SelectItem value="all" className="focus:bg-white/10 focus:text-white">Todas as etapas</SelectItem>
                {Object.entries(stageLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key} className="focus:bg-white/10 focus:text-white">{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtro de data de cadastro */}
            <div className="flex items-center gap-2">
              <span className="hidden lg:block text-xs text-white/50 whitespace-nowrap">Cadastro:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <button className={`flex h-11 items-center gap-2 rounded-2xl border px-3 text-sm transition-colors ${dateFrom ? 'border-[#B89A66] bg-[#B89A66]/20 text-[#B89A66]' : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'}`}>
                    <CalendarDays className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                    <span className="hidden sm:inline">{dateFrom ? format(dateFrom, 'dd/MM/yy', { locale: ptBR }) : 'De'}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 border-white/10 bg-[#241F26]" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    locale={ptBR}
                    className="text-white"
                    classNames={{
                      caption_label: "text-sm font-medium text-white",
                      head_cell: "text-white/50 rounded-md w-8 font-normal text-[0.8rem]",
                      day: "h-8 w-8 p-0 font-normal text-white hover:bg-white/10 rounded-md aria-selected:opacity-100",
                      day_selected: "bg-[#B89A66] text-white hover:bg-[#A88959] hover:text-white focus:bg-[#B89A66] focus:text-white",
                      day_today: "bg-white/10 text-white",
                      day_outside: "text-white/30",
                      nav_button: "h-7 w-7 bg-transparent p-0 text-white/70 hover:text-white hover:bg-white/10 rounded-md border border-white/10",
                    }}
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <button className={`flex h-11 items-center gap-2 rounded-2xl border px-3 text-sm transition-colors ${dateTo ? 'border-[#B89A66] bg-[#B89A66]/20 text-[#B89A66]' : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'}`}>
                    <CalendarDays className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                    <span className="hidden sm:inline">{dateTo ? format(dateTo, 'dd/MM/yy', { locale: ptBR }) : 'Até'}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 border-white/10 bg-[#241F26]" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    locale={ptBR}
                    className="text-white"
                    classNames={{
                      caption_label: "text-sm font-medium text-white",
                      head_cell: "text-white/50 rounded-md w-8 font-normal text-[0.8rem]",
                      day: "h-8 w-8 p-0 font-normal text-white hover:bg-white/10 rounded-md aria-selected:opacity-100",
                      day_selected: "bg-[#B89A66] text-white hover:bg-[#A88959] hover:text-white focus:bg-[#B89A66] focus:text-white",
                      day_today: "bg-white/10 text-white",
                      day_outside: "text-white/30",
                      nav_button: "h-7 w-7 bg-transparent p-0 text-white/70 hover:text-white hover:bg-white/10 rounded-md border border-white/10",
                    }}
                  />
                </PopoverContent>
              </Popover>

              {(dateFrom || dateTo) && (
                <button
                  onClick={() => { setDateFrom(null); setDateTo(null); }}
                  className="flex h-11 items-center rounded-2xl border border-white/10 bg-white/5 px-3 text-xs text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 -mt-2 min-h-[calc(100vh-140px)] rounded-t-[30px] bg-[#F6F1EC]">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
          {isLoading ? (
            <div className="py-12 text-center text-[#7A736C]">Carregando...</div>
          ) : filteredClients.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#FCF8F4]">
                <User className="w-7 h-7 text-[#9A9188]" strokeWidth={1.5} />
              </div>
              <p className="text-[#231F20]">Nenhum cliente encontrado</p>
              {searchQuery && (
                <p className="mt-1 text-sm text-[#7A736C]">Tente ajustar sua busca</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {hydratedClients.map((client) => (
                <ClientListItem
                  key={client.id}
                  client={client}
                  clientProjects={client._clientProjects}
                  financialSettings={financialSettings}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <FloatingActionButton />
      <BottomNav currentPage="Clients" />
      <Footer />
    </div>
  );
}