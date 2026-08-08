import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format, addDays, startOfWeek, startOfMonth, endOfMonth, isSameDay, eachDayOfInterval, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { nowInSalvador, toSalvadorTime } from '@/components/utils/timezone';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Clock, MapPin, Calendar as CalendarIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import BottomNav from '@/components/ui/BottomNav';
import Footer from '@/components/ui/Footer';
import GoogleCalendarConnect from '@/components/schedule/GoogleCalendarConnect';

export default function Schedule() {
  const [selectedDate, setSelectedDate] = useState(nowInSalvador());
  const [weekStart, setWeekStart] = useState(startOfWeek(nowInSalvador(), { weekStartsOn: 0 }));
  const [viewMode, setViewMode] = useState('week'); // 'week' or 'month'
  const [currentMonth, setCurrentMonth] = useState(nowInSalvador());

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-session_date'),
  });

  const scheduleItems = React.useMemo(() => {
    const items = [];

    projects.forEach((p) => {
      if (!p.session_date) return;

      if (p.pipeline_stage === 'agendado' || p.pipeline_stage === 'agendado_orcamento_presencial' || p.pipeline_stage === 'followup_orcamento') {
        items.push({ ...p, event_type: 'sessao', event_date: p.session_date });
      }
    });

    return items;
  }, [projects]);

  const selectedDayAppointments = scheduleItems.filter(item => {
    try {
      const aptDate = toSalvadorTime(new Date(item.event_date));
      return isSameDay(aptDate, selectedDate);
    } catch {
      return false;
    }
  }).sort((a, b) => new Date(a.event_date) - new Date(b.event_date));

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const hasAppointment = (date) => {
    return scheduleItems.some(item => {
      try {
        const aptDate = toSalvadorTime(new Date(item.event_date));
        return isSameDay(aptDate, date);
      } catch {
        return false;
      }
    });
  };

  const getAppointmentsForDay = (date) => {
    return scheduleItems.filter(item => {
      try {
        const aptDate = toSalvadorTime(new Date(item.event_date));
        return isSameDay(aptDate, date);
      } catch {
        return false;
      }
    }).sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
  };

  const goToPreviousWeek = () => {
    setWeekStart(addDays(weekStart, -7));
  };

  const goToNextWeek = () => {
    setWeekStart(addDays(weekStart, 7));
  };

  const goToPreviousMonth = () => {
    const prevMonth = new Date(currentMonth);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    setCurrentMonth(prevMonth);
  };

  const goToNextMonth = () => {
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setCurrentMonth(nextMonth);
  };

  const monthDays = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const monthStartOffset = getDay(startOfMonth(currentMonth));
  const monthGridDays = [
    ...Array.from({ length: monthStartOffset }, (_, index) => ({
      id: `empty-start-${index}`,
      isPlaceholder: true,
    })),
    ...monthDays.map((day) => ({
      id: day.toISOString(),
      day,
      isPlaceholder: false,
    })),
  ];

  return (
    <div className="min-h-screen bg-[#18151B] pb-[112px]">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[radial-gradient(circle_at_top_left,_rgba(184,154,102,0.22),_transparent_35%),linear-gradient(135deg,#221D25_0%,#18151B_55%,#131017_100%)] backdrop-blur-xl">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-5 sm:py-7">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/50">Organização da agenda</p>
              <h1 className="mt-2 text-3xl sm:text-4xl font-display text-white">Agenda</h1>
              <p className="mt-2 text-sm text-white/65 capitalize">
                {format(viewMode === 'week' ? selectedDate : currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
              </p>
              <div className="mt-4">
                <GoogleCalendarConnect />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setViewMode('week')}
                className={viewMode === 'week' ? 'rounded-2xl border-[#B89A66] bg-[#B89A66] text-white hover:bg-[#A88959] hover:text-white' : 'rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white'}
              >
                Semana
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setViewMode('month')}
                className={viewMode === 'month' ? 'rounded-2xl border-[#B89A66] bg-[#B89A66] text-white hover:bg-[#A88959] hover:text-white' : 'rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white'}
              >
                Mês
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 -mt-2 rounded-t-[30px] bg-[#F6F1EC]">
        <div className="border-b border-[#E7DED2]">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-5">
          {viewMode === 'week' ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <button 
                  onClick={goToPreviousWeek}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FCF8F4] text-[#7A736C] transition-colors hover:bg-white"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium text-[#231F20]">
                  {format(weekStart, "d MMM", { locale: ptBR })} - {format(addDays(weekStart, 6), "d MMM", { locale: ptBR })}
                </span>
                <button 
                  onClick={goToNextWeek}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FCF8F4] text-[#7A736C] transition-colors hover:bg-white"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex justify-between gap-1">
                {weekDays.map((day, index) => {
                  const isSelected = isSameDay(day, selectedDate);
                  const hasApt = hasAppointment(day);

                  return (
                    <motion.button
                      key={index}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedDate(day)}
                      className={`flex-1 py-3 rounded-xl flex flex-col items-center gap-1 transition-all duration-200 ${
                        isSelected 
                          ? 'bg-[#231F20] text-white' 
                          : 'bg-[#FCF8F4] text-[#231F20] hover:bg-white'
                      }`}
                    >
                      <span className={`text-[10px] uppercase ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                        {format(day, 'EEE', { locale: ptBR })}
                      </span>
                      <span className={`text-lg font-semibold ${isSameDay(day, nowInSalvador()) && !isSelected ? 'text-amber-600' : ''}`}>
                        {format(day, 'd')}
                      </span>
                      {hasApt && (
                        <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-amber-400' : 'bg-amber-500'}`} />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <button 
                  onClick={goToPreviousMonth}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FCF8F4] text-[#7A736C] transition-colors hover:bg-white"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium text-[#231F20]">
                  {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
                </span>
                <button 
                  onClick={goToNextMonth}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FCF8F4] text-[#7A736C] transition-colors hover:bg-white"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                  <div key={day} className="py-2 text-center text-xs font-medium text-[#9A9188]">
                    {day}
                  </div>
                ))}
                {monthGridDays.map((item) => {
                  if (item.isPlaceholder) {
                    return <div key={item.id} className="min-h-[100px] rounded-xl bg-transparent" />;
                  }

                  const day = item.day;
                  const isSelected = isSameDay(day, selectedDate);
                  const dayAppointments = getAppointmentsForDay(day);
                  const isToday = isSameDay(day, nowInSalvador());

                  return (
                    <motion.button
                      key={item.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedDate(day)}
                      className={`min-h-[100px] rounded-xl p-2 flex flex-col items-start gap-1 transition-all duration-200 ${
                        isSelected 
                          ? 'bg-[#F3E8D6] border-2 border-[#B89A66]' 
                          : 'bg-[#FCF8F4] border-2 border-transparent hover:bg-white'
                      }`}
                    >
                      <div className={`mb-1 w-full text-left text-sm font-semibold ${isToday ? 'text-[#B08954]' : 'text-[#231F20]'}`}>
                        {format(day, 'd')}
                      </div>
                      {dayAppointments.slice(0, 3).map((apt, aptIndex) => {
                        const eventColors = {
                          sessao: 'bg-blue-500',
                          revisao: 'bg-purple-500',
                          pos_venda: 'bg-amber-500',
                        };
                        return (
                          <div
                            key={aptIndex}
                            className={`w-full text-[10px] ${eventColors[apt.event_type] || 'bg-blue-500'} text-white px-1.5 py-0.5 rounded truncate`}
                            title={`${format(new Date(apt.event_date), 'HH:mm')} - ${apt.client_name}`}
                          >
                            {format(new Date(apt.event_date), 'HH:mm')} {apt.client_name}
                          </div>
                        );
                      })}
                      {dayAppointments.length > 3 && (
                        <div className="w-full text-[9px] font-medium text-[#7A736C]">
                          +{dayAppointments.length - 3} mais
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <main className="container mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
        <AnimatePresence mode="wait">
          {selectedDayAppointments.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-12"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#FCF8F4]">
                <Clock className="w-7 h-7 text-[#B9ADA0]" />
              </div>
              <p className="font-medium text-[#231F20]">Nenhum agendamento</p>
              <p className="mt-1 text-sm text-[#7A736C]">
                {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {selectedDayAppointments.map((apt, index) => (
                <motion.div
                  key={apt.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link to={createPageUrl(`ProjectDetails?id=${apt.id}`)}>
                    <div className="rounded-2xl border border-[#E7DED2] bg-[#FCF8F4] p-4 shadow-[0_8px_24px_rgba(35,31,32,0.05)] transition-all duration-200 hover:shadow-[0_10px_26px_rgba(35,31,32,0.08)]">
                      <div className="flex items-start gap-4">
                        <div className="w-16 text-center">
                          <div className="text-2xl font-bold text-[#231F20]">
                            {format(new Date(apt.event_date), 'HH:mm')}
                          </div>
                          <div className="mt-0.5 text-xs text-[#9A9188]">
                            {apt.event_type === 'revisao' ? 'Revisão' : apt.event_type === 'pos_venda' ? 'Pós-Venda' : (apt.style || 'Tattoo')}
                          </div>
                        </div>
                        <div className="flex-1 border-l border-[#E7DED2] pl-4">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#231F20] text-xs font-semibold text-white">
                                {apt.client_name?.substring(0, 2).toUpperCase() || 'CL'}
                              </div>
                              <div>
                                <p className="font-semibold text-[#231F20]">{apt.client_name}</p>
                              </div>
                            </div>
                            {apt.event_type === 'revisao' ? (
                              <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-1 rounded-lg font-medium">Revisão</span>
                            ) : apt.event_type === 'pos_venda' ? (
                              <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-1 rounded-lg font-medium">Pós-Venda</span>
                            ) : (
                              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg font-medium">Sessão</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-[#7A736C]">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {apt.body_location || 'Local não definido'}
                            </span>
                          </div>
                          <p className="mt-2 line-clamp-2 text-sm text-[#6E6761]">{apt.description}</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      </div>

      <BottomNav currentPage="Schedule" />
      <Footer />
    </div>
  );
}