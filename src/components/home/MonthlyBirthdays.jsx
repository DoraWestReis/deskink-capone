import React from 'react';
import { Gift } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { nowInSalvador } from '@/components/utils/timezone';

const getBirthDate = (value) => {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

export default function MonthlyBirthdays({ clients = [] }) {
  const today = nowInSalvador();
  const currentMonth = today.getMonth();
  const currentDay = today.getDate();

  const birthdays = clients
    .filter((client) => getBirthDate(client.birth_date)?.getMonth() === currentMonth)
    .sort((a, b) => {
      const dayA = getBirthDate(a.birth_date)?.getDate() || 99;
      const dayB = getBirthDate(b.birth_date)?.getDate() || 99;
      const scoreA = dayA >= currentDay ? dayA : dayA + 31;
      const scoreB = dayB >= currentDay ? dayB : dayB + 31;
      return scoreA - scoreB;
    });

  return (
    <div className="rounded-[24px] border border-[#E7DED2] bg-[#FCF8F4] p-3.5 shadow-[0_12px_30px_rgba(35,31,32,0.05)]">
      <div className="mb-2.5 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F3E8D6]">
          <Gift className="h-4 w-4 text-[#B08954]" />
        </div>
        <div>
          <h3 className="text-sm font-display text-[#231F20]">Aniversariantes do mês</h3>
          <p className="text-[11px] text-[#7A736C]">{birthdays.length} {birthdays.length === 1 ? 'cliente faz aniversário' : 'clientes fazem aniversário'}</p>
        </div>
      </div>

      {birthdays.length === 0 ? (
        <p className="py-4 text-center text-xs text-[#7A736C]">Nenhum aniversariante neste mês</p>
      ) : (
        <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
          {birthdays.map((client) => {
            const birthDate = getBirthDate(client.birth_date);
            const birthDay = birthDate?.getDate();
            const isToday = birthDay === currentDay;

            return (
              <Link
                key={client.id}
                to={createPageUrl(`ClientDetails?id=${client.id}`)}
                className="flex items-center justify-between gap-2.5 rounded-xl border border-[#E9E0D4] bg-white p-2.5 shadow-[0_6px_18px_rgba(35,31,32,0.04)] transition-colors hover:bg-[#FFF9F2]"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-[#231F20]">{client.name}</p>
                  <p className="text-[11px] text-[#7A736C]">Aniversário em {String(birthDay).padStart(2, '0')}/{String(currentMonth + 1).padStart(2, '0')}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isToday ? 'bg-emerald-50 text-emerald-700' : 'bg-[#F7F2EA] text-[#7A736C]'}`}>
                  {isToday ? 'Hoje' : `${birthDay}/${currentMonth + 1}`}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}