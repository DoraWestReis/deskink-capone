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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DollarSign, CheckCircle2, Banknote, Calendar } from 'lucide-react';
import { getProjectRemainingBalance } from '@/components/utils/paymentMetrics';

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

/**
 * type: "deposit" | "total_value"
 * project: the project object
 * open: boolean
 * onConfirm: (data) => void  — called with confirmed values
 * onCancel: () => void
 */
export default function PaymentConfirmationDialog({ type, project, open, onConfirm, onCancel }) {
  const isDeposit = type === 'deposit';

  const defaultValue = isDeposit ? (project?.deposit_value || 0) : getProjectRemainingBalance(project);
  const defaultMethod = project?.payment_method || '';

  const [confirmedValue, setConfirmedValue] = useState(defaultValue);
  const [confirmedMethod, setConfirmedMethod] = useState(defaultMethod);
  const [confirmedDate, setConfirmedDate] = useState('');

  useEffect(() => {
    if (open) {
      setConfirmedValue(isDeposit ? (project?.deposit_value || 0) : getProjectRemainingBalance(project));
      setConfirmedMethod(project?.payment_method || '');
      setConfirmedDate(
        isDeposit
          ? (project?.deposit_confirmed_at ? project.deposit_confirmed_at.slice(0, 10) : '')
          : (project?.payment_date || (project?.total_value_confirmed_at ? project.total_value_confirmed_at.slice(0, 10) : ''))
      );
    }
  }, [open, project, isDeposit]);

  const handleConfirm = () => {
    onConfirm({
      value: confirmedValue,
      method: confirmedMethod,
      date: confirmedDate,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader className="text-center space-y-3 pb-2">
          <div className="mx-auto w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center">
            <Banknote className="w-7 h-7 text-emerald-600" />
          </div>
          <DialogTitle className="text-xl font-display font-bold text-[#2D2D2D]">
            {isDeposit ? 'Confirmar Recebimento do Sinal' : 'Confirmar Recebimento do Valor'}
          </DialogTitle>
          <DialogDescription className="text-sm text-[#888888] font-light">
            {isDeposit
              ? 'Você recebeu o sinal deste projeto? Confirme o valor e a forma de pagamento.'
              : 'Você recebeu o valor total da tatuagem? Confirme o valor e a forma de pagamento.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Client name */}
          <div className="bg-[#FAF7F2] rounded-xl p-4 flex items-center justify-between">
            <span className="text-sm text-[#888888] font-light">Cliente</span>
            <span className="text-sm font-medium text-[#2D2D2D]">{project?.client_name || 'Cliente'}</span>
          </div>

          {/* Value */}
          <div className="space-y-2">
            <Label className="text-sm font-light text-[#888888]">
              {isDeposit ? 'Valor do Sinal' : 'Valor Total'}
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888888]" />
              <Input
                type="number"
                value={confirmedValue}
                onChange={(e) => setConfirmedValue(parseFloat(e.target.value) || 0)}
                className="pl-10 bg-white border-[#E8E5E0] font-light text-lg"
                step="0.01"
              />
            </div>
            <p className="text-xs text-[#888888] font-light">
              Valor registrado: {formatCurrency(defaultValue)}
            </p>
          </div>

          {/* Payment method */}
          <div className="space-y-2">
            <Label className="text-sm font-light text-[#888888]">Forma de Pagamento</Label>
            <Select value={confirmedMethod} onValueChange={setConfirmedMethod}>
              <SelectTrigger className="bg-white border-[#E8E5E0] font-light">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pix">Pix</SelectItem>
                <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                <SelectItem value="Cartão sem juros">Cartão sem juros</SelectItem>
                <SelectItem value="Cartão com juros">Cartão com juros</SelectItem>
                <SelectItem value="Outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-light text-[#888888]">
              {isDeposit ? 'Data do pagamento do sinal' : 'Data do pagamento'}
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888888]" />
              <Input
                type="date"
                value={confirmedDate}
                onChange={(e) => setConfirmedDate(e.target.value)}
                className="pl-10 bg-white border-[#E8E5E0] font-light"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-col">
          <Button
            onClick={handleConfirm}
            disabled={!confirmedMethod || confirmedValue <= 0 || !confirmedDate}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Confirmar Recebimento
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