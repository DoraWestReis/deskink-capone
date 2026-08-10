import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, Upload } from 'lucide-react';
import { parseCalendarRows } from '@/components/importcsv/parseCalendarRows';
import ImportPreviewTable from '@/components/importcsv/ImportPreviewTable';

const FILE_URL = 'https://media.base44.com/files/public/6a7722b41d819a5df67c6c12/59e77486c_agendamentos_boca_tattoo_completo.xlsx';

const SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      titulo: { type: 'string' },
      data_inicio: { type: 'string' },
      data_termino: { type: 'string' },
      descricao_contato: { type: 'string' },
      status: { type: 'string' },
    },
  },
};

export default function ImportCSV() {
  const [state, setState] = useState('idle');
  const [preview, setPreview] = useState(null);
  const [log, setLog] = useState([]);
  const [progress, setProgress] = useState({ sent: 0, total: 0 });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const addLog = (msg) => setLog((prev) => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);

  const handleExtract = async () => {
    setState('extracting');
    setError('');
    const res = await base44.integrations.Core.ExtractDataFromUploadedFile({ file_url: FILE_URL, json_schema: SCHEMA });
    if (res.status === 'error' || !res.output?.length) {
      setError(res.details || 'Nenhum dado encontrado na planilha.');
      setState('idle');
      return;
    }
    setPreview(parseCalendarRows(res.output));
    setState('preview');
  };

  const handleImport = async () => {
    setState('importing');
    setLog([]);
    const groups = preview.groups;
    const batchSize = 5;
    const totalBatches = Math.ceil(groups.length / batchSize);
    setProgress({ sent: 0, total: groups.length });

    let clients = 0;
    let projects = 0;
    const errors = [];

    for (let i = 0; i < totalBatches; i++) {
      const batch = groups.slice(i * batchSize, (i + 1) * batchSize);
      addLog(`Enviando lote ${i + 1}/${totalBatches} (${batch.length} clientes)...`);
      let attempt = 0;
      let done = false;
      while (!done && attempt < 6) {
        attempt += 1;
        try {
          const response = await base44.functions.invoke('importCalendarSessions', { groups: batch });
          clients += response.data?.clients_created || 0;
          projects += response.data?.projects_created || 0;
          if (response.data?.errors?.length) errors.push(...response.data.errors);
          addLog(`✅ Lote ${i + 1}: ${response.data?.clients_created} clientes, ${response.data?.projects_created} projetos`);
          done = true;
        } catch (e) {
          const isRateLimit = e?.response?.status === 429 || String(e.message).includes('429');
          if (isRateLimit && attempt < 6) {
            const wait = 5000 * attempt;
            addLog(`⏳ Limite de requisições no lote ${i + 1}. Nova tentativa em ${wait / 1000}s...`);
            await new Promise((r) => setTimeout(r, wait));
          } else {
            errors.push(`Lote ${i + 1}: ${e.message}`);
            addLog(`❌ Lote ${i + 1} falhou: ${e.message}`);
            done = true;
          }
        }
      }
      setProgress({ sent: Math.min((i + 1) * batchSize, groups.length), total: groups.length });
      if (i < totalBatches - 1) await new Promise((r) => setTimeout(r, 4000));
    }

    addLog('--- CONCLUÍDO ---');
    setResult({ clients, projects, withoutContact: preview.withoutContact, errors });
    setState('done');
  };

  return (
    <div className="min-h-screen bg-[#18151B] px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Importar agendamentos do Google Agenda</h1>
          <p className="mt-1 text-sm text-white/50">Leia a planilha, revise a prévia e confirme para criar clientes e projetos.</p>
        </div>

        {(state === 'idle' || state === 'extracting') && (
          <div className="rounded-2xl border border-[#E6DDD2] bg-white p-6">
            <p className="mb-4 text-sm text-[#7A736C]">A planilha de agendamentos já está vinculada. Clique abaixo para ler os dados e gerar a prévia.</p>
            <Button onClick={handleExtract} disabled={state === 'extracting'} className="rounded-2xl bg-[#B89A66] text-white hover:bg-[#A88959]">
              {state === 'extracting' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Lendo planilha...</> : <><Upload className="mr-2 h-4 w-4" /> Ler planilha</>}
            </Button>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </div>
        )}

        {state === 'preview' && preview && (
          <>
            <div className="grid grid-cols-3 gap-3">
              {[['Clientes', preview.totalClients], ['Sessões', preview.totalSessions], ['Sem contato', preview.withoutContact]].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-[#E6DDD2] bg-white p-4">
                  <p className="text-xs uppercase tracking-wide text-[#7A736C]">{label}</p>
                  <p className="text-2xl font-bold text-[#231F20]">{value}</p>
                </div>
              ))}
            </div>
            <ImportPreviewTable groups={preview.groups} />
            <div className="flex gap-3">
              <Button onClick={handleImport} className="rounded-2xl bg-[#B89A66] text-white hover:bg-[#A88959]">Confirmar e Importar</Button>
              <Button variant="outline" onClick={() => { setPreview(null); setState('idle'); }} className="rounded-2xl bg-white">Cancelar</Button>
            </div>
          </>
        )}

        {(state === 'importing' || state === 'done') && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#E6DDD2] bg-white p-4">
              <div className="h-3 rounded-full bg-[#F1EAE1]">
                <div className="h-3 rounded-full bg-[#B89A66] transition-all" style={{ width: `${progress.total ? (progress.sent / progress.total) * 100 : 0}%` }} />
              </div>
              <p className="mt-2 text-sm text-[#7A736C]">{progress.sent}/{progress.total} clientes processados</p>
            </div>

            {result && (
              <div className="rounded-2xl border border-[#E6DDD2] bg-white p-4 text-sm text-[#231F20]">
                <p className="font-bold">Importação concluída</p>
                <p>{result.clients} clientes criados · {result.projects} projetos criados · {result.withoutContact} sem contato</p>
                {result.errors.length > 0 && <p className="mt-2 text-red-600">{result.errors.length} erro(s): {result.errors.join(' | ')}</p>}
              </div>
            )}

            <div className="max-h-[400px] overflow-y-auto rounded-2xl border border-[#E6DDD2] bg-white p-4">
              {log.map((entry, i) => <p key={i} className="mb-1 font-mono text-xs text-[#7A736C]">{entry}</p>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}