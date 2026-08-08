import React from 'react';
import { Calendar, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import FollowUpTaskStatusActions from '@/components/followups/FollowUpTaskStatusActions';
import { getProjectFollowUpState } from '@/components/project/projectFollowUpState';
import { getFollowUpAction } from '@/components/home/followUpActionHelper';

const typeLabels = {
  followup_orcamento: 'Follow-up de orçamento',
  followup_fechamento: 'Follow-up de fechamento',
  aguardando_sinal: 'Cobrança de sinal',
  pos_venda: 'Pós-venda',
  revisao: 'Revisão',
  session_reminder: 'Lembrete de sessão',
};

const formatDate = (value) => value ? format(new Date(`${value}T12:00:00`), "dd/MM/yyyy", { locale: ptBR }) : 'Sem data';
const getWhatsAppLink = (whatsapp) => whatsapp ? `https://wa.me/${whatsapp.replace(/\D/g, '')}` : null;

export default function ProjectFollowUpTimeline({ tasks = [], whatsapp, project, settings }) {
  const followUpState = getProjectFollowUpState(project, tasks, settings, getFollowUpAction(project).label);
  const statusOrder = { pending: 0, completed: 1, dismissed: 2 };
  const sortedTasks = [...(followUpState.tasks || [])].sort((a, b) => {
    const statusDiff = (statusOrder[a.status] ?? 1) - (statusOrder[b.status] ?? 1);
    if (statusDiff !== 0) return statusDiff;
    const dateDiff = (a.due_date || '').localeCompare(b.due_date || '');
    if (dateDiff !== 0) return dateDiff;
    return (a.step_number || 0) - (b.step_number || 0);
  });

  return (
    <div className="rounded-[28px] border border-[#E7DED2] bg-[#FCF8F4] p-5 sm:p-6 shadow-[0_12px_30px_rgba(35,31,32,0.05)]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-[#9C8A6D]">Etapas de follow-up</p>
          <h3 className="mt-1 text-lg font-display text-[#231F20]">Próximos contatos deste projeto</h3>
        </div>
        {whatsapp && (
          <a
            href={getWhatsAppLink(whatsapp)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#25D366] text-white hover:bg-[#20BD5A]"
            title="Abrir WhatsApp"
          >
            <MessageCircle className="h-4 w-4" />
          </a>
        )}
      </div>

      {sortedTasks.filter((task) => task.status !== 'dismissed' && !(task.follow_up_type === 'pos_venda' && project?.post_sale_status === 'feito' && task.status === 'pending')).length === 0 ? (
        <div className="rounded-2xl border border-[#E8DED1] bg-white px-4 py-5 text-sm text-[#7A736C]">
          Nenhuma tarefa criada para este projeto no momento.
        </div>
      ) : (
        <div className="space-y-3">
          {sortedTasks
            .filter((task) => task.status !== 'dismissed' && !(task.follow_up_type === 'pos_venda' && project?.post_sale_status === 'feito' && task.status === 'pending'))
            .map((task) => (
            <div key={task.id} className="rounded-2xl border border-[#E8DED1] bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#F3E8D6] px-2.5 py-1 text-[11px] font-semibold text-[#8F7445]">
                      {task.step_number ? `${task.step_number}. ${task.step_label || 'Contato'}` : task.step_label || 'Contato'}
                    </span>
                    <span className="rounded-full bg-[#F7F2EA] px-2.5 py-1 text-[11px] font-medium text-[#7A736C]">
                      {typeLabels[task.follow_up_type] || 'Follow-up'}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${task.status === 'completed' ? 'bg-[#E7F8EF] text-[#1E9E63]' : task.status === 'dismissed' ? 'bg-[#F3F0EB] text-[#8B8175]' : 'bg-[#FFF6EA] text-[#D88A14]'}`}>
                      {task.status === 'completed' ? 'Concluído' : task.status === 'dismissed' ? 'Dispensado' : 'Pendente'}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-[#231F20]">{task.message}</p>
                  <p className="mt-2 flex items-center gap-2 text-xs text-[#7A736C]">
                    <Calendar className="h-4 w-4 text-[#9C8A6D]" />
                    Previsto para {formatDate(task.due_date)}
                  </p>
                </div>
                <div className="flex min-h-[32px] shrink-0 items-center gap-1.5 self-start [&>*]:shrink-0">
                  <FollowUpTaskStatusActions task={task} projectId={task.project_id} showCalendarButton={task.status === 'pending'} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}