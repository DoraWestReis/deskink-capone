import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from 'lucide-react';

export default function PeriodFilter({ value, onChange }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full md:w-48 bg-white border-slate-200">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="today">Hoje</SelectItem>
        <SelectItem value="current_month">Este Mês</SelectItem>
        <SelectItem value="current_year">Este Ano</SelectItem>
        <SelectItem value="all_time">Todo o Período</SelectItem>
      </SelectContent>
    </Select>
  );
}