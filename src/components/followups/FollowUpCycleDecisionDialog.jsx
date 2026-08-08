import React from 'react';
import { ArrowRight, RefreshCw, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

const typeLabels = {
  followup_orcamento: 'follow-up de orçamento',
  followup_fechamento: 'follow-up de fechamento',
};

export const NEXT_STAGE_MAP = {
  followup_orcamento: 'aguardando_sinal',
  followup_fechamento: 'aguardando_sinal',
};

const nextStageLabels = { aguardando_sinal: 'Aguardando sinal' };

export default function FollowUpCycleDecisionDialog({ open, onOpenChange, followUpType, onAdvance, onRestart, isProcessing }) {
  const label = typeLabels[followUpType] || 'follow-up';
  const nextStageLabel = nextStageLabels[NEXT_STAGE_MAP[followUpType]] || 'próxima etapa';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-[24px] border-[#E8DED1] bg-[#FCF8F4]">
        <AlertDialogHeader>
          <AlertDialogTitle>Ciclo de {label} concluído</AlertDialogTitle>
          <AlertDialogDescription>Você concluiu todos os contatos deste ciclo. O que deseja fazer com este projeto agora?</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid gap-3 py-2">
          <button type="button" disabled={isProcessing} onClick={onAdvance} className="flex items-center gap-3 rounded-2xl border border-[#E8DED1] bg-white p-4 text-left transition-colors hover:border-[#B89A66] hover:bg-[#FCF8F4] disabled:opacity-60">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><ArrowRight className="h-5 w-5" /></div>
            <div className="min-w-0"><p className="text-sm font-semibold text-[#231F20]">Avançar etapa do projeto</p><p className="text-xs text-[#7A736C]">Mover para “{nextStageLabel}” e seguir o fluxo.</p></div>
          </button>

          <button type="button" disabled={isProcessing} onClick={onRestart} className="flex items-center gap-3 rounded-2xl border border-[#E8DED1] bg-white p-4 text-left transition-colors hover:border-[#B89A66] hover:bg-[#FCF8F4] disabled:opacity-60">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F3E8D6] text-[#8F7445]"><RefreshCw className="h-5 w-5" /></div>
            <div className="min-w-0"><p className="text-sm font-semibold text-[#231F20]">Reiniciar o {label}</p><p className="text-xs text-[#7A736C]">Recomeçar a sequência de contatos do zero, nesta mesma etapa.</p></div>
          </button>
        </div>

        <AlertDialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Decidir depois'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}