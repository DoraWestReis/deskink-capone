import React, { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';

const PAGE_SIZE = 15;

const STAGE_LABELS = {
  agendado: 'Agendado',
  agendado_orcamento_presencial: 'Orçamento presencial',
  followup_fechamento: 'Follow-up fechamento',
  revisao: 'Revisão',
  concluido: 'Concluído',
  perdido: 'Perdido',
};

export default function ImportPreviewTable({ groups }) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(groups.length / PAGE_SIZE));
  const visible = groups.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="rounded-2xl border border-[#E6DDD2] bg-white p-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-[#7A736C]">
              <th className="py-2 pr-4">Cliente</th>
              <th className="py-2 pr-4">Sessões</th>
              <th className="py-2 pr-4">Datas</th>
              <th className="py-2">Contato</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((group) => (
              <tr key={group.key} className="border-t border-[#F1EAE1] align-top">
                <td className="py-3 pr-4 font-semibold text-[#231F20]">{group.name}</td>
                <td className="py-3 pr-4 text-[#7A736C]">{group.sessions.length}</td>
                <td className="py-3 pr-4 text-[#7A736C]">
                  {group.sessions.map((session, i) => (
                    <div key={i} className="whitespace-nowrap">
                      {format(new Date(session.session_date), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                      {' · '}{session.session_duration_minutes}min · {session.description}
                      {' · '}<span className={session.pipeline_stage === 'perdido' ? 'text-red-600' : session.pipeline_stage === 'concluido' ? 'text-emerald-600' : 'text-[#B89A66]'}>{STAGE_LABELS[session.pipeline_stage] || session.pipeline_stage}</span>
                    </div>
                  ))}
                </td>
                <td className="py-3">
                  {group.contact
                    ? <span className="text-[#231F20]">{group.contact}</span>
                    : <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-700">SEM CONTATO</span>}
                  {group.email && <div className="text-xs text-[#7A736C]">{group.email}</div>}
                  {group.cpf && <div className="text-xs text-[#7A736C]">CPF {group.cpf}</div>}
                  {group.birth_date && <div className="text-xs text-[#7A736C]">Nasc. {group.birth_date.split('-').reverse().join('/')}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-[#7A736C]">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
          <span>Página {page + 1} de {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
        </div>
      )}
    </div>
  );
}