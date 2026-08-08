import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Stage date configurations — maps each stage to required date fields.
 */
const STAGE_DATE_CONFIG = {
  agendado_orcamento_presencial: {
    title: 'Data do Orçamento Presencial',
    description: 'Informe a data da avaliação/orçamento presencial.',
    fields: [
      { key: 'evaluation_date', label: 'Data da Avaliação', type: 'date' },
    ],
  },
  agendado: {
    title: 'Data da Sessão',
    description: 'Informe a data e hora da sessão de tatuagem.',
    fields: [
      { key: 'session_date', label: 'Data e Hora da Sessão', type: 'datetime-local' },
    ],
  },
  revisao: {
    title: 'Data da Tatuagem',
    description: 'Informe a data em que a tatuagem foi realizada. A data da revisão será calculada automaticamente.',
    fields: [
      { key: 'tattoo_date', label: 'Data da Tatuagem', type: 'date' },
    ],
  },
  pos_venda: {
    title: 'Data do Pós-Venda',
    description: 'Informe a data e hora do contato de pós-venda.',
    fields: [
      { key: 'post_sale_contact_date', label: 'Data e Hora do Pós-Venda', type: 'datetime-local' },
    ],
  },
};

export function getStageDateConfig(stage) {
  return STAGE_DATE_CONFIG[stage] || null;
}

export default function StageDateDialog({ open, stage, project, onConfirm, onCancel }) {
  const config = STAGE_DATE_CONFIG[stage];
  const [values, setValues] = useState({});
  const [overwriteConfirmed, setOverwriteConfirmed] = useState({});

  useEffect(() => {
    if (open && config) {
      const initial = {};
      const overwrite = {};
      config.fields.forEach((field) => {
        const existingValue = project?.[field.key];
        if (existingValue) {
          // Format existing value for the input
          if (field.type === 'datetime-local') {
            // Truncate ISO to datetime-local format
            initial[field.key] = existingValue.slice(0, 16);
          } else {
            initial[field.key] = existingValue.slice(0, 10);
          }
          overwrite[field.key] = false; // Needs confirmation to overwrite
        } else {
          initial[field.key] = '';
          overwrite[field.key] = true; // No existing value, no need to confirm
        }
      });
      setValues(initial);
      setOverwriteConfirmed(overwrite);
    }
  }, [open, stage, project]);

  if (!config) return null;

  const hasExistingValues = config.fields.some((f) => project?.[f.key]);
  const allOverwriteDecided = config.fields.every(
    (f) => !project?.[f.key] || overwriteConfirmed[f.key] !== false
  );
  const allFieldsFilled = config.fields.every((f) => values[f.key]);
  const canConfirm = allFieldsFilled && allOverwriteDecided;

  const handleConfirm = () => {
    const dateData = {};
    config.fields.forEach((field) => {
      if (overwriteConfirmed[field.key] === 'skip') return; // User chose to keep existing
      const val = values[field.key];
      if (!val) return;

      if (field.type === 'datetime-local') {
        // Normalize to ISO with timezone
        let normalized = val;
        if (normalized.length === 16) normalized = `${normalized}:00`;
        if (!normalized.includes('Z') && !normalized.includes('+') && !normalized.match(/-\d{2}:\d{2}$/)) {
          normalized = `${normalized}-03:00`;
        }
        dateData[field.key] = normalized;
      } else {
        dateData[field.key] = val;
      }
    });
    onConfirm(dateData);
  };

  const formatExisting = (value, type) => {
    if (!value) return '';
    const d = new Date(value);
    if (type === 'datetime-local') {
      return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    }
    return format(d, 'dd/MM/yyyy', { locale: ptBR });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader className="text-center space-y-3 pb-2">
          <div className="mx-auto w-14 h-14 bg-[#F3E8D6] rounded-2xl flex items-center justify-center">
            <Calendar className="w-7 h-7 text-[#B08954]" />
          </div>
          <DialogTitle className="text-xl font-display font-bold text-[#2D2D2D]">
            {config.title}
          </DialogTitle>
          <DialogDescription className="text-sm text-[#888888] font-light">
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Client name */}
          <div className="bg-[#FAF7F2] rounded-xl p-4 flex items-center justify-between">
            <span className="text-sm text-[#888888] font-light">Cliente</span>
            <span className="text-sm font-medium text-[#2D2D2D]">{project?.client_name || 'Cliente'}</span>
          </div>

          {config.fields.map((field) => {
            const existingValue = project?.[field.key];
            const needsOverwriteDecision = existingValue && overwriteConfirmed[field.key] === false;

            return (
              <div key={field.key} className="space-y-2">
                <Label className="text-sm font-light text-[#888888]">{field.label}</Label>

                {needsOverwriteDecision ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-amber-800">Este campo já tem um valor</p>
                        <p className="text-xs text-amber-600 mt-1">
                          Valor atual: <strong>{formatExisting(existingValue, field.type)}</strong>
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
                        onClick={() => {
                          setOverwriteConfirmed((prev) => ({ ...prev, [field.key]: 'skip' }));
                        }}
                      >
                        Manter atual
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                        onClick={() => {
                          setOverwriteConfirmed((prev) => ({ ...prev, [field.key]: true }));
                        }}
                      >
                        Sobrescrever
                      </Button>
                    </div>
                  </div>
                ) : overwriteConfirmed[field.key] === 'skip' ? (
                  <div className="rounded-xl border border-[#E8E5E0] bg-[#FAF7F2] p-3 flex items-center justify-between">
                    <span className="text-sm text-[#6E6761]">
                      Mantendo: <strong>{formatExisting(existingValue, field.type)}</strong>
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs text-[#888888]"
                      onClick={() => {
                        setOverwriteConfirmed((prev) => ({ ...prev, [field.key]: false }));
                      }}
                    >
                      Alterar
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888888]" />
                    <Input
                      type={field.type}
                      value={values[field.key] || ''}
                      onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      className="pl-10 bg-white border-[#E8E5E0] font-light"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-col">
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="w-full bg-[#B08954] hover:bg-[#9A7644] text-white rounded-xl h-12"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Confirmar e Mover
          </Button>
          <Button
            variant="ghost"
            onClick={onCancel}
            className="w-full text-[#888888] hover:text-[#2D2D2D] rounded-xl"
          >
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}