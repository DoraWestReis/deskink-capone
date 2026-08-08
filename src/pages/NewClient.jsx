import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from "sonner";

import ClientForm from '@/components/forms/ClientForm';
import Footer from '@/components/ui/Footer';
import BottomNav from '@/components/ui/BottomNav';
import FloatingActionButton from '@/components/ui/FloatingActionButton';

export default function NewClient() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [clientData, setClientData] = useState({});
  
  const { data: allClients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date'),
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
        client_id: String(nextSequential),
        codigo_sequencial: nextSequential
      });
    },
    onSuccess: (newClient) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      navigate(createPageUrl(`ClientDetails?id=${newClient.id}`));
    },
    onError: (error) => {
      if (error.message === 'CPF_EXISTS') {
        toast.error('Este CPF já está cadastrado');
      } else {
        toast.error('Erro ao cadastrar cliente');
      }
    },
  });

  const handleCreateClient = () => {
    if (!clientData.name || !clientData.whatsapp) return;
    const today = new Date().toISOString().split('T')[0];
    const dataToSave = {
      ...clientData,
      registration_date: clientData.registration_date || today,
    };
    createClientMutation.mutate(dataToSave);
  };

  return (
    <div className="min-h-screen bg-[#18151B] pb-[112px]">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[radial-gradient(circle_at_top_left,_rgba(184,154,102,0.22),_transparent_35%),linear-gradient(135deg,#221D25_0%,#18151B_55%,#131017_100%)] backdrop-blur-xl">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-5 sm:py-7">
          <div className="flex items-start gap-4">
            <Link
              to={createPageUrl('Clients')}
              className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/70 transition-all hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/50">Relacionamento</p>
              <h1 className="mt-2 text-3xl sm:text-4xl font-display text-white">Novo Cliente</h1>
              <p className="mt-2 text-sm text-white/65">Preencha os dados do cliente para iniciar o relacionamento com o mesmo padrão da sua operação.</p>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 -mt-2 rounded-t-[30px] bg-[#F6F1EC] min-h-[calc(100vh-140px)]">
        <div className="container mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="rounded-[28px] border border-[#E7DED2] bg-[#FCF8F4] p-5 sm:p-6 shadow-[0_12px_30px_rgba(35,31,32,0.05)]">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F3E8D6]">
                  <User className="w-5 h-5 text-[#B08954]" />
                </div>
                <div>
                  <h3 className="text-base font-display text-[#231F20]">Dados do Cliente</h3>
                  <p className="text-xs text-[#7A736C]">Preencha as informações básicas para cadastrar o novo contato.</p>
                </div>
              </div>
              <ClientForm
                client={clientData}
                onChange={setClientData}
                disabled={createClientMutation.isPending}
                allClients={allClients}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                variant="outline"
                onClick={() => navigate(createPageUrl('Clients'))}
                className="h-12 rounded-2xl border-[#DCCFBD] bg-transparent text-[#5D544B] hover:bg-[#F4EEE7]"
                disabled={createClientMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateClient}
                disabled={!clientData.name || !clientData.whatsapp || createClientMutation.isPending}
                className="h-12 rounded-2xl bg-[#231F20] text-white hover:bg-[#18151B]"
              >
                {createClientMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Cadastrar Cliente'
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      </main>

      <FloatingActionButton />
      <BottomNav currentPage="Clients" />
      <Footer />
    </div>
  );
}