import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, UserPlus } from 'lucide-react';
import { toast } from "sonner";
import { v4 as uuidv4 } from 'uuid';

export default function QuickAddClientForm({ onSuccess, onCancel }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    whatsapp: '',
  });

  const createClientMutation = useMutation({
    mutationFn: async (data) => {
      // Verificar se já existe cliente com o mesmo CPF
      if (data.cpf) {
        const existingClients = await base44.entities.Client.filter({ cpf: data.cpf });
        if (existingClients.length > 0) {
          throw new Error('CPF_EXISTS');
        }
      }
      
      // Buscar o maior código sequencial existente
      const allClients = await base44.entities.Client.list('-created_date');
      const maxSequential = allClients.reduce((max, client) => {
        const seq = client.codigo_sequencial || 0;
        return seq > max ? seq : max;
      }, 0);
      const nextSequential = maxSequential + 1;
      
      return base44.entities.Client.create({
        ...data,
        client_id: `CLI${nextSequential}`,
        codigo_sequencial: nextSequential
      });
    },
    onSuccess: (newClient) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente cadastrado com sucesso');
      onSuccess(newClient);
    },
    onError: (error) => {
      if (error.message === 'CPF_EXISTS') {
        toast.error('Este CPF já está cadastrado');
      } else {
        toast.error('Erro ao cadastrar cliente');
      }
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.whatsapp) {
      return;
    }
    createClientMutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1.5">
            Nome Completo *
          </label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Nome completo"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1.5">
            CPF
          </label>
          <Input
            value={formData.cpf}
            onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
            placeholder="000.000.000-00"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1.5">
            WhatsApp *
          </label>
          <Input
            value={formData.whatsapp}
            onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
            placeholder="+55 11 99999-9999"
            required
          />
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
          disabled={createClientMutation.isPending}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          className="flex-1 bg-[#2D2D2D] hover:bg-[#3D3D3D]"
          disabled={createClientMutation.isPending || !formData.name || !formData.whatsapp}
        >
          {createClientMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <UserPlus className="w-4 h-4 mr-1.5" />
              Cadastrar
            </>
          )}
        </Button>
      </div>
    </form>
  );
}