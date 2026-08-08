import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Buscar todos os clientes
    const clients = await base44.asServiceRole.entities.Client.list('-created_date');
    
    let updatedCount = 0;
    
    // Atualizar cada cliente sem codigo_sequencial
    for (let i = 0; i < clients.length; i++) {
      const client = clients[i];
      
      if (!client.codigo_sequencial) {
        const sequencial = clients.length - i; // Começar do mais antigo com número mais baixo
        
        await base44.asServiceRole.entities.Client.update(client.id, {
          codigo_sequencial: sequencial,
          client_id: `CLI${sequencial}`
        });
        
        updatedCount++;
      }
    }

    return Response.json({
      success: true,
      message: `${updatedCount} clientes atualizados com sucesso`,
      total: clients.length
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      success: false
    }, { status: 500 });
  }
});