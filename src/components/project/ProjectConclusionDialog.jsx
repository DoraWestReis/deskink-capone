import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function ProjectConclusionDialog({ open, onConfirm, onCancel, clientName, isPending }) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader className="text-center space-y-3 pb-2">
          <div className="mx-auto w-14 h-14 bg-[#E7F8EF] rounded-2xl flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-[#1E9E63]" />
          </div>
          <DialogTitle className="text-xl font-display font-bold text-[#2D2D2D]">
            Concluir projeto?
          </DialogTitle>
          <DialogDescription className="text-sm text-[#888888] font-light">
            Todos os follow-ups de pós-venda de <strong className="text-[#2D2D2D]">{clientName}</strong> foram finalizados.
            Deseja marcar o projeto como concluído?
          </DialogDescription>
        </DialogHeader>

        <div className="bg-[#FAF7F2] rounded-xl p-4 text-sm text-[#6E6761] space-y-2">
          <p>Ao confirmar:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>O projeto será marcado como <strong>Concluído</strong></li>
            <li>Ele sairá da etapa de pós-venda</li>
            <li>Nenhum novo follow-up será gerado</li>
          </ul>
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-col pt-2">
          <Button
            onClick={onConfirm}
            disabled={isPending}
            className="w-full bg-[#1E9E63] hover:bg-[#178A55] text-white rounded-xl h-12"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {isPending ? 'Concluindo...' : 'Sim, concluir projeto'}
          </Button>
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={isPending}
            className="w-full text-[#888888] hover:text-[#2D2D2D] rounded-xl"
          >
            Não, manter em pós-venda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}