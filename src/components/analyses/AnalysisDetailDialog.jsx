import React from 'react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
}).format(value || 0);

const formatDate = (value) => {
  if (!value) return 'Sem data';
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return 'Sem data';
  return date.toLocaleDateString('pt-BR');
};

export default function AnalysisDetailDialog({ open, onOpenChange, detail }) {
  if (!detail) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-[28px] border-[#E7DED2] bg-[#FCF8F4] p-0 overflow-hidden">
        <DialogHeader className="border-b border-[#E7DED2] px-6 py-5 text-left">
          <DialogTitle className="font-display text-xl text-[#231F20]">{detail.title}</DialogTitle>
          <DialogDescription className="text-sm text-[#6E6761]">{detail.description}</DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-5">
          {detail.sections.map((section) => (
            <section key={section.title} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-[#231F20]">{section.title}</h3>
                  {section.subtitle && <p className="text-xs text-[#7A736C]">{section.subtitle}</p>}
                </div>
                <span className="rounded-full bg-[#F3E8D6] px-3 py-1 text-xs font-medium text-[#8E6E42]">{section.items.length} itens</span>
              </div>

              {section.items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#DCCFBD] bg-[#FFF9F2] px-4 py-6 text-sm text-[#7A736C]">
                  Nenhum item encontrado neste período.
                </div>
              ) : (
                <div className="space-y-2">
                  {section.items.map((item, index) => (
                    <div key={`${section.title}-${item.id || index}`} className="rounded-2xl border border-[#E9E0D4] bg-white px-4 py-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-[#231F20]">{item.primary}</p>
                          {item.secondary && <p className="mt-1 text-xs text-[#6E6761]">{item.secondary}</p>}
                          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[#7A736C]">
                            {item.dateLabel && <span>Data: {formatDate(item.dateLabel)}</span>}
                            {item.valueLabel !== undefined && <span>Valor: {formatCurrency(item.valueLabel)}</span>}
                            {item.stage && <span>Etapa: {item.stage}</span>}
                          </div>
                        </div>
                        {item.link && (
                          <Button asChild size="sm" variant="outline" className="rounded-xl border-[#DCCFBD] bg-transparent text-[#5D544B] hover:bg-[#F4EEE7]">
                            <Link to={item.link}>Abrir</Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}