import React from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ClearableDate from '@/components/forms/ClearableDate';
import { Plus, Trash2, Layers } from 'lucide-react';

export default function TattooPaymentsEditor({ payments = [], paymentMethods = [], onChange, disabled }) {
  const total = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

  const updateRow = (index, field, value) => {
    const rows = payments.map((row, i) => (i === index ? { ...row, [field]: value } : row));
    onChange(rows);
  };

  const addRow = () => {
    onChange([...payments, { amount: '', method: '', date: '' }]);
  };

  const removeRow = (index) => {
    onChange(payments.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3 border-t border-[#EEE7DD] pt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium text-[#8E99AB]">
          <Layers className="h-3 w-3" />
          Formas e Datas de Pagamento
        </div>
        {payments.length > 0 && (
          <span className="text-xs font-semibold text-[#231F20]">
            Total: R$ {total.toFixed(2)}
          </span>
        )}
      </div>

      {payments.length === 0 ? (
        <p className="text-xs text-[#8E99AB]">
          Use os campos acima para um único pagamento, ou adicione linhas abaixo quando o cliente pagar de várias formas/datas.
        </p>
      ) : (
        <div className="space-y-2">
          {payments.map((row, index) => (
            <div key={index} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-center">
              <Input
                type="number"
                value={row.amount || ''}
                onChange={(e) => updateRow(index, 'amount', parseFloat(e.target.value) || 0)}
                placeholder="Valor"
                disabled={disabled}
                className="border-[#E7DED2] bg-white text-[#231F20] placeholder:text-[#B7AEA4]"
              />
              <Select
                value={row.method || ''}
                onValueChange={(value) => updateRow(index, 'method', value)}
                disabled={disabled}
              >
                <SelectTrigger className="border-[#E7DED2] bg-white text-[#231F20] data-[placeholder]:text-[#B7AEA4]">
                  <SelectValue placeholder="Forma" />
                </SelectTrigger>
                <SelectContent className="border-[#E7DED2] bg-[#FBF7F2] text-[#231F20]">
                  {paymentMethods.map((method) => (
                    <SelectItem key={method} value={method}>{method}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ClearableDate
                type="date"
                value={row.date || ''}
                onChange={(v) => updateRow(index, 'date', v)}
                disabled={disabled}
                className="border-[#E7DED2] bg-white text-[#231F20] placeholder:text-[#B7AEA4]"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => removeRow(index)}
                disabled={disabled}
                className="border-[#E7DED2] bg-white text-[#B85C5C] hover:bg-[#FDF2F2] hover:text-[#B85C5C]"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={addRow}
        disabled={disabled}
        className="h-9 rounded-xl border-[#E5DDD2] bg-white text-xs text-[#231F20] hover:bg-[#F8F2EA] gap-1.5"
      >
        <Plus className="h-3.5 w-3.5" />
        Adicionar forma de pagamento
      </Button>
    </div>
  );
}