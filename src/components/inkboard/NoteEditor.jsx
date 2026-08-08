import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Tag, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Média' },
  { value: 'high', label: 'Alta' },
];

const EMPTY_NOTE = {
  title: '',
  content: '',
  category: '',
  priority: 'medium',
  is_task: false,
  due_date: '',
  clients: [],
};

// Normalize legacy single-client field into clients array
function normalizeClients(note) {
  if (Array.isArray(note?.clients) && note.clients.length > 0) return note.clients;
  if (note?.client_id) return [{ id: note.client_id, name: note.client_name || '' }];
  return [];
}

export default function NoteEditor({ open, onOpenChange, note, onSave, isSaving, categories, onManageCategories }) {
  const [form, setForm] = useState(EMPTY_NOTE);
  const [clientSearch, setClientSearch] = useState('');
  const [clientFocused, setClientFocused] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-all-for-notes'],
    queryFn: () => base44.entities.Client.list('name', 500),
    enabled: open,
  });

  const selectedIds = useMemo(() => new Set((form.clients || []).map(c => c.id)), [form.clients]);

  const filteredClients = useMemo(() => {
    const term = clientSearch.trim().toLowerCase();
    return clients
      .filter(c => !selectedIds.has(c.id))
      .filter(c => !term || c.name?.toLowerCase().includes(term))
      .slice(0, 50);
  }, [clients, clientSearch, selectedIds]);

  useEffect(() => {
    if (open) {
      setForm(note ? {
        title: note.title || '',
        content: note.content || '',
        category: note.category || '',
        priority: note.priority || 'medium',
        is_task: note.is_task || false,
        due_date: note.due_date || '',
        clients: normalizeClients(note),
      } : EMPTY_NOTE);
      setClientSearch('');
    }
  }, [open, note]);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const addClient = (client) => {
    if (selectedIds.has(client.id)) return;
    setForm(f => ({ ...f, clients: [...(f.clients || []), { id: client.id, name: client.name }] }));
    setClientSearch('');
  };

  const removeClient = (id) => {
    setForm(f => ({ ...f, clients: (f.clients || []).filter(c => c.id !== id) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const firstClient = form.clients?.[0];
    const payload = {
      ...form,
      due_date: form.is_task ? form.due_date : '',
      // keep legacy fields synced with the first client for backward compatibility
      client_id: firstClient?.id || '',
      client_name: firstClient?.name || '',
    };
    onSave(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-3xl border-[#E6DDD2] bg-[#FBF7F2] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-xl font-bold text-[#231F20]">
            {note?.id ? 'Editar nota' : 'Nova nota'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto max-h-[80vh] px-6 py-4">
          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-[#9A8B7A]">Título</Label>
            <Input
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Ex: Finalizar projeto de Maria Elisa"
              className="rounded-xl border-[#E6DDD2] bg-white text-[#231F20] placeholder:text-[#C0B9B2]"
              required
            />
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-[#9A8B7A]">Conteúdo</Label>
            <Textarea
              value={form.content}
              onChange={(e) => set('content', e.target.value)}
              placeholder="Detalhes, contexto, lembretes..."
              className="min-h-[90px] rounded-xl border-[#E6DDD2] bg-white text-[#231F20] placeholder:text-[#C0B9B2] resize-none"
            />
          </div>

          {/* Category + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-[#9A8B7A]">Categoria</Label>
              <Select value={form.category} onValueChange={(v) => set('category', v)}>
                <SelectTrigger className="rounded-xl border-[#E6DDD2] bg-white text-[#231F20]">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="border-[#E6DDD2] bg-[#FBF7F2]">
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-[#9A8B7A]">Prioridade</Label>
              <Select value={form.priority} onValueChange={(v) => set('priority', v)}>
                <SelectTrigger className="rounded-xl border-[#E6DDD2] bg-white text-[#231F20]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[#E6DDD2] bg-[#FBF7F2]">
                  {PRIORITY_OPTIONS.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Manage categories link */}
          <button
            type="button"
            onClick={onManageCategories}
            className="flex items-center gap-1.5 text-xs text-[#B89A66] hover:underline w-fit"
          >
            <Tag className="h-3 w-3" />
            Gerenciar categorias
          </button>

          {/* Clients - multi select */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-[#9A8B7A]">
              Clientes Vinculados <span className="normal-case text-[#B7AEA4]">(opcional, vários)</span>
            </Label>

            {/* Selected client chips */}
            {form.clients?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {form.clients.map(c => (
                  <span
                    key={c.id}
                    className="inline-flex items-center gap-1 rounded-full bg-[#EEF2FF] px-2.5 py-1 text-xs font-medium text-[#4F6BBF]"
                  >
                    {c.name}
                    <button
                      type="button"
                      onClick={() => removeClient(c.id)}
                      className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-[#DDE4FF]"
                      aria-label={`Remover ${c.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#B7AEA4]" />
              <Input
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                onFocus={() => setClientFocused(true)}
                onBlur={() => setTimeout(() => setClientFocused(false), 150)}
                placeholder="Buscar cliente para adicionar..."
                className="rounded-xl border-[#E6DDD2] bg-white pl-9 text-[#231F20] placeholder:text-[#C0B9B2]"
              />
            </div>

            {/* Suggestion list - shows on focus or while typing */}
            {(clientFocused || clientSearch.trim()) && filteredClients.length > 0 && (
              <div className="max-h-56 overflow-y-auto rounded-xl border border-[#E6DDD2] bg-white">
                {filteredClients.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => addClient(c)}
                    className="block w-full px-3 py-2 text-left text-sm text-[#231F20] hover:bg-[#F7F2EA]"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
            {(clientFocused || clientSearch.trim()) && filteredClients.length === 0 && (
              <p className="text-xs text-[#B7AEA4] px-1">
                {clients.length === 0 ? 'Nenhum cliente cadastrado.' : 'Nenhum cliente encontrado.'}
              </p>
            )}
          </div>

          {/* Is Task toggle */}
          <div className="rounded-2xl border border-[#E6DDD2] bg-white px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[#231F20]">Transformar em tarefa</p>
              <p className="text-xs text-[#9A8B7A]">Define um prazo e aparece na Home</p>
            </div>
            <Switch
              checked={form.is_task}
              onCheckedChange={(v) => set('is_task', v)}
            />
          </div>

          {/* Due date */}
          {form.is_task && (
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-[#9A8B7A]">Data Prevista</Label>
              <Input
                type="date"
                value={form.due_date}
                onChange={(e) => set('due_date', e.target.value)}
                className="rounded-xl border-[#E6DDD2] bg-white text-[#231F20]"
              />
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex gap-3 pt-2 border-t border-[#EEE7DD]">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-xl border-[#E6DDD2] text-[#7A736C]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSaving || !form.title.trim()}
              className="flex-1 rounded-xl bg-[#231F20] text-white hover:bg-[#3a3435]"
            >
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}