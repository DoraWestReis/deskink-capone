import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, MessageCircle, Calendar, CheckCircle2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const stageLabels = {
  agendado: 'Sessão',
  agendado_orcamento_presencial: 'Orçamento Presencial',
};

const stageColors = {
  agendado: 'bg-green-50 text-green-700 border-green-200',
  agendado_orcamento_presencial: 'bg-blue-50 text-blue-700 border-blue-200',
};

export default function TodayAgenda({ projects }) {
  const openWhatsApp = (whatsapp) => {
    if (whatsapp) {
      const phone = whatsapp.replace(/\D/g, '');
      window.open(`https://wa.me/55${phone}`, '_blank');
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return null;
    try {
      return format(new Date(dateStr), 'HH:mm');
    } catch {
      return null;
    }
  };

  const sorted = [...projects]
    .filter((project) => project.pipeline_stage === 'agendado' || project.pipeline_stage === 'agendado_orcamento_presencial')
    .sort((a, b) => {
      const dateA = a.session_date || a.evaluation_date || '';
      const dateB = b.session_date || b.evaluation_date || '';
      return dateA.localeCompare(dateB);
    });

  return (
    <div className="bg-white rounded-[20px] p-5 shadow-[0_4px_15px_rgba(0,0,0,0.05)]">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-9 h-9 bg-[#FAF7F2] rounded-xl flex items-center justify-center">
          <Calendar className="w-4 h-4 text-[#2D2D2D]" strokeWidth={1.5} />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-display font-bold text-[#2D2D2D]">Agenda do Dia</h3>
          <p className="text-xs text-[#888888] font-light">{sorted.length} atividade{sorted.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-6">
          <CheckCircle2 className="w-10 h-10 text-[#A0A486] mx-auto mb-2" strokeWidth={1.5} />
          <p className="text-sm text-[#888888] font-light">Nenhuma atividade agendada para hoje</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {sorted.map(project => {
            const time = formatTime(project.session_date || project.evaluation_date);
            const stage = project.pipeline_stage;
            
            return (
              <div key={project.id} className="bg-[#FAF7F2] rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <Link 
                      to={createPageUrl('ProjectDetails') + `?id=${project.id}`}
                      className="text-sm font-medium text-[#2D2D2D] hover:text-[#A0A486] transition-colors"
                    >
                      {project.client_name || 'Cliente'}
                    </Link>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge className={`text-[9px] font-medium px-2 py-0.5 border ${stageColors[stage] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                        {stageLabels[stage] || stage}
                      </Badge>
                      {time && (
                        <span className="text-[11px] text-[#888888] flex items-center gap-1">
                          <Clock className="w-3 h-3" strokeWidth={1.5} />
                          {time}
                        </span>
                      )}
                      {project.session_duration_minutes && stage === 'agendado' && (
                        <span className="text-[10px] text-[#888888]">
                          ({project.session_duration_minutes}min)
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-full w-7 h-7 p-0 flex-shrink-0 flex items-center justify-center bg-[#25D366] hover:bg-[#20BD5A]"
                    onClick={() => openWhatsApp(project.client_whatsapp)}
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-white" />
                  </Button>
                </div>
                {project.description && (
                  <p className="text-[11px] text-[#A0A486] font-light leading-relaxed">
                    {project.description}
                  </p>
                )}
                {project.total_value > 0 && (
                  <p className="text-[11px] text-[#888888] font-light mt-1">
                    Valor: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(project.total_value)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}