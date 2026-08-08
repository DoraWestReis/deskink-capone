import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Calendar, RefreshCcw, MessageCircle, Info } from 'lucide-react';

const attendanceOptions = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'compareceu', label: 'Compareceu' },
  { value: 'no_show', label: 'No-show' },
];

const postSaleOptions = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'feito', label: 'Feito' },
];

function InfoLabel({ icon: IconComponent, children, tooltip }) {
  return (
    <Label className="text-xs text-slate-500 flex items-center gap-1.5">
      {IconComponent ? <IconComponent className="w-3 h-3" /> : null}
      {children}
      {tooltip ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
          </TooltipTrigger>
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
      ) : null}
    </Label>
  );
}

export default function ProjectFollowUpDetails({ project, onChange, disabled }) {
  return (
    <TooltipProvider>
      <div className="rounded-[24px] border border-[#E7DED2] bg-[#FCF8F4] p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <InfoLabel icon={Calendar} tooltip="Status de comparecimento na avaliação presencial">
              Comparecimento à avaliação
            </InfoLabel>
            <Select
              value={project?.attendance_status || 'pendente'}
              onValueChange={(value) => onChange({ ...project, attendance_status: value })}
              disabled={disabled}
            >
              <SelectTrigger className="bg-white border-[#E7DED2]">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {attendanceOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <InfoLabel icon={MessageCircle} tooltip="Status do acompanhamento de pós-venda">
              Pós-venda
            </InfoLabel>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_220px]">
              <Select
                value={project?.post_sale_status || 'pendente'}
                onValueChange={(value) => onChange({ ...project, post_sale_status: value })}
                disabled={disabled}
              >
                <SelectTrigger className="bg-white border-[#E7DED2]">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {postSaleOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <label
                htmlFor="needs_retouch"
                className={`flex h-10 items-center gap-2 rounded-xl border border-[#E7DED2] bg-white px-3 text-sm text-[#231F20] ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
              >
                <Checkbox
                  id="needs_retouch"
                  checked={project?.needs_retouch || false}
                  onCheckedChange={(checked) => onChange({ ...project, needs_retouch: Boolean(checked) })}
                  disabled={disabled}
                />
                <RefreshCcw className="h-3.5 w-3.5 text-slate-500" />
                <span>Precisa de retoque</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}