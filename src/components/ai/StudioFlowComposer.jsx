import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export default function StudioFlowComposer({ value, onChange, onSend, disabled }) {
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onSend();
    }
  };

  return (
    <div className="space-y-3">
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Pergunte como usar o app, ver prioridades, clientes, agenda, follow-ups ou números..."
        className="min-h-[96px] resize-none rounded-2xl border-[#E5DDD2] bg-white px-4 py-3 text-sm text-[#231F20] placeholder:text-[#8B837B] focus-visible:ring-[#B89A66]"
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-[#8B837B]">
          Enter envia. Shift + Enter quebra a linha.
        </p>
        <Button
          onClick={onSend}
          disabled={disabled || !value.trim()}
          className="rounded-2xl bg-[#231F20] text-white hover:bg-[#18151B]"
        >
          {disabled ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Enviar
        </Button>
      </div>
    </div>
  );
}