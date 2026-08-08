import React from 'react';
import { Clock, AlertCircle, User, Calendar } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function PendingFollowups({ followups }) {
  if (!followups || followups.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Follow-ups Pendentes</h3>
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-sm text-slate-400">Nenhum follow-up pendente</p>
        </div>
      </div>
    );
  }

  const getUrgencyColor = (dueDate) => {
    const date = new Date(dueDate);
    if (isPast(date) && !isToday(date)) return 'text-red-600 bg-red-50';
    if (isToday(date)) return 'text-amber-600 bg-amber-50';
    return 'text-slate-600 bg-slate-50';
  };

  const getTypeLabel = (type) => {
    return type === 'aguardando_sinal' ? 'Aguardando Sinal' : 'Pós-Venda';
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900">Follow-ups Pendentes</h3>
        <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
          {followups.length}
        </span>
      </div>
      <div className="space-y-3">
        {followups.map((followup, index) => (
          <motion.div
            key={followup.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link
              to={createPageUrl(`ProjectDetails?id=${followup.project_id}`)}
              className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getUrgencyColor(followup.due_date)}`}>
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">{followup.client_name}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    {getTypeLabel(followup.follow_up_type)}
                  </span>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(followup.due_date), 'dd/MM', { locale: ptBR })}
                  </span>
                </div>
              </div>
              {isPast(new Date(followup.due_date)) && !isToday(new Date(followup.due_date)) && (
                <div className="text-xs font-medium text-red-600">
                  Atrasado
                </div>
              )}
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}