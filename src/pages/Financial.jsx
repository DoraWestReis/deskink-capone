import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, subMonths, addMonths, startOfYear, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { nowInSalvador } from '@/components/utils/timezone';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, DollarSign, Receipt, CreditCard, Wallet, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

import BottomNav from '@/components/ui/BottomNav';
import DateRangeFilter from '@/components/ui/DateRangeFilter';
import Footer from '@/components/ui/Footer';
import { getCommissionRate } from '@/components/utils/commissionHelper';
import { getConfirmedTotalPaymentAmount, getProjectTotalPaymentMetricDate } from '@/components/utils/paymentMetrics';

export default function Financial() {
  const [currentMonth, setCurrentMonth] = useState(nowInSalvador());
  const [period, setPeriod] = useState('current_month');
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date'),
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['financial-settings'],
    queryFn: () => base44.entities.FinancialSettings.list(),
  });

  const financialSettings = settings[0] || {
    fixed_supply_cost: 50,
    debit_card_fee: 2,
    credit_card_fee: 5
  };

  const getPeriodDates = () => {
    const now = nowInSalvador();
    switch (period) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'current_month':
        return { start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) };
      case 'current_year':
        return { start: startOfYear(now), end: now };
      case 'all_time':
        return { start: new Date(2020, 0, 1), end: now };
      case 'custom':
        return { 
          start: customStartDate ? startOfDay(customStartDate) : startOfMonth(now), 
          end: customEndDate ? endOfDay(customEndDate) : endOfMonth(now) 
        };
      default:
        return { start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) };
    }
  };

  const handleDateChange = (start, end) => {
    setCustomStartDate(start);
    setCustomEndDate(end);
  };

  const { start: periodStart, end: periodEnd } = getPeriodDates();

  // Helper: get best available value for a project
  const getProjectValue = (project) => {
    return getConfirmedTotalPaymentAmount(project) || Number(project.total_value) || 0;
  };

  // Helper: get best available date for a project (confirmed, session, or payment)
  const getProjectDate = (project) => {
    const confirmed = getProjectTotalPaymentMetricDate(project);
    if (confirmed) return confirmed;
    if (project.session_date) return new Date(project.session_date);
    if (project.payment_date) return new Date(project.payment_date + 'T12:00:00');
    if (project.tattoo_date) return new Date(project.tattoo_date + 'T12:00:00');
    return null;
  };

  const monthlyProjects = projects.filter((project) => {
    const value = getProjectValue(project);
    if (!value || value <= 0) return false;
    // Only stages that represent actual work done
    const doneStages = ['agendado', 'revisao', 'pos_venda'];
    const hasConfirmed = project.total_value_confirmed;
    const isHistorical = doneStages.includes(project.pipeline_stage);
    if (!hasConfirmed && !isHistorical) return false;

    const paymentDate = getProjectDate(project);
    return paymentDate && paymentDate >= periodStart && paymentDate <= periodEnd;
  });

  const calculateNetProfit = (project) => {
    const value = getProjectValue(project);
    const method = project.total_value_confirmed_method || project.payment_method;
    const rate = getCommissionRate(method, project.installments, financialSettings);
    return value * rate;
  };

  const grossRevenue = monthlyProjects.reduce((sum, p) => sum + getProjectValue(p), 0);
  const netProfit = monthlyProjects.reduce((sum, p) => sum + calculateNetProfit(p), 0);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const getMethod = (p) => p.total_value_confirmed_method || p.payment_method;
  const sumByMethods = (methods) => monthlyProjects.filter(p => methods.includes(getMethod(p))).reduce((s, p) => s + getProjectValue(p), 0);
  
  const paymentBreakdown = {
    pix: sumByMethods(['Pix']),
    dinheiro: sumByMethods(['Dinheiro']),
    cartao_sem_juros: sumByMethods(['Cartão sem juros', 'Cartão Débito']),
    cartao_com_juros: sumByMethods(['Cartão com juros', 'Cartão Crédito']),
    outros: sumByMethods(['Outros']),
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] pb-[112px]">
      {/* Header */}
      <header className="bg-white/50 backdrop-blur-sm border-b border-[#E8E5E0] sticky top-0 z-30">
        <div className="container mx-auto px-6 py-6 max-w-7xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-display font-bold text-[#2D2D2D]">Financeiro</h1>
              <p className="text-sm text-[#888888] font-light mt-1">{monthlyProjects.length} sessões no mês</p>
            </div>
            <Link
              to={createPageUrl('Settings')}
              className="w-11 h-11 bg-transparent border border-[#E8E5E0] rounded-xl flex items-center justify-center text-[#888888] hover:border-[#2D2D2D] hover:text-[#2D2D2D] transition-all"
            >
              <Settings className="w-5 h-5" strokeWidth={1.5} />
            </Link>
          </div>
        </div>
      </header>

      {/* Period Filter */}
      <div className="bg-white/50 backdrop-blur-sm border-b border-[#E8E5E0]">
        <div className="container mx-auto px-6 py-4 max-w-7xl">
          <div className="flex items-center gap-3">
            {period === 'current_month' && (
              <>
                <button 
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-semibold text-slate-700 capitalize flex-1 text-center">
                  {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
                </span>
                <button 
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
            <DateRangeFilter 
              period={period}
              onPeriodChange={setPeriod}
              startDate={customStartDate}
              endDate={customEndDate}
              onDateChange={handleDateChange}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="lg:col-span-2">
          {/* Main Stats */}
          <div className="grid grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[20px] p-6 shadow-[0_4px_15px_rgba(0,0,0,0.05)]"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-[#FAF7F2] rounded-xl flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-[#888888]" strokeWidth={1.5} />
              </div>
              <span className="text-xs text-[#888888] font-light">Faturamento</span>
            </div>
            <p className="text-3xl font-light text-[#2D2D2D]">{formatCurrency(grossRevenue)}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#2D2D2D] rounded-[20px] p-6 text-white shadow-[0_4px_15px_rgba(0,0,0,0.1)]"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" strokeWidth={1.5} />
              </div>
              <span className="text-xs text-white/70 font-light">Lucro / Comissão</span>
            </div>
            <p className="text-3xl font-light">{formatCurrency(netProfit)}</p>
          </motion.div>
          </div>
        </div>



        {/* Payment Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-[20px] p-6 shadow-[0_4px_15px_rgba(0,0,0,0.05)]"
        >
          <h3 className="text-sm font-light text-[#2D2D2D] mb-5">Por Forma de Pagamento</h3>
          <div className="space-y-3">
            {[
              { label: 'Pix', value: paymentBreakdown.pix, color: 'bg-green-500' },
              { label: 'Dinheiro', value: paymentBreakdown.dinheiro, color: 'bg-blue-500' },
              { label: 'Cartão sem juros', value: paymentBreakdown.cartao_sem_juros, color: 'bg-purple-500' },
              { label: 'Cartão com juros', value: paymentBreakdown.cartao_com_juros, color: 'bg-amber-500' },
              { label: 'Outros', value: paymentBreakdown.outros, color: 'bg-slate-500' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${item.color}`} />
                  <span className="text-sm text-slate-600">{item.label}</span>
                </div>
                <span className="text-sm font-medium text-slate-900">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent Transactions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-[20px] p-6 shadow-[0_4px_15px_rgba(0,0,0,0.05)]"
        >
          <h3 className="text-sm font-light text-[#2D2D2D] mb-5">Últimas Sessões</h3>
          <div className="space-y-3">
            {monthlyProjects.slice(0, 5).map((project) => (
              <Link 
                key={project.id}
                to={createPageUrl(`ProjectDetails?id=${project.id}`)}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center text-slate-600 text-xs font-semibold">
                    {project.client_name?.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-slate-900">{project.client_name}</p>
                    <p className="text-xs text-slate-500">
                      {getProjectDate(project) ? format(getProjectDate(project), "dd/MM") : '--/--'} • {project.payment_method || 'Não definido'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm text-slate-900">{formatCurrency(getProjectValue(project))}</p>
                  <p className="text-xs text-green-600">+{formatCurrency(calculateNetProfit(project))}</p>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
        </div>
      </main>

      <BottomNav currentPage="Financial" />
      <Footer />
    </div>
  );
}