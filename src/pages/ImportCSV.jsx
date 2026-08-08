import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Loader2 } from 'lucide-react';

export default function ImportCSV() {
  const [status, setStatus] = useState('idle');
  const [log, setLog] = useState([]);
  const [progress, setProgress] = useState({ sent: 0, total: 0 });

  const addLog = (msg) => setLog(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);

  const handleImport = async () => {
    setStatus('loading');
    setLog([]);
    addLog('Extraindo dados da planilha XLSX...');

    const fileUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69717b3c6d0ef62a22f5c054/e7d56d2d0_Base_Consolidada_Com_Datas.xlsx';

    const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url: fileUrl,
      json_schema: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            project: { type: "string" },
            stage: { type: "string" },
            stage_date: { type: "string" },
            scheduled_date: { type: "string" },
            notes: { type: "string" },
            phone: { type: "string" },
            ltv: { type: "string" },
            origin: { type: "string" },
            value: { type: "string" },
          }
        }
      }
    });

    if (extractResult.status === 'error') {
      addLog(`❌ Erro ao extrair dados: ${extractResult.details}`);
      setStatus('done');
      return;
    }

    const rows = extractResult.output;
    if (!rows || rows.length === 0) {
      addLog('❌ Nenhum dado encontrado na planilha');
      setStatus('done');
      return;
    }

    addLog(`Total de linhas extraídas: ${rows.length}`);

    // Client map maintained on frontend to avoid duplicates across batches
    const clientMap = {}; // normalizedName -> { id, seq, ltv }

    const batchSize = 5;
    const totalBatches = Math.ceil(rows.length / batchSize);
    setProgress({ sent: 0, total: rows.length });

    let totalClients = 0;
    let totalReused = 0;
    let totalProjects = 0;
    let errors = [];

    for (let i = 0; i < totalBatches; i++) {
      const batch = rows.slice(i * batchSize, (i + 1) * batchSize);

      addLog(`Enviando lote ${i + 1}/${totalBatches} (${batch.length} linhas)...`);

      let result = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await base44.functions.invoke('importExcelData', {
            rows: batch,
            existingClientMap: clientMap,
          });
          result = response.data;
          break;
        } catch (e) {
          addLog(`⚠️ Lote ${i + 1} falhou (tentativa ${attempt + 1}/3): ${e.message}`);
          if (attempt < 2) await new Promise(r => setTimeout(r, 5000));
        }
      }

      if (result) {
        totalClients += result.clients_created || 0;
        totalReused += result.clients_reused || 0;
        totalProjects += result.projects_created || 0;
        if (result.errors?.length) errors.push(...result.errors);

        // Update local client map with newly created clients
        if (result.new_clients) {
          for (const nc of result.new_clients) {
            clientMap[nc.normalizedName] = { id: nc.id, seq: nc.seq, ltv: nc.ltv };
          }
        }

        addLog(`✅ Lote ${i + 1}: ${result.clients_created} novos clientes, ${result.clients_reused} reutilizados, ${result.projects_created} projetos`);
      } else {
        errors.push(`Lote ${i + 1} falhou após 3 tentativas`);
        addLog(`❌ Lote ${i + 1} falhou após 3 tentativas`);
      }

      setProgress({ sent: Math.min((i + 1) * batchSize, rows.length), total: rows.length });

      // Delay between batches
      if (i < totalBatches - 1) await new Promise(r => setTimeout(r, 2000));
    }

    addLog(`--- CONCLUÍDO ---`);
    addLog(`Total: ${totalClients} clientes criados, ${totalReused} reutilizados, ${totalProjects} projetos criados`);
    if (errors.length) {
      addLog(`Erros: ${errors.length}`);
      errors.forEach(e => addLog(`  ⚠️ ${e}`));
    }
    setStatus('done');
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Importar Planilha</h1>

        <Button onClick={handleImport} disabled={status === 'loading'} className="mb-4">
          {status === 'loading' ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importando...</> : 'Iniciar Importação'}
        </Button>

        {progress.total > 0 && (
          <div className="mb-4">
            <div className="bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full transition-all"
                style={{ width: `${(progress.sent / progress.total) * 100}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-1">{progress.sent}/{progress.total} linhas processadas</p>
          </div>
        )}

        <div className="bg-white rounded-lg border p-4 max-h-[500px] overflow-y-auto">
          {log.map((entry, i) => (
            <p key={i} className="text-xs font-mono text-gray-700 mb-1">{entry}</p>
          ))}
          {log.length === 0 && <p className="text-sm text-gray-400">Clique em "Iniciar Importação" para começar</p>}
        </div>
      </div>
    </div>
  );
}