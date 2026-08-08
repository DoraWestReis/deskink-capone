import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Calendar, MapPin, TrendingUp, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import {
  getClientAccumulatedProfit,
  getClientCompletedProjects,
  getClientProposalCount,
  getLatestClientProject,
} from '@/components/utils/clientMetrics';

const leadOriginColors = {
  'Indicação': 'bg-blue-50 text-blue-600 border border-blue-100',
  'Instagram': 'bg-pink-50 text-pink-600 border border-pink-100',
  'TikTok': 'bg-purple-50 text-purple-600 border border-purple-100',
  'Google': 'bg-green-50 text-green-600 border border-green-100',
  'Repasse Studio': 'bg-amber-50 text-amber-600 border border-amber-100',
  'Network': 'bg-indigo-50 text-indigo-600 border border-indigo-100',
  'Tráfego': 'bg-cyan-50 text-cyan-600 border border-cyan-100',
  'Outros': 'bg-slate-50 text-slate-600 border border-slate-100',
  // Legacy values for existing data
  'Indicação Cliente': 'bg-blue-50 text-blue-600 border border-blue-100',
  'Facebook': 'bg-indigo-50 text-indigo-600 border border-indigo-100',
  'Walk-in': 'bg-amber-50 text-amber-600 border border-amber-100',
  'Repasse Capone': 'bg-amber-50 text-amber-600 border border-amber-100',
  'Outro': 'bg-slate-50 text-slate-600 border border-slate-100',
};

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

// Stages that need a "pending budget" alert
const pendingBudgetStages = ['followup_orcamento', 'followup_fechamento', 'aguardando_sinal'];

export default function ClientCard({ client, clientProjects, financialSettings, index, isRecurrent }) {
  const completedProjects = getClientCompletedProjects(clientProjects);
  const salesCount = completedProjects.length;
  const proposalCount = getClientProposalCount(clientProjects);
  const lastProject = getLatestClientProject(clientProjects);
  const lastStage = lastProject?.pipeline_stage;
  const hasPendingBudget = lastProject && pendingBudgetStages.includes(lastStage);
  const pendingValue = hasPendingBudget ? lastProject.total_value : 0;
  const accumulatedProfit = getClientAccumulatedProfit(clientProjects, financialSettings);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0
    }).format(value || 0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <div className="relative bg-white rounded-[20px] p-6 border-0 shadow-[0_4px_15px_rgba(0,0,0,0.05)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)] transition-all duration-300">
        
        {/* Badge etapa atual */}
        <div className="absolute top-4 right-4">
          {lastProject ? (
            <Badge className={`text-[10px] font-light px-2 py-0.5 border ${stageColors[lastStage] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
              {stageLabels[lastStage] || lastStage}
            </Badge>
          ) : (
            <Badge className="bg-slate-50 text-slate-400 border border-slate-200 text-[10px] font-light px-2 py-0.5">
              Nenhum projeto
            </Badge>
          )}
        </div>

        {/* Alerta de orçamento pendente */}
        {hasPendingBudget && pendingValue > 0 && (
          <div className="mx-0 mb-1 mt-1 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0" strokeWidth={1.5} />
            <p className="text-[11px] text-orange-700 font-light">
              Orçamento de <span className="font-normal">{formatCurrency(pendingValue)}</span> aguardando confirmação
            </p>
          </div>
        )}

        {/* Client info */}
        <div className="flex items-start gap-4 mb-5">
          <div className="w-14 h-14 bg-[#2D2D2D] rounded-xl flex items-center justify-center text-white font-light text-lg flex-shrink-0">
            {client.name?.substring(0, 2).toUpperCase() || 'CL'}
          </div>
          <div className="flex-1 min-w-0 pr-8">
            <h3 className="font-light text-[#2D2D2D] truncate">{client.name}</h3>
            <p className="text-[10px] text-[#888888] font-light mb-1">
              ID: {client.codigo_sequencial || client.id?.substring(0, 8)}
            </p>
            <p className="text-xs text-[#888888] font-light flex items-center gap-1">
              <MessageCircle className="w-3 h-3" strokeWidth={1.5} />
              {client.whatsapp}
            </p>
            {client.birth_date && (
              <p className="text-xs text-[#888888] font-light flex items-center gap-1 mt-0.5">
                <Calendar className="w-3 h-3" strokeWidth={1.5} />
                {format(new Date(client.birth_date), 'dd/MM/yyyy')}
              </p>
            )}
          </div>
        </div>

        {/* Lead origin + Recurrent badge + Conversion line */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5 flex-wrap">
            {client.lead_origin && (
              <Badge className={`text-xs font-light border-0 ${leadOriginColors[client.lead_origin] || leadOriginColors['Outro']}`}>
                <MapPin className="w-3 h-3 mr-1" strokeWidth={1.5} />
                {client.lead_origin}
              </Badge>
            )}
            {isRecurrent && (
              <Badge className="text-xs font-light bg-emerald-50 text-emerald-600 border border-emerald-100">
                ↻ Recorrente
              </Badge>
            )}
          </div>
          {proposalCount > 0 && (
            <p className="text-[11px] text-[#888888] font-light">
              Fechamentos: <span className="text-[#2D2D2D] font-normal">{salesCount}</span> de <span className="text-[#2D2D2D] font-normal">{proposalCount}</span> orçamentos
            </p>
          )}
        </div>

        {/* Footer: 3 columns */}
        <div className="pt-4 border-t border-[#E8E5E0] grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[10px] text-[#888888] font-light">Orçamentos</p>
            <p className="text-lg font-light text-[#2D2D2D]">{proposalCount}</p>
          </div>
          <div>
            <p className="text-[10px] text-[#888888] font-light">Vendas</p>
            <p className="text-lg font-light text-[#A0A486]">{salesCount}</p>
          </div>
          <div>
            <p className="text-[10px] text-[#888888] font-light">Seu Lucro</p>
            <p className="text-sm font-normal text-[#2D2D2D]">{formatCurrency(accumulatedProfit)}</p>
            <p className="text-[9px] text-[#A0A486] font-light leading-tight">Lucro gerado para você</p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 flex gap-2">
          <Link 
            to={createPageUrl(`ClientDetails?id=${client.id}`)}
            className="flex-1"
          >
            <Button variant="outline" size="sm" className="w-full">
              Ver CRM
            </Button>
          </Link>
          <a 
            href={`https://wa.me/55${client.whatsapp?.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button size="sm" className="bg-[#25D366] hover:bg-[#20BD5A] rounded-xl w-9 h-9 p-0">
              <MessageCircle className="w-4 h-4" />
            </Button>
          </a>
        </div>
      </div>
    </motion.div>
  );
}