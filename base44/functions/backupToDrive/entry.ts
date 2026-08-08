import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const FOLDER_ID = '16QXSd3qKlgffDdw1O30Chl71SkvcalaB';

function toCSV(headers, rows) {
  const escape = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => escape(row[h])).join(','));
  }
  return lines.join('\n');
}

async function uploadToDrive(accessToken, fileName, csvContent, folderId) {
  const metadata = {
    name: fileName,
    mimeType: 'text/csv',
    parents: [folderId],
  };

  const boundary = 'studioflow_backup_boundary';
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    'Content-Type: text/csv',
    '',
    csvContent,
    `--${boundary}--`,
  ].join('\r\n');

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Drive upload failed: ${err}`);
  }

  return await res.json();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');

    // Busca dados
    const [clients, projects] = await Promise.all([
      base44.asServiceRole.entities.Client.list(),
      base44.asServiceRole.entities.Project.list(),
    ]);

    const dateStr = new Date().toISOString().slice(0, 10);

    // CSV de Clientes
    const clientHeaders = ['id', 'name', 'whatsapp', 'email', 'cpf', 'birth_date', 'city', 'lead_origin', 'registration_date', 'notes', 'total_spent_history', 'created_date'];
    const clientCSV = toCSV(clientHeaders, clients);

    // CSV de Projetos
    const projectHeaders = ['id', 'client_id', 'client_name', 'description', 'style', 'pipeline_stage', 'total_value', 'deposit_value', 'payment_method', 'session_date', 'tattoo_date', 'revision_date', 'post_sale_status', 'is_concluded', 'notes', 'created_date'];
    const projectCSV = toCSV(projectHeaders, projects);

    // Upload dos dois arquivos
    const [clientFile, projectFile] = await Promise.all([
      uploadToDrive(accessToken, `clientes_${dateStr}.csv`, clientCSV, FOLDER_ID),
      uploadToDrive(accessToken, `projetos_${dateStr}.csv`, projectCSV, FOLDER_ID),
    ]);

    return Response.json({
      success: true,
      message: `Backup realizado com sucesso em ${dateStr}`,
      files: [
        { name: `clientes_${dateStr}.csv`, id: clientFile.id },
        { name: `projetos_${dateStr}.csv`, id: projectFile.id },
      ],
      totals: { clients: clients.length, projects: projects.length },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});