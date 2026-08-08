import React from 'react';
import { MessageCircle, MapPin, ChevronRight } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Link } from 'react-router-dom';

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
};

const stageColors = {
  novo_contato: 'bg-blue-50 text-blue-700 border-blue-200',
  agendado_orcamento_presencial: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  followup_fechamento: 'bg-orange-50 text-orange-700 border-orange-200',
  perdido: 'bg-red-50 text-red-600 border-red-200',
  followup_orcamento: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  aguardando_sinal: 'bg-amber-50 text-amber-700 border-amber-200',
  agendado: 'bg-green-50 text-green-700 border-green-200',
  revisao: 'bg-purple-50 text-purple-700 border-purple-200',
  pos_venda: 'bg-slate-50 text-slate-600 border-slate-200',
};

import {
  getClientAccumulatedProfit,
  getClientCompletedProjects,
  getClientProposalCount,
  getLatestClientProject,
} from '@/components/utils/clientMetrics';

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(value || 0);

export default function ClientListItem({ client, clientProjects, financialSettings }) {
  const completedProjects = getClientCompletedProjects(clientProjects);
  const salesCount = completedProjects.length;
  const proposalCount = getClientProposalCount(clientProjects);
  const lastProject = getLatestClientProject(clientProjects);
  const lastStage = lastProject?.pipeline_stage;
  const accumulatedProfit = getClientAccumulatedProfit(clientProjects, financialSettings);

  return (
    <Link
      to={`/ClientDetails?id=${client.id}`}
      className="group flex items-center gap-3 rounded-2xl border border-[#E7DED2] bg-[#FCF8F4] px-4 py-3 shadow-[0_8px_24px_rgba(35,31,32,0.05)] transition-all duration-200 hover:shadow-[0_10px_26px_rgba(35,31,32,0.08)]"
    >
      {/* Avatar */}
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#231F20] text-sm text-white">
        {client.name?.substring(0, 2).toUpperCase() || 'CL'}
      </div>

      {/* Name + WhatsApp */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-[#231F20]">{client.name}</h3>
          {clientProjects.length > 1 && (
            <Badge className="text-[9px] font-light px-1.5 py-0 bg-emerald-50 text-emerald-600 border border-emerald-100 flex-shrink-0">
              ↻ Recorrente
            </Badge>
          )}
          {lastProject && (
            <Badge className={`text-[9px] font-light px-1.5 py-0 border ${stageColors[lastStage] || 'bg-slate-50 text-slate-600 border-slate-200'} flex-shrink-0`}>
              {stageLabels[lastStage] || lastStage}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[11px] text-[#7A736C]">
            ID: {client.codigo_sequencial || client.client_id || '-'}
          </span>
          <span className="flex items-center gap-0.5 text-[11px] text-[#7A736C]">
            <MessageCircle className="w-3 h-3" strokeWidth={1.5} />
            {client.whatsapp}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="hidden sm:flex items-center gap-4 flex-shrink-0 text-center">
        <div>
          <p className="text-[9px] text-[#888888] font-light">Orç.</p>
          <p className="text-sm font-light text-[#2D2D2D]">{proposalCount}</p>
        </div>
        <div>
          <p className="text-[9px] text-[#888888] font-light">Vendas</p>
          <p className="text-sm font-light text-[#A0A486]">{salesCount}</p>
        </div>
        <div>
          <p className="text-[9px] text-[#888888] font-light">Lucro</p>
          <p className="text-xs font-normal text-[#2D2D2D]">{formatCurrency(accumulatedProfit)}</p>
        </div>
      </div>

      {/* WhatsApp + Arrow */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            window.open(`https://wa.me/55${client.whatsapp?.replace(/\D/g, '')}`, '_blank', 'noopener,noreferrer');
          }}
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#25D366] transition-colors hover:bg-[#20BD5A]"
          aria-label="Abrir WhatsApp"
        >
          <MessageCircle className="w-3.5 h-3.5 text-white" />
        </button>
        <ChevronRight className="w-4 h-4 text-[#C2B8AA] transition-colors group-hover:text-[#7A736C]" strokeWidth={1.5} />
      </div>
    </Link>
  );
}