import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertCircle, CheckCircle2, Lightbulb, Loader2 } from 'lucide-react';

const AI_ANALYSIS_VERSION = 'v2-tatuador';

const responseSchema = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    insights: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['success', 'warning', 'info'] },
          title: { type: 'string' },
          message: { type: 'string' }
        },
        required: ['type', 'title', 'message']
      }
    },
    improvements: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' }
        },
        required: ['title', 'description']
      }
    }
  },
  required: ['summary', 'insights', 'improvements']
};

const toneStyles = {
  success: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    icon: CheckCircle2,
  },
  warning: {
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    icon: AlertCircle,
  },
  info: {
    bg: 'bg-sky-50',
    text: 'text-sky-600',
    icon: Lightbulb,
  },
};

function LoadingCard() {
  return (
    <div className="rounded-[16px] border border-[#E7DED2] bg-[#FCF8F4] p-3 shadow-[0_8px_24px_rgba(35,31,32,0.05)]">
      <div className="flex items-start gap-2.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F3E8D6]">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#B08954]" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="h-3 w-32 rounded-full bg-[#EEE4D7]" />
          <div className="h-3 w-full rounded-full bg-[#F3ECE3]" />
          <div className="h-3 w-3/4 rounded-full bg-[#F3ECE3]" />
        </div>
      </div>
    </div>
  );
}

export default function AIAnalysisPanel({ analysisInput, periodText }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['analysis-ai-insights', AI_ANALYSIS_VERSION, JSON.stringify(analysisInput)],
    queryFn: () => base44.integrations.Core.InvokeLLM({
      prompt: `Você é um assistente de negócio para um tatuador no Brasil. Analise SOMENTE os dados abaixo e responda de forma simples, direta e útil.

Regras:
- Não invente dados.
- Escreva em português do Brasil.
- Traga exatamente 3 insights e exatamente 3 prioridades.
- Use frases curtas e claras.
- Vá direto ao ponto, sem linguagem técnica.
- Se houver poucos dados, diga isso de forma simples.
- Fale sempre de um tatuador, nunca de estúdio, clínica, loja ou equipe.
- Não use expressões como "estúdio", "estúdio de tatuagem", "negócio" ou "empresa".
- Prefira palavras como "você", "seu trabalho", "seus clientes" e "sua agenda".

Dados do período:\n${JSON.stringify(analysisInput, null, 2)}`,
      response_json_schema: responseSchema,
    }),
    staleTime: 1000 * 60 * 10,
  });

  const normalizeAudienceText = (text) => {
    if (!text) return text;
    return text
      .replace(/estúdio de tatuagem/gi, 'trabalho')
      .replace(/estudio de tatuagem/gi, 'trabalho')
      .replace(/estúdio/gi, 'trabalho')
      .replace(/estudio/gi, 'trabalho')
      .replace(/negócio/gi, 'trabalho')
      .replace(/empresa/gi, 'trabalho');
  };

  const normalizedData = data ? {
    ...data,
    summary: normalizeAudienceText(data.summary),
    insights: (data.insights || []).map((item) => ({
      ...item,
      title: normalizeAudienceText(item.title),
      message: normalizeAudienceText(item.message),
    })),
    improvements: (data.improvements || []).map((item) => ({
      ...item,
      title: normalizeAudienceText(item.title),
      description: normalizeAudienceText(item.description),
    })),
  } : null;

  const insights = normalizedData?.insights?.slice(0, 3) || [];
  const improvements = normalizedData?.improvements?.slice(0, 3) || [];

  return (
    <div className="space-y-2.5">
      {isLoading && (
        <div className="space-y-3">
          <LoadingCard />
          <LoadingCard />
          <LoadingCard />
        </div>
      )}

      {isError && (
        <div className="rounded-[18px] border border-[#F0D8C2] bg-[#FFF6EE] p-4 text-sm text-[#8A5B2D] shadow-[0_8px_24px_rgba(35,31,32,0.05)]">
          Não consegui gerar a leitura por IA agora. Tente mudar o período ou recarregar a página.
        </div>
      )}

      {!isLoading && !isError && insights.map((insight, index) => {
        const tone = toneStyles[insight.type] || toneStyles.info;
        const Icon = tone.icon;

        return (
          <motion.div
            key={`${insight.title}-${index}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + index * 0.05 }}
            className="rounded-[16px] border border-[#E7DED2] bg-[#FCF8F4] p-3 shadow-[0_8px_24px_rgba(35,31,32,0.05)]"
          >
            <div className="flex items-start gap-2.5">
              <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${tone.bg}`}>
                <Icon className={`h-3.5 w-3.5 ${tone.text}`} />
              </div>
              <div>
                <h3 className="text-[13px] font-semibold leading-tight text-[#231F20]">{insight.title}</h3>
                <p className="mt-1.5 text-[10.5px] leading-relaxed text-[#6E6761]">{insight.message}</p>
              </div>
            </div>
          </motion.div>
        );
      })}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-[16px] border border-[#E7DED2] bg-[#FCF8F4] p-3 shadow-[0_8px_24px_rgba(35,31,32,0.05)]"
      >
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-amber-50">
            <Lightbulb className="h-3.5 w-3.5 text-amber-600" strokeWidth={1.8} />
          </div>
          <div>
            <h3 className="text-[13px] font-display text-[#231F20]">O que melhorar agora</h3>
            <p className="text-[11px] text-[#7A736C]">Prioridades guiadas por IA para o período</p>
          </div>
        </div>

        {!isLoading && !isError && normalizedData?.summary && (
          <div className="mb-3 rounded-2xl border border-[#EEE4D7] bg-white px-3 py-2.5">
            <p className="text-[10.5px] leading-relaxed text-[#6E6761]">{normalizedData.summary}</p>
          </div>
        )}

        <div className="space-y-3">
          {isLoading && [1, 2, 3].map((item) => (
            <div key={item} className="flex gap-2.5 border-b border-[#EEE4D7] pb-3 last:border-b-0 last:pb-0">
              <div className="h-6 w-6 shrink-0 rounded-full bg-[#E9DCC6]" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-32 rounded-full bg-[#EEE4D7]" />
                <div className="h-3 w-full rounded-full bg-[#F3ECE3]" />
              </div>
            </div>
          ))}

          {!isLoading && !isError && improvements.map((item, index) => (
            <div key={`${item.title}-${index}`} className="flex gap-2.5 border-b border-[#EEE4D7] pb-2.5 last:border-b-0 last:pb-0">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#B89A66] text-[11px] font-semibold text-white">
                {index + 1}
              </div>
              <div>
                <p className="text-sm font-semibold text-[#231F20]">{item.title}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-[#6E6761]">{item.description}</p>
              </div>
            </div>
          ))}

          {!isLoading && !isError && improvements.length === 0 && (
            <p className="text-sm text-[#7A736C]">Ainda não há dados suficientes para gerar prioridades confiáveis.</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}