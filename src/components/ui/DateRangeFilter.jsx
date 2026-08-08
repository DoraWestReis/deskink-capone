import React, { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function DateRangeFilter({ startDate, endDate, onDateChange, period, onPeriodChange, compact = false }) {
  const [isOpen, setIsOpen] = useState(false);

  const handlePresetChange = (value) => {
    onPeriodChange(value);
    if (value !== 'custom') {
      setIsOpen(false);
    }
  };

  const formatDateRange = () => {
    if (period === 'custom' && startDate && endDate) {
      return `${format(startDate, 'dd/MM/yyyy')} - ${format(endDate, 'dd/MM/yyyy')}`;
    }
    return null;
  };

  return (
    <div className="flex w-full gap-2 flex-col sm:flex-row">
      <Select value={period} onValueChange={handlePresetChange}>
        <SelectTrigger className={compact ? "h-8 w-full rounded-full border border-white/10 bg-white/[0.06] px-3 text-[11px] text-white shadow-none sm:w-auto [&>svg]:text-white/60" : "h-11 w-full rounded-2xl border border-white/10 bg-white/5 text-sm text-white shadow-none sm:w-52 [&>svg]:text-white/60"}>
          <div className="flex min-w-0 items-center gap-2">
            <CalendarIcon className="h-4 w-4 flex-shrink-0 text-white/60" />
            <span className="truncate"><SelectValue /></span>
          </div>
        </SelectTrigger>
        <SelectContent className="border-white/10 bg-[#241F26] text-white">
          <SelectItem value="today" className="focus:bg-white/10 focus:text-white">Hoje</SelectItem>
          <SelectItem value="current_month" className="focus:bg-white/10 focus:text-white">Este Mês</SelectItem>
          <SelectItem value="current_year" className="focus:bg-white/10 focus:text-white">Este Ano</SelectItem>
          <SelectItem value="all_time" className="focus:bg-white/10 focus:text-white">Todo o Período</SelectItem>
          <SelectItem value="custom" className="focus:bg-white/10 focus:text-white">Período Personalizado</SelectItem>
        </SelectContent>
      </Select>

      {period === 'custom' && (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-11 w-full justify-start rounded-2xl border border-white/10 bg-white/5 text-left text-sm font-medium text-white hover:bg-white/10 hover:text-white sm:w-auto"
            >
              <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
              <span className="truncate">{formatDateRange() || 'Selecione o período'}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[calc(100vw-2rem)] max-w-sm rounded-[24px] border border-[#E6DDD2] bg-[#FCF8F4] p-0" align="start">
            <div className="space-y-3 p-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#9C8A6D]">Selecione o intervalo</p>
                <Calendar
                  mode="range"
                  selected={{ from: startDate, to: endDate }}
                  onSelect={(range) => {
                    onDateChange(range?.from || null, range?.to || null);
                  }}
                  locale={ptBR}
                  numberOfMonths={1}
                  className="rounded-xl border border-[#E6DDD2] bg-white"
                />
              </div>
              <Button
                onClick={() => setIsOpen(false)}
                className="w-full rounded-2xl bg-[#231F20] text-white hover:bg-[#131017]"
                disabled={!startDate || !endDate}
              >
                Aplicar
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}