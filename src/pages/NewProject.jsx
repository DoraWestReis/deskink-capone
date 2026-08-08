import React, { useState, useEffect } from 'react';
import { addDays, format, parseISO } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, User, FileText, Check, Loader2, Search, Plus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

import ClientForm from '@/components/forms/ClientForm';
import ProjectForm from '@/components/forms/ProjectForm';
import Footer from '@/components/ui/Footer';

export default function NewProject() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedClientId = urlParams.get('clientId');
  const preselectedClientName = urlParams.get('clientName');
  
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  useEffect(() => {
    if (preselectedClientId && preselectedClientName) {
      setSelectedClient({
        id: preselectedClientId,
        name: preselectedClientName
      });
      setStep(2);
    }
  }, [preselectedClientId, preselectedClientName]);
  const [clientData, setClientData] = useState({});
  const [appointmentType, setAppointmentType] = useState('orcamento_presencial'); // 'orcamento_presencial' ou 'orcamento_remoto'
  const [projectData, setProjectData] = useState({
    pipeline_stage: 'novo_contato',
    stage_updated_at: new Date().toISOString()
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date'),
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['financial-settings'],
    queryFn: () => base44.entities.FinancialSettings.list(),
  });

  const financialSettings = settings[0];

  const filteredClients = clients.filter(c =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.whatsapp?.includes(searchQuery)
  );

  const createClientMutation = useMutation({
    mutationFn: async (data) => {
      const allClients = await base44.entities.Client.list('-created_date', 1);
      const lastClientId = allClients[0]?.client_id;
      const nextId = lastClientId ? (parseInt(lastClientId) + 1).toString() : '1';
      
      return base44.entities.Client.create({
        ...data,
        client_id: nextId
      });
    },
    onSuccess: (newClient) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setSelectedClient(newClient);
      setStep(2);
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data) => {
      const newProject = await base44.entities.Project.create(data);
      return newProject;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      navigate(createPageUrl('Pipeline'));
    },
  });

  const handleSelectClient = (client) => {
    setSelectedClient(client);
    setStep(2);
  };

  const handleCreateNewClient = () => {
    if (!clientData.name || !clientData.whatsapp) return;
    createClientMutation.mutate(clientData);
  };

  const getSuggestedRevisionDate = (tattooDate) => {
    if (!tattooDate) return '';
    return format(addDays(parseISO(`${tattooDate}T00:00:00`), 20), 'yyyy-MM-dd');
  };

  const handleCreateProject = async () => {
    if (!selectedClient || !projectData.description) return;

    setIsSubmitting(true);

    // Determinar a etapa do pipeline baseado no tipo de agendamento
    let finalStage = 'novo_contato';
    if (appointmentType === 'orcamento_presencial' && projectData.session_date) {
      finalStage = 'agendado_orcamento_presencial';
    } else if (appointmentType === 'orcamento_remoto') {
      finalStage = 'orcamento_enviado';
    }

    // Garantir que session_date seja ISO completo se existir
    let sessionDateISO = projectData.session_date;
    if (sessionDateISO && !sessionDateISO.includes('T')) {
      sessionDateISO = `${sessionDateISO}T00:00:00`;
    }
    if (sessionDateISO && !sessionDateISO.includes('Z') && !sessionDateISO.includes('+') && !sessionDateISO.includes('-', 10)) {
      sessionDateISO = `${sessionDateISO}-03:00`;
    }

    const newProject = await createProjectMutation.mutateAsync({
      ...projectData,
      session_date: sessionDateISO,
      revision_date: projectData.revision_date || getSuggestedRevisionDate(projectData.tattoo_date),
      payment_method: projectData.total_value_confirmed_method || projectData.payment_method,
      total_value_confirmed_method: projectData.total_value_confirmed_method || projectData.payment_method,
      deposit_confirmed_method: projectData.deposit_confirmed_method,
      pipeline_stage: finalStage,
      stage_updated_at: new Date().toISOString(),
      client_id: selectedClient.id,
      client_name: selectedClient.name
    });
    
    // Create initial history record
    await base44.entities.ProjectStageHistory.create({
      project_id: newProject.id,
      pipeline_stage: finalStage,
      session_date: sessionDateISO,
      changed_at: new Date().toISOString()
    });

    // Sync with Google Calendar if has session date and is a scheduled stage
    if ((finalStage === 'agendado' || finalStage === 'agendado_orcamento_presencial') && projectData.session_date) {
      try {
        await base44.functions.invoke('syncCalendar', {
          action: 'create',
          projectId: newProject.id
        });
      } catch (error) {
        console.error('Calendar sync failed:', error);
      }
    }

    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[#18151B]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[radial-gradient(circle_at_top_left,_rgba(184,154,102,0.22),_transparent_35%),linear-gradient(135deg,#221D25_0%,#18151B_55%,#131017_100%)] backdrop-blur-xl">
        <div className="container mx-auto max-w-5xl px-4 sm:px-6 py-5 sm:py-7">
          <div className="flex items-center gap-4">
            <Link 
              to={selectedClient ? createPageUrl(`ClientDetails?id=${selectedClient.id}`) : createPageUrl('Home')}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/70 transition-all hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/50">Projetos</p>
              <h1 className="mt-1 text-2xl sm:text-3xl font-display text-white">Novo Orçamento</h1>
              <p className="mt-1 text-sm text-white/65">
                {step === 1 ? 'Selecione ou cadastre o cliente' : 'Preencha os dados do projeto'}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="relative z-10 -mt-2 rounded-t-[30px] bg-[#F6F1EC] min-h-[calc(100vh-96px)]">
        <div className="container mx-auto max-w-5xl px-4 sm:px-6 py-5">
          <div className="flex items-center gap-4 rounded-[24px] border border-[#E7DED2] bg-[#FCF8F4] px-4 py-4 shadow-[0_12px_30px_rgba(35,31,32,0.05)]">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-[#231F20]' : 'text-[#B8AEA0]'}`}>
              <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
                step > 1 ? 'bg-[#B89A66] text-white' : step === 1 ? 'bg-[#231F20] text-white' : 'bg-[#E8DED1] text-[#8E8174]'
              }`}>
                {step > 1 ? <Check className="w-4 h-4" /> : '1'}
              </div>
              <span className="text-sm font-medium">Cliente</span>
            </div>
            <div className="h-0.5 flex-1 bg-[#E8DED1]">
              <div className={`h-full bg-[#B89A66] transition-all duration-300 ${step > 1 ? 'w-full' : 'w-0'}`} />
            </div>
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-[#231F20]' : 'text-[#B8AEA0]'}`}>
              <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
                step === 2 ? 'bg-[#231F20] text-white' : 'bg-[#E8DED1] text-[#8E8174]'
              }`}>
                2
              </div>
              <span className="text-sm font-medium">Projeto</span>
            </div>
          </div>
        </div>

      {/* Content */}
      <main className="container mx-auto max-w-5xl px-4 sm:px-6 py-1 pb-[132px]">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {!showNewClientForm ? (
                <>
                  {/* Search Existing Client */}
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar cliente existente..."
                        className="h-12 rounded-2xl border-[#E5DDD2] bg-[#FCF8F4] pl-10 text-[#231F20] placeholder:text-[#9A9188]"
                      />
                    </div>

                    {filteredClients.length > 0 && (
                      <div className="max-h-72 overflow-y-auto rounded-[28px] border border-[#E7DED2] bg-[#FCF8F4] shadow-[0_12px_30px_rgba(35,31,32,0.05)]">
                        {filteredClients.map((client) => (
                          <button
                            key={client.id}
                            onClick={() => handleSelectClient(client)}
                            className="flex w-full items-center gap-3 border-b border-[#EFE6DA] p-4 text-left transition-colors last:border-b-0 hover:bg-white/70"
                          >
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF2FA] text-[#6D7A92] font-semibold text-sm">
                              {client.name?.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-[#231F20]">{client.name}</p>
                              <p className="text-xs text-[#8A8178]">{client.whatsapp}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="text-center py-4">
                      <p className="text-sm text-slate-500 mb-3">Cliente não encontrado?</p>
                      <Button
                        onClick={() => setShowNewClientForm(true)}
                        variant="outline"
                        className="h-11 rounded-2xl border-[#E5DDD2] bg-white px-5 text-[#231F20] hover:bg-[#F8F2EA] gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Cadastrar Novo Cliente
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* New Client Form */}
                  <div className="rounded-[28px] border border-[#E7DED2] bg-[#FCF8F4] p-5 sm:p-6 shadow-[0_12px_30px_rgba(35,31,32,0.05)]">
                    <div className="mb-6 flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F1E8DA]">
                        <User className="w-5 h-5 text-[#B08954]" />
                      </div>
                      <div>
                        <h3 className="font-display text-lg text-[#231F20]">Novo Cliente</h3>
                        <p className="text-xs text-[#7A736C]">Preencha os dados básicos</p>
                      </div>
                    </div>
                    <ClientForm 
                      client={clientData} 
                      onChange={setClientData}
                      disabled={createClientMutation.isPending}
                      allClients={clients}
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowNewClientForm(false)}
                      className="h-11 flex-1 rounded-2xl border-[#E5DDD2] bg-white text-[#231F20] hover:bg-[#F8F2EA]"
                    >
                      Voltar
                    </Button>
                    <Button
                      onClick={handleCreateNewClient}
                      disabled={!clientData.name || !clientData.whatsapp || createClientMutation.isPending}
                      className="h-11 flex-1 rounded-2xl bg-[#231F20] text-white hover:bg-[#18151B]"
                    >
                      {createClientMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Continuar'
                      )}
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Selected Client */}
              <div className="flex items-center gap-3 rounded-[28px] border border-[#E7DED2] bg-[#FCF8F4] p-4 shadow-[0_12px_30px_rgba(35,31,32,0.05)]">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#231F20] text-white font-semibold">
                  {selectedClient?.name?.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-[#231F20]">{selectedClient?.name}</p>
                  <p className="text-xs text-[#7A736C]">{selectedClient?.whatsapp}</p>
                </div>
                <button 
                  onClick={() => { setStep(1); setSelectedClient(null); }}
                  className="ml-auto text-xs font-medium text-[#8F7445] hover:text-[#6F5732]"
                >
                  Alterar
                </button>
              </div>

              {/* Appointment Type Selector */}
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                <Label className="mb-3 block text-xs text-[#7A736C]">Tipo de Agendamento</Label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setAppointmentType('orcamento_presencial')}
                    className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                      appointmentType === 'orcamento_presencial'
                        ? 'border-[#B89A66] bg-[#F8F1E7] shadow-sm'
                        : 'border-[#E5DDD2] bg-white hover:bg-[#FDFBF8]'
                    }`}
                  >
                    <p className="font-semibold text-sm text-[#231F20]">Orçamento Presencial</p>
                    <p className="mt-1 text-xs text-[#7A736C]">Consulta para avaliar projeto</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAppointmentType('orcamento_remoto')}
                    className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                      appointmentType === 'orcamento_remoto'
                        ? 'border-[#B89A66] bg-[#F8F1E7] shadow-sm'
                        : 'border-[#E5DDD2] bg-white hover:bg-[#FDFBF8]'
                    }`}
                  >
                    <p className="font-semibold text-sm text-[#231F20]">Orçamento Remoto</p>
                    <p className="mt-1 text-xs text-[#7A736C]">Consulta online</p>
                  </button>
                </div>
              </div>

              {/* Project Form */}
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F1E8DA]">
                    <FileText className="w-5 h-5 text-[#B08954]" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg text-[#231F20]">Dados do Projeto</h3>
                    <p className="text-xs text-[#7A736C]">Descreva a tatuagem</p>
                  </div>
                </div>
                <ProjectForm 
                  project={projectData}
                  onChange={setProjectData}
                  disabled={isSubmitting}
                  appointmentType={appointmentType}
                  settings={financialSettings}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="h-11 flex-1 rounded-2xl border-[#E5DDD2] bg-white text-[#231F20] hover:bg-[#F8F2EA]"
                  disabled={isSubmitting}
                >
                  Voltar
                </Button>
                <Button
                  onClick={handleCreateProject}
                  disabled={!projectData.description || isSubmitting}
                  className="h-11 flex-1 rounded-2xl bg-[#231F20] text-white hover:bg-[#18151B]"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Criar Orçamento'
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      
      </div>
      <Footer />
    </div>
  );
}