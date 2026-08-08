import React from 'react';
import { Clock, AlertTriangle, Calendar, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { getProjectDisplayDate } from '@/components/utils/datePriority';

export default function PipelineCard({ project, onClick, isOverdue }) {
  const displayDate = getProjectDisplayDate(project);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0
    }).format(value || 0);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className={`bg-white rounded-xl px-3 py-2.5 cursor-pointer shadow-sm border transition-all duration-200 ${
        isOverdue 
          ? 'border-amber-200 bg-amber-50/30 shadow-amber-100' 
          : 'border-slate-100 hover:shadow-md hover:border-slate-200'
      }`}
    >
      {isOverdue && (
        <div className="flex items-center gap-1 text-amber-600 text-[10px] font-medium mb-1.5 bg-amber-100 rounded-full px-1.5 py-0.5 w-fit">
          <AlertTriangle className="w-2.5 h-2.5" />
          +48h
        </div>
      )}
      
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-gradient-to-br from-slate-100 to-slate-200 rounded-md flex items-center justify-center text-slate-600 font-semibold text-[10px] flex-shrink-0">
          {project.client_name?.substring(0, 2).toUpperCase() || 'CL'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 text-xs truncate leading-tight">{project.client_name}</p>
          <p className="text-[10px] text-slate-500 truncate leading-tight">{project.description}</p>
        </div>
      </div>

      {(displayDate || project.total_value > 0) && (
        <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {displayDate && (
              <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                <Calendar className="w-2.5 h-2.5" />
                {format(displayDate, 'dd/MM')}
              </span>
            )}
          </div>
          {project.total_value > 0 && (
            <span className="text-[10px] font-semibold text-slate-700 flex items-center gap-0.5">
              <DollarSign className="w-2.5 h-2.5 text-green-500" />
              {formatCurrency(project.total_value)}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}