import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

export const LOST_REASONS = [
  'Preço',
  'Dúvida sobre o projeto',
  'Tempo de resposta',
  'Precisa pensar mais',
  'Sem retorno do cliente',
];

const getTodayInSaoPaulo = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
};

export default function LostReasonDialog({ open, onConfirm, onCancel }) {
  const [reason, setReason] = useState(null);
  const [lossDate, setLossDate] = useState(getTodayInSaoPaulo());
  const [details, setDetails] = useState('');

  useEffect(() => {
    if (open) {
      setReason(null);
      setLossDate(getTodayInSaoPaulo());
      setDetails('');
    }
  }, [open]);

  const handleConfirm = () => {
    onConfirm({
      lost_reason: reason || '',
      lost_reason_details: details,
      lost_at: `${lossDate}T12:00:00-03:00`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent className="max-h-[calc(100dvh-24px)] w-[calc(100vw-24px)] overflow-y-auto rounded-2xl p-5 sm:max-w-[420px]">
        <div className="pr-6">
          <h2 className="text-lg font-display font-bold text-[#231F20]">Por que o projeto foi perdido?</h2>
          <p className="mt-1 text-sm text-[#7A736C]">Registrar o motivo ajuda a entender suas perdas nas Análises. Tudo é opcional.</p>
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-[#231F20]">Motivo</p>
          <div className="flex flex-wrap gap-2">
            {LOST_REASONS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setReason((prev) => (prev === item ? null : item))}
                className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                  reason === item
                    ? 'border-[#231F20] bg-[#231F20] text-white'
                    : 'border-[#E5DDD2] bg-white text-[#6E6761] hover:bg-[#FAF7F2]'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-[#231F20]">Data da perda</p>
          <Input
            type="date"
            value={lossDate}
            onChange={(e) => setLossDate(e.target.value)}
            className="h-11 border-[#E5DDD2] bg-white text-[#231F20]"
          />
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-[#231F20]">Detalhes (opcional)</p>
          <Textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Escreva livremente qualquer contexto sobre a perda..."
            className="min-h-[84px] border-[#E5DDD2] bg-white text-[#231F20] placeholder:text-[#B7AEA4]"
          />
        </div>

        <div className="mt-4 space-y-2">
          <Button
            onClick={handleConfirm}
            disabled={!lossDate}
            className="h-11 w-full rounded-xl bg-[#231F20] text-white hover:bg-[#18151B]"
          >
            Marcar como perdido
          </Button>
          <Button
            variant="ghost"
            onClick={onCancel}
            className="w-full text-[#888888] hover:text-[#2D2D2D] rounded-xl"
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}