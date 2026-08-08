import React from 'react';
import { addDays, format, parseISO } from 'date-fns';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Palette, DollarSign, Calendar, CreditCard, Clock, Info, MessageCircle } from 'lucide-react';
import ProjectSectionCard from '@/components/forms/ProjectSectionCard';
import ClearableDate from '@/components/forms/ClearableDate';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import CommissionSimulator from '@/components/project/CommissionSimulator';
import TattooPaymentsEditor from '@/components/forms/TattooPaymentsEditor';

const tattooStyles = [
  'Fineline',
  'Realismo / Preto e cinza',
  'Cobertura',
  'Reforma',
  'Colorido',
  'Maori / Tribal',
  'Micro-realismo',
  'Ornamental / Pontilhismo / Geométrico',
  'Old School / New School',
  'Black Work',
];

const sessionDurations = [30, 60, 90, 120, 150, 180, 240, 300, 360, 480];
const presencialDurations = [30, 60, 90, 120, 150, 180];
const revisionDurations = [30, 60, 90, 120, 150, 180, 240];

const getPaymentMethods = (settings) => ([
  settings?.pix_label || 'Pix',
  settings?.cash_label || 'Dinheiro',
  settings?.card_no_interest_label || 'Cartão sem juros',
  settings?.card_with_interest_label || 'Cartão com juros',
  settings?.other_label || 'Outros',
]);

const getSuggestedRevisionDate = (tattooDate, revisionDays = 20) => {
  if (!tattooDate) return '';
  return format(addDays(parseISO(`${tattooDate}T00:00:00`), revisionDays), 'yyyy-MM-dd');
};

const getSuggestedPosVendaDate = (revisionDate, posVendaDays = 60) => {
  if (!revisionDate) return '';
  return format(addDays(parseISO(`${revisionDate}T00:00:00`), posVendaDays), "yyyy-MM-dd'T'HH:mm");
};

const handleTattooDateChange = (project, onChange, value, settings) => {
  const revisionDays = settings?.revision_days || 20;
  const suggestedRevisionDate = getSuggestedRevisionDate(value, revisionDays);
  const currentRevisionDate = project?.revision_datetime?.slice(0, 10) || project?.revision_date || '';
  const previousTattooDate = project?.tattoo_date || '';
  const dayDifference = previousTattooDate && currentRevisionDate
    ? Math.round((parseISO(`${currentRevisionDate}T00:00:00`) - parseISO(`${previousTattooDate}T00:00:00`)) / (1000 * 60 * 60 * 24))
    : null;
  const shouldAutoUpdateRevision = !currentRevisionDate || dayDifference === revisionDays;

  onChange({
    ...project,
    tattoo_date: value,
    revision_date: shouldAutoUpdateRevision ? suggestedRevisionDate : project.revision_date,
    revision_datetime: shouldAutoUpdateRevision
      ? (suggestedRevisionDate ? `${suggestedRevisionDate}T12:00:00-03:00` : project.revision_datetime)
      : project.revision_datetime,
  });
};

const normalizeLocalDateTime = (value) => {
  if (!value) return '';
  let normalized = value;
  if (!normalized.includes('T')) normalized = `${normalized}T00:00:00`;
  if (normalized.length === 16) normalized = `${normalized}:00`;
  if (!normalized.includes('Z') && !normalized.includes('+') && !normalized.includes('-', 10)) {
    normalized = `${normalized}-03:00`;
  }
  return normalized;
};

const handleRevisionDateTimeChange = (project, onChange, value, settings) => {
  const revisionDate = value ? value.slice(0, 10) : '';
  const posVendaDays = settings?.pos_venda_days || 60;
  const suggestedPosVenda = getSuggestedPosVendaDate(revisionDate, posVendaDays);
  onChange({
    ...project,
    revision_datetime: normalizeLocalDateTime(value),
    revision_date: revisionDate,
    post_sale_contact_date: project.post_sale_contact_date || suggestedPosVenda,
  });
};

function FieldLabel({ icon: IconComponent, children, tooltip }) {
  return (
    <Label className="flex items-center gap-1.5 text-xs font-medium text-[#8E99AB]">
      {IconComponent ? <IconComponent className="h-3 w-3" /> : null}
      {children}
      {tooltip ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-3.5 w-3.5 cursor-help text-[#B8C1CF]" />
          </TooltipTrigger>
          <TooltipContent className="max-w-[260px] rounded-xl border border-[#E7DED2] bg-[#FBF7F2] px-3 py-2 text-[11px] leading-relaxed text-[#6B7280] shadow-none">{tooltip}</TooltipContent>
        </Tooltip>
      ) : null}
    </Label>
  );
}

function formatDurationLabel(minutes) {
  if (minutes === 60) return '1 hora';
  if (minutes === 90) return '1h30';
  if (minutes === 120) return '2 horas';
  if (minutes === 150) return '2h30';
  if (minutes === 180) return '3 horas';
  if (minutes === 240) return '4 horas';
  if (minutes === 300) return '5 horas';
  if (minutes === 360) return '6 horas';
  if (minutes === 480) return '8 horas';
  return `${minutes} min`;
}

function DurationSelect({ value, onValueChange, disabled, options }) {
  return (
    <Select value={String(value)} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="border-[#E7DED2] bg-white">
        <SelectValue placeholder="Duração" />
      </SelectTrigger>
      <SelectContent className="border-[#E7DED2] bg-[#FBF7F2] text-[#231F20]">
        {options.map((minutes) => (
          <SelectItem key={minutes} value={String(minutes)} className="text-[#231F20] focus:bg-[#F4EEE7] focus:text-[#231F20]">
            {formatDurationLabel(minutes)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function ProjectForm({ project, onChange, disabled, appointmentType = 'sessao_tatuagem', settings }) {
  const isPresencial = appointmentType === 'orcamento_presencial';
  const paymentMethods = getPaymentMethods(settings);
  const cardWithInterestLabel = settings?.card_with_interest_label || 'Cartão com juros';
  const showInstallments = !isPresencial && (project?.total_value_confirmed_method || project?.payment_method) === cardWithInterestLabel;

  return (
    <div className="space-y-4">
      {!isPresencial && project?.total_value && (project?.total_value_confirmed_method || project?.payment_method) && settings && (
        <CommissionSimulator
          totalValue={project.total_value}
          paymentMethod={project.total_value_confirmed_method || project.payment_method}
          installments={project.installments}
          settings={settings}
        />
      )}

      <TooltipProvider>
        <div className="space-y-4">
          <div className="space-y-2">
            <FieldLabel icon={Palette}>
              Descrição da Tatuagem *
            </FieldLabel>
            <Textarea
              value={project?.description || ''}
              onChange={(e) => onChange({ ...project, description: e.target.value })}
              placeholder="Descreva o projeto..."
              disabled={disabled}
              className="min-h-[80px] border-[#E7DED2] bg-white text-[#231F20] placeholder:text-[#B7AEA4] focus:bg-white transition-colors"
            />
          </div>

          <div className="space-y-2">
            <FieldLabel>Estilo</FieldLabel>
            <Select
              value={project?.style || ''}
              onValueChange={(value) => onChange({ ...project, style: value })}
              disabled={disabled}
            >
              <SelectTrigger className="border-[#E7DED2] bg-white text-[#231F20]">
                <SelectValue placeholder="Selecione o estilo" />
              </SelectTrigger>
              <SelectContent className="border-[#E7DED2] bg-[#FBF7F2] text-[#231F20]">
                {tattooStyles.map((style) => (
                  <SelectItem key={style} value={style}>{style}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!isPresencial && (
            <ProjectSectionCard title="Financeiro">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 items-start">
                <ProjectSectionCard title="Tatuagem" className="bg-white">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <FieldLabel icon={DollarSign} tooltip="Valor total combinado do projeto, incluindo o sinal já pago ou previsto.">Valor Total</FieldLabel>
                      <Input
                        type="number"
                        value={project?.total_value || ''}
                        onChange={(e) => onChange({ ...project, total_value: parseFloat(e.target.value) || 0 })}
                        placeholder="0,00"
                        disabled={disabled}
                        className="border-[#E7DED2] bg-white text-[#231F20] placeholder:text-[#B7AEA4] focus:bg-white transition-colors"
                      />
                    </div>

                    <div className="space-y-2">
                      <FieldLabel icon={CreditCard} tooltip="Forma de pagamento usada no valor principal da tatuagem.">Forma de Pagamento</FieldLabel>
                      <Select
                        value={project?.total_value_confirmed_method || project?.payment_method || ''}
                        onValueChange={(value) => onChange({
                          ...project,
                          payment_method: value,
                          total_value_confirmed_method: value,
                          installments: value === cardWithInterestLabel ? (project?.installments || 1) : undefined,
                        })}
                        disabled={disabled}
                      >
                        <SelectTrigger className="border-[#E7DED2] bg-white text-[#231F20] data-[placeholder]:text-[#B7AEA4]">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent className="border-[#E7DED2] bg-[#FBF7F2] text-[#231F20]">
                          {paymentMethods.map((method) => (
                            <SelectItem key={method} value={method}>{method}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <FieldLabel icon={Calendar} tooltip="Data em que o pagamento da tatuagem foi recebido.">Data do Pagamento</FieldLabel>
                      <ClearableDate
                        type="date"
                        value={project?.payment_date || ''}
                        onChange={(v) => onChange({ ...project, payment_date: v })}
                        disabled={disabled}
                        className="border-[#E7DED2] bg-white text-[#231F20] placeholder:text-[#B7AEA4] focus:bg-white transition-colors"
                      />
                    </div>

                    <div className="pt-3 border-t border-[#EEE7DD]">
                      <TattooPaymentsEditor
                        payments={project?.tattoo_payments || []}
                        paymentMethods={paymentMethods}
                        onChange={(rows) => onChange({ ...project, tattoo_payments: rows })}
                        disabled={disabled}
                      />
                    </div>

                    {showInstallments && (
                      <div className="space-y-2">
                        <FieldLabel icon={CreditCard} tooltip="Número de parcelas definido para o pagamento principal.">Parcelamento</FieldLabel>
                        <Select
                          value={project?.installments?.toString() || '1'}
                          onValueChange={(value) => onChange({ ...project, installments: parseInt(value) })}
                          disabled={disabled}
                        >
                          <SelectTrigger className="bg-slate-50 border-slate-200">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent className="border-[#E7DED2] bg-[#FBF7F2] text-[#231F20]">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                              <SelectItem key={num} value={num.toString()} className="text-[#231F20] focus:bg-[#F4EEE7] focus:text-[#231F20]">
                                {num}x {num > 1 ? `de R$ ${((project?.total_value || 0) / num).toFixed(2)}` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </ProjectSectionCard>

                <ProjectSectionCard title="Sinal" className="bg-white">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <FieldLabel icon={DollarSign} tooltip="Valor cobrado para confirmar o agendamento do projeto.">Valor do Sinal</FieldLabel>
                      <Input
                        type="number"
                        value={project?.deposit_value || ''}
                        onChange={(e) => onChange({ ...project, deposit_value: parseFloat(e.target.value) || 0 })}
                        placeholder="0,00"
                        disabled={disabled}
                        className="border-[#E7DED2] bg-white text-[#231F20] placeholder:text-[#B7AEA4] focus:bg-white transition-colors"
                      />
                    </div>

                    <div className="space-y-2">
                      <FieldLabel icon={CreditCard} tooltip="Forma de pagamento usada para receber o sinal do cliente.">Forma de Pagamento</FieldLabel>
                      <Select
                        value={project?.deposit_confirmed_method || ''}
                        onValueChange={(value) => onChange({ ...project, deposit_confirmed_method: value })}
                        disabled={disabled}
                      >
                        <SelectTrigger className="border-[#E7DED2] bg-white text-[#231F20] data-[placeholder]:text-[#B7AEA4]">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent className="border-[#E7DED2] bg-[#FBF7F2] text-[#231F20]">
                          {paymentMethods.map((method) => (
                            <SelectItem key={method} value={method}>{method}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <FieldLabel icon={Calendar} tooltip="Data em que o sinal foi pago pelo cliente.">Data do Pagamento</FieldLabel>
                      <ClearableDate
                        type="date"
                        value={project?.deposit_confirmed_at ? project.deposit_confirmed_at.slice(0, 10) : ''}
                        onChange={(v) => onChange({
                          ...project,
                          deposit_confirmed_at: v ? `${v}T12:00:00-03:00` : '',
                        })}
                        disabled={disabled}
                        className="border-[#E7DED2] bg-white text-[#231F20] placeholder:text-[#B7AEA4] focus:bg-white transition-colors"
                      />
                    </div>
                  </div>
                </ProjectSectionCard>
              </div>
            </ProjectSectionCard>
          )}

          <ProjectSectionCard title="Pré-Tatuagem">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel icon={Calendar} tooltip="Data em que aconteceu ou foi agendada a avaliação presencial com o cliente.">Data da Avaliação</FieldLabel>
                <ClearableDate
                  type="date"
                  value={project?.evaluation_date || ''}
                  onChange={(v) => onChange({ ...project, evaluation_date: v })}
                  disabled={disabled}
                  className="border-[#E7DED2] bg-white text-[#231F20] placeholder:text-[#B7AEA4] focus:bg-white transition-colors"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel icon={Calendar} tooltip="Data em que o projeto da tatuagem foi confirmado/finalizado.">Data do Fechamento</FieldLabel>
                <ClearableDate
                  type="date"
                  value={project?.closing_date || ''}
                  onChange={(v) => onChange({ ...project, closing_date: v })}
                  disabled={disabled}
                  className="border-[#E7DED2] bg-white text-[#231F20] placeholder:text-[#B7AEA4] focus:bg-white transition-colors"
                />
              </div>
            </div>
          </ProjectSectionCard>

          <ProjectSectionCard title="Tatuagem">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel icon={Calendar} tooltip="Data e hora agendadas para o atendimento. É o compromisso marcado na agenda.">Data da Sessão</FieldLabel>
                <ClearableDate
                  type="datetime-local"
                  value={project?.session_date ? project.session_date.substring(0, 16) : ''}
                  onChange={(v) => onChange({ ...project, session_date: v })}
                  disabled={disabled}
                  className="border-[#E7DED2] bg-white text-[#231F20] placeholder:text-[#B7AEA4] focus:bg-white transition-colors"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel icon={Clock} tooltip="Duração da sessão em minutos">Duração da Sessão</FieldLabel>
                <DurationSelect
                  value={project?.session_duration_minutes || (isPresencial ? 60 : 120)}
                  onValueChange={(value) => onChange({ ...project, session_duration_minutes: parseInt(value) })}
                  disabled={disabled}
                  options={isPresencial ? presencialDurations : sessionDurations}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <FieldLabel icon={Calendar} tooltip="Data em que a tatuagem foi finalizada. Ela só será diferente da data da sessão quando houver necessidade de mais de um atendimento, remarcação ou ajuste no processo.">Data da Finalização da Tatuagem</FieldLabel>
                <ClearableDate
                  type="date"
                  value={project?.tattoo_date || ''}
                  onChange={(v) => handleTattooDateChange(project, onChange, v, settings)}
                  disabled={disabled}
                  className="border-[#E7DED2] bg-white text-[#231F20] placeholder:text-[#B7AEA4] focus:bg-white transition-colors"
                />
              </div>
            </div>
          </ProjectSectionCard>

          {!isPresencial && (
            <ProjectSectionCard title="Pós-Tatuagem">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <FieldLabel icon={Calendar} tooltip="Data e hora marcadas para a revisão do trabalho após a tatuagem.">Data e Hora da Revisão</FieldLabel>
                    <ClearableDate
                      type="datetime-local"
                      value={project?.revision_datetime ? project.revision_datetime.substring(0, 16) : project?.revision_date ? `${project.revision_date}T12:00` : ''}
                      onChange={(v) => handleRevisionDateTimeChange(project, onChange, v, settings)}
                      disabled={disabled}
                      className="border-[#E7DED2] bg-white text-[#231F20] placeholder:text-[#B7AEA4] focus:bg-white transition-colors"
                    />
                  </div>

                  <div className="space-y-2">
                    <FieldLabel icon={Clock} tooltip="Duração da revisão">Duração da Revisão</FieldLabel>
                    <DurationSelect
                      value={project?.revision_duration_minutes || 60}
                      onValueChange={(value) => onChange({ ...project, revision_duration_minutes: parseInt(value) })}
                      disabled={disabled}
                      options={revisionDurations}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <FieldLabel icon={Calendar} tooltip="Data em que foi feito ou está previsto o contato com o cliente após a revisão.">Data do Contato Pós-Venda</FieldLabel>
                    <ClearableDate
                      type="datetime-local"
                      value={project?.post_sale_contact_date ? project.post_sale_contact_date.substring(0, 16) : ''}
                      onChange={(v) => onChange({ ...project, post_sale_contact_date: v })}
                      disabled={disabled}
                      className="border-[#E7DED2] bg-white text-[#231F20] placeholder:text-[#B7AEA4] focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                <div className="rounded-[18px] border border-[#EEE7DD] bg-[#FDFBF8] p-3 sm:p-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_190px] md:items-end">
                    <div className="space-y-2">
                      <FieldLabel icon={MessageCircle} tooltip="Status do acompanhamento de pós-venda">Pós-venda</FieldLabel>
                      <Select
                        value={project?.post_sale_status || 'pendente'}
                        onValueChange={(value) => onChange({ ...project, post_sale_status: value })}
                        disabled={disabled}
                      >
                        <SelectTrigger className="border-[#E7DED2] bg-white text-[#231F20] data-[placeholder]:text-[#B7AEA4]">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent className="border-[#E7DED2] bg-[#FBF7F2] text-[#231F20]">
                          <SelectItem value="pendente" className="text-[#231F20] focus:bg-[#F4EEE7] focus:text-[#231F20]">Pendente</SelectItem>
                          <SelectItem value="feito" className="text-[#231F20] focus:bg-[#F4EEE7] focus:text-[#231F20]">Feito</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <label
                      htmlFor="needs_retouch"
                      className={`flex h-10 items-center gap-2 rounded-xl border border-[#E7DED2] bg-white px-3 text-sm text-[#6F7F95] ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                    >
                      <input
                        id="needs_retouch"
                        type="checkbox"
                        checked={project?.needs_retouch || false}
                        onChange={(e) => onChange({ ...project, needs_retouch: e.target.checked })}
                        disabled={disabled}
                        className="h-4 w-4 rounded border-[#D9D0C3] text-[#B89A66]"
                      />
                      <span>Precisa de retoque</span>
                    </label>
                  </div>
                </div>
              </div>
            </ProjectSectionCard>
          )}
        </div>
      </TooltipProvider>

      <TooltipProvider>
        <div className="space-y-2 pt-1">
          <FieldLabel>Observações</FieldLabel>
          <Textarea
            value={project?.notes || ''}
            onChange={(e) => onChange({ ...project, notes: e.target.value })}
            placeholder="Notas adicionais..."
            disabled={disabled}
            className="min-h-[88px] rounded-[18px] border-[#EEE7DD] bg-[#FDFBF8] text-[#6F7F95] placeholder:text-[#B7AEA4] shadow-none focus:bg-[#FDFBF8]"
          />
        </div>
      </TooltipProvider>
    </div>
  );
}