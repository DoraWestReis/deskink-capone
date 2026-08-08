import React from 'react';
import { Clock, MapPin, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { toSalvadorTime } from '@/components/utils/timezone';

export default function TodayAppointments({ appointments }) {
  const formatDate = (dateStr) => {
    try {
      return format(new Date(dateStr), 'dd/MM', { locale: ptBR });
    } catch {
      return '';
    }
  };

  if (!appointments || appointments.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Próximos Atendimentos</h3>
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-5 h-5 text-slate-300" />
          </div>
          <p className="text-sm text-slate-400">Nenhum atendimento agendado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900">Próximos Atendimentos</h3>
        <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
          {appointments.length}
        </span>
      </div>
      <div className="space-y-3">
        {appointments.map((apt, index) => (
          <motion.div
            key={apt.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <div className="w-12 h-12 bg-[#1e3a4a] rounded-xl flex items-center justify-center text-white font-semibold text-sm">
              {apt.client_name?.substring(0, 2).toUpperCase() || 'CL'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-900 truncate">{apt.client_name}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {apt.session_date ? formatDate(apt.session_date) : '--'}
                </span>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {apt.session_date ? format(new Date(apt.session_date), 'HH:mm') : '--:--'}
                </span>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {apt.body_location || 'Local'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">ID</span>
              <p className="text-xs font-mono text-slate-600">{apt.id?.substring(0, 6)}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}