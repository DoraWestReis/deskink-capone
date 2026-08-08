import { Button } from '@/components/ui/button';

export default function StudioFlowActionCard({
  action,
  status,
  feedbackMessage,
  onConfirm,
  onDismiss,
}) {
  if (!action) return null;

  return (
    <div className="rounded-2xl border border-[#E5DDD2] bg-[#FFF9F2] p-4">
      <p className="text-[11px] uppercase tracking-[0.14em] text-[#9C8A6D]">Ação sugerida</p>
      <p className="mt-2 text-sm text-[#231F20]">{action.summary || 'Confirme para executar essa ação no app.'}</p>

      {status === 'done' && (
        <p className="mt-3 text-xs font-medium text-emerald-700">{feedbackMessage || 'Ação executada com sucesso.'}</p>
      )}

      {status === 'error' && (
        <p className="mt-3 text-xs font-medium text-red-600">{feedbackMessage || 'Não foi possível concluir essa ação.'}</p>
      )}

      {status !== 'done' && status !== 'dismissed' && (
        <div className="mt-4 flex gap-2">
          <Button
            type="button"
            size="sm"
            onClick={onConfirm}
            disabled={status === 'loading'}
            className="rounded-xl bg-[#231F20] text-white hover:bg-[#18151B]"
          >
            {status === 'loading' ? 'Executando...' : 'Confirmar'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onDismiss}
            disabled={status === 'loading'}
            className="rounded-xl border-[#DCCFBD] bg-transparent text-[#5D544B] hover:bg-[#F4EEE7]"
          >
            Agora não
          </Button>
        </div>
      )}
    </div>
  );
}