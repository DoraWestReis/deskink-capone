import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const MONTH_MAP = {
  'janeiro': '01', 'fevereiro': '02', 'março': '03', 'abril': '04',
  'maio': '05', 'junho': '06', 'julho': '07', 'agosto': '08',
  'setembro': '09', 'outubro': '10', 'novembro': '11', 'dezembro': '12',
};

function parseDatePtBR(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const cleaned = dateStr.trim().toLowerCase();
  const match = cleaned.match(/^(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})$/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = MONTH_MAP[match[2]];
    const year = match[3];
    if (month) return `${year}-${month}-${day}T00:00:00-03:00`;
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d.toISOString();
  return null;
}

function parseValue(valStr) {
  if (!valStr && valStr !== 0) return null;
  if (typeof valStr === 'number') return valStr;
  const cleaned = String(valStr).replace(/[R$\s.]/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function normalizeStr(s) {
  return (s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { rows, dryRun = false } = await req.json();

    // Load all projects
    const allProjects = [];
    let skip = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.Project.filter({}, '-created_date', 50, skip);
      if (!batch || batch.length === 0) break;
      allProjects.push(...batch);
      skip += batch.length;
      if (batch.length < 50) break;
    }

    const results = { updated: 0, not_found: [], skipped: 0, errors: [], total_rows: rows.length };

    for (const row of rows) {
      try {
        const clientName = normalizeStr(row.name);
        const projectDesc = normalizeStr(row.project);

        if (!clientName || !projectDesc) {
          results.skipped++;
          continue;
        }

        // Find matching project by client name + description
        const matchingProject = allProjects.find(p => {
          const pClientName = normalizeStr(p.client_name);
          const pDesc = normalizeStr(p.description);
          return pClientName === clientName && pDesc === projectDesc;
        });

        if (!matchingProject) {
          results.not_found.push(`${row.name} | ${row.project}`);
          continue;
        }

        // Build update payload with only the new fields
        const updateData = {};
        
        const stageDate = parseDatePtBR(row.stage_date);
        if (stageDate) updateData.stage_updated_at = stageDate;

        const sessionDate = parseDatePtBR(row.scheduled_date);
        if (sessionDate) updateData.session_date = sessionDate;

        const totalValue = parseValue(row.value);
        if (totalValue !== null) updateData.total_value = totalValue;

        if (Object.keys(updateData).length === 0) {
          results.skipped++;
          continue;
        }

        if (!dryRun) {
          await base44.asServiceRole.entities.Project.update(matchingProject.id, updateData);
        }
        results.updated++;
      } catch (e) {
        results.errors.push(`${row.name}: ${e.message}`);
      }
    }

    return Response.json(results);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});