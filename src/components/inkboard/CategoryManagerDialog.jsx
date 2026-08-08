import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const COLOR_PRESETS = [
  { bg: '#3D3D3D', text: '#FFFFFF' },
  { bg: '#A8D8A8', text: '#2D6A2D' },
  { bg: '#C9B8E8', text: '#5C3A8A' },
  { bg: '#F4C2C2', text: '#9A3A3A' },
  { bg: '#B8D4F4', text: '#2A5A9A' },
  { bg: '#F4A8A8', text: '#9A2A2A' },
  { bg: '#D4D4D4', text: '#5C5C5C' },
  { bg: '#F8EDCB', text: '#8A6A10' },
];

const EMPTY_FORM = { name: '', color: '#3D3D3D', text_color: '#FFFFFF' };

export default function CategoryManagerDialog({ open, onOpenChange, categories, onCategoriesChange }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['note-categories'] });
    onCategoriesChange?.();
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.NoteCategory.create(data),
    onSuccess: () => { invalidate(); setForm(EMPTY_FORM); toast.success('Categoria criada'); },
    onError: () => toast.error('Erro ao criar categoria'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.NoteCategory.update(id, data),
    onSuccess: () => { invalidate(); setForm(EMPTY_FORM); setEditingId(null); toast.success('Categoria atualizada'); },
    onError: () => toast.error('Erro ao atualizar categoria'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.NoteCategory.delete(id),
    onSuccess: () => { invalidate(); toast.success('Categoria excluída'); },
    onError: () => toast.error('Erro ao excluir categoria'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleEdit = (cat) => {
    setEditingId(cat.id);
    setForm({ name: cat.name, color: cat.color || '#3D3D3D', text_color: cat.text_color || '#FFFFFF' });
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const applyPreset = (preset) => {
    setForm(f => ({ ...f, color: preset.bg, text_color: preset.text }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl border-[#E6DDD2] bg-white p-0 overflow-hidden gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-xl font-bold text-[#231F20]">Gerenciar categorias</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col overflow-y-auto max-h-[70vh]">
          {/* Nova categoria form */}
          <div className="mx-6 mb-4 rounded-xl border border-[#E6DDD2] bg-[#FAFAF9] p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#9A8B7A] mb-3">
              {editingId ? 'Editar categoria' : 'Nova categoria'}
            </p>
            <form onSubmit={handleSubmit}>
              <div className="flex gap-2 mb-3">
                <Input
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ex.: Aprendizado"
                  className="flex-1 rounded-xl border-[#E6DDD2] bg-white text-[#231F20] placeholder:text-[#C0B8B0]"
                />
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending || !form.name.trim()}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7A736C] text-white hover:bg-[#5C544A] disabled:opacity-40 transition-colors flex-shrink-0"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Color dots */}
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((preset, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="h-7 w-7 rounded-full border-2 transition-all flex-shrink-0"
                    style={{
                      backgroundColor: preset.bg,
                      borderColor: form.color === preset.bg ? '#231F20' : 'transparent',
                    }}
                  />
                ))}
              </div>

              {editingId && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="mt-3 text-xs text-[#9A8B7A] underline"
                >
                  Cancelar edição
                </button>
              )}
            </form>
          </div>

          {/* Category list */}
          <div className="px-6 pb-4 space-y-2">
            {categories.length === 0 && (
              <p className="text-sm text-[#9A8B7A]">Nenhuma categoria cadastrada.</p>
            )}
            {categories.map(cat => (
              <div
                key={cat.id}
                className="flex items-center justify-between rounded-xl border border-[#EEE7DD] bg-white px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                    style={{ backgroundColor: cat.color || '#E6DDD2', color: cat.text_color || '#5C544A' }}
                  >
                    {cat.name}
                  </span>
                  <span className="text-sm font-medium text-[#231F20]">{cat.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(cat)}
                    className="rounded-lg p-1.5 text-[#7A736C] hover:bg-[#F0EAE2] transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(cat.id)}
                    disabled={deleteMutation.isPending}
                    className="rounded-lg p-1.5 text-[#E05A5A] hover:bg-[#FDECEA] transition-colors disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-[#EEE7DD]">
          <button
            onClick={() => onOpenChange(false)}
            className="text-sm font-medium text-[#5C544A] hover:text-[#231F20] transition-colors"
          >
            Fechar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}