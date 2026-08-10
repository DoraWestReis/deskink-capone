import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const NO_CONTACT_NOTE = '⚠️ Contato não encontrado — preencher manualmente';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { groups = [] } = await req.json();
    const sr = base44.asServiceRole;
    const today = new Date().toISOString().split('T')[0];

    let clientsCreated = 0;
    let projectsCreated = 0;
    const errors = [];

    for (const group of groups) {
      try {
        const existing = await sr.entities.Client.filter({ name: group.name });
        let client = existing?.[0];

        if (!client) {
          const all = await sr.entities.Client.list('-codigo_sequencial', 1);
          const nextSeq = (Number(all?.[0]?.codigo_sequencial) || 0) + 1;
          client = await sr.entities.Client.create({
            name: group.name,
            whatsapp: group.contact || '',
            email: group.email || undefined,
            cpf: group.cpf || undefined,
            birth_date: group.birth_date || undefined,
            registration_date: today,
            codigo_sequencial: nextSeq,
            notes: group.contact ? undefined : NO_CONTACT_NOTE,
          });
          clientsCreated += 1;
        } else {
          const patch = {};
          if (!client.whatsapp && group.contact) patch.whatsapp = group.contact;
          if (!client.email && group.email) patch.email = group.email;
          if (!client.cpf && group.cpf) patch.cpf = group.cpf;
          if (!client.birth_date && group.birth_date) patch.birth_date = group.birth_date;
          if (Object.keys(patch).length) {
            await sr.entities.Client.update(client.id, patch);
            client = { ...client, ...patch };
          }
        }

        for (const session of group.sessions || []) {
          await sr.entities.Project.create({
            client_id: client.id,
            client_name: client.name,
            description: session.description || 'Tatuagem',
            session_date: session.session_date,
            session_duration_minutes: session.session_duration_minutes || 120,
            pipeline_stage: session.pipeline_stage || 'agendado',
            total_value: session.total_value ?? undefined,
            deposit_value: session.deposit_value ?? undefined,
            installments: session.installments ?? undefined,
            notes: session.notes || undefined,
          });
          projectsCreated += 1;
        }
      } catch (err) {
        errors.push(`${group.name}: ${err.message}`);
      }
    }

    return Response.json({ clients_created: clientsCreated, projects_created: projectsCreated, errors });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}