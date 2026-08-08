import React from 'react';
import PipelineCard from './PipelineCard';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { motion } from 'framer-motion';

const stageConfig = {
  novo_contato: { 
    label: 'Novo Contato', 
    color: 'bg-blue-400',
    lightColor: 'bg-blue-50/50',
    borderColor: 'border-blue-100'
  },
  agendado_orcamento_presencial: { 
    label: 'Agendado Orçamento Presencial', 
    color: 'bg-indigo-400',
    lightColor: 'bg-indigo-50/50',
    borderColor: 'border-indigo-100'
  },
  followup_fechamento: { 
    label: 'Follow-up Fechamento', 
    color: 'bg-orange-400',
    lightColor: 'bg-orange-50/50',
    borderColor: 'border-orange-100'
  },
  perdido: { 
    label: 'Perdido', 
    color: 'bg-red-400',
    lightColor: 'bg-red-50/50',
    borderColor: 'border-red-100'
  },
  followup_orcamento: { 
    label: 'Follow-up Orçamento', 
    color: 'bg-yellow-400',
    lightColor: 'bg-yellow-50/50',
    borderColor: 'border-yellow-100'
  },
  aguardando_sinal: { 
    label: 'Aguardando Sinal', 
    color: 'bg-amber-400',
    lightColor: 'bg-amber-50/50',
    borderColor: 'border-amber-100'
  },
  agendado: { 
    label: 'Agendado', 
    color: 'bg-emerald-400',
    lightColor: 'bg-emerald-50/50',
    borderColor: 'border-emerald-100'
  },
  revisao: { 
    label: 'Revisão', 
    color: 'bg-purple-400',
    lightColor: 'bg-purple-50/50',
    borderColor: 'border-purple-100'
  },
  pos_venda: { 
    label: 'Pós-Venda', 
    color: 'bg-slate-400',
    lightColor: 'bg-slate-50/50',
    borderColor: 'border-slate-100'
  },
  concluido: { 
    label: 'Concluído', 
    color: 'bg-green-400',
    lightColor: 'bg-green-50/50',
    borderColor: 'border-green-100'
  },
};

export default function PipelineColumn({ stage, projects, onCardClick }) {
  const config = stageConfig[stage] || stageConfig.novo_contato;
  
  const isOverdue = (project) => {
    if (stage !== 'aguardando_sinal') return false;
    const stageDate = new Date(project.stage_updated_at || project.created_date);
    const hoursDiff = (Date.now() - stageDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff > 48;
  };

  return (
    <div className="flex-shrink-0 w-56 flex flex-col h-full">
      <div className={`rounded-xl ${config.lightColor} border ${config.borderColor} p-2 flex flex-col h-full`}>
        <div className="flex items-center justify-between mb-2 px-1 flex-shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className={`w-1.5 h-1.5 rounded-full ${config.color} flex-shrink-0`} />
            <h3 className="font-semibold text-xs text-slate-700 truncate">{config.label}</h3>
          </div>
          <span className="text-[10px] font-medium text-slate-500 bg-white/60 px-1.5 py-0.5 rounded-full flex-shrink-0 ml-1">
            {projects.length}
          </span>
        </div>
        
        <Droppable droppableId={stage}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`space-y-1.5 min-h-[60px] flex-1 overflow-y-auto rounded-lg p-1 transition-colors ${
                snapshot.isDraggingOver ? 'bg-white/50' : ''
              }`}
            >
              {projects.map((project, index) => (
                <Draggable key={project.id} draggableId={project.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                    >
                      <PipelineCard
                        project={project}
                        onClick={() => onCardClick(project)}
                        isOverdue={isOverdue(project)}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    </div>
  );
}