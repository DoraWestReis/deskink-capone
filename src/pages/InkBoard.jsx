import React, { useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StickyNote, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import NoteListItem from '@/components/inkboard/NoteListItem';
import NoteEditor from '@/components/inkboard/NoteEditor';
import InkBoardHeader from '@/components/inkboard/InkBoardHeader';
import CategoryManagerDialog from '@/components/inkboard/CategoryManagerDialog';

export default function InkBoard() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('pending');
  const [category, setCategory] = useState('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['notes'],
    queryFn: async () => {
      const list = await base44.entities.Note.list('-created_date', 500);
      return [...list].sort((a, b) => {
        const pinnedDiff = (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
        if (pinnedDiff !== 0) return pinnedDiff;
        const aHas = !!a.due_date, bHas = !!b.due_date;
        if (aHas && !bHas) return -1;
        if (!aHas && bHas) return 1;
        if (aHas && bHas) return a.due_date.localeCompare(b.due_date);
        return new Date(b.created_date) - new Date(a.created_date);
      });
    },
    initialData: [],
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['note-categories'],
    queryFn: () => base44.entities.NoteCategory.list('name'),
    initialData: [],
  });

  const invalidateNotes = () => queryClient.invalidateQueries({ queryKey: ['notes'] });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Note.create(data),
    onSuccess: () => { invalidateNotes(); setEditorOpen(false); setEditingNote(null); toast.success('Nota criada'); },
    onError: () => toast.error('Não foi possível criar a nota'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Note.update(id, data),
    onSuccess: () => { invalidateNotes(); setEditorOpen(false); setEditingNote(null); },
    onError: () => toast.error('Não foi possível atualizar a nota'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Note.delete(id),
    onSuccess: () => { invalidateNotes(); toast.success('Nota excluída'); },
    onError: () => toast.error('Não foi possível excluir a nota'),
  });

  const regenerateMutation = useMutation({
    mutationFn: () => base44.functions.invoke('regenerateInkBoardIdea', {}),
    onSuccess: (res) => {
      const data = res?.data || {};
      if (data.created) { invalidateNotes(); toast.success('Nova sugestão gerada!'); }
      else if (data.reason === 'limit_reached') toast.error(data.message);
      else toast.info(data.message || 'Sem dados suficientes.');
    },
    onError: () => toast.error('Não foi possível gerar uma nova sugestão.'),
  });

  const handleSave = (data) => {
    if (editingNote?.id) updateMutation.mutate({ id: editingNote.id, data });
    else createMutation.mutate(data);
  };

  const handleComplete = (n) => {
    updateMutation.mutate({ id: n.id, data: { status: 'completed', completed_at: new Date().toISOString() } });
    toast.success('Concluído!');
  };
  const handleArchive = (n) => updateMutation.mutate({ id: n.id, data: { status: n.status === 'archived' ? 'pending' : 'archived' } });
  const handleTogglePin = (n) => updateMutation.mutate({ id: n.id, data: { pinned: !n.pinned } });
  const handleDelete = (n) => deleteMutation.mutate(n.id);
  const handleEdit = (n) => { setEditingNote(n); setEditorOpen(true); };
  const handleCreate = () => { setEditingNote(null); setEditorOpen(true); };
  const handleRegenerate = () => { if (!regenerateMutation.isPending) regenerateMutation.mutate(); };

  const categoryStyleMap = useMemo(() => {
    const map = {};
    categories.forEach(c => { map[c.name] = { bg: c.color || '#E6DDD2', text: c.text_color || '#5C544A' }; });
    return map;
  }, [categories]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return notes.filter(n => {
      if (filter === 'pending' && n.status !== 'pending') return false;
      if (filter === 'completed' && n.status !== 'completed') return false;
      if (filter === 'archived' && n.status !== 'archived') return false;
      if (filter === 'tasks' && (!n.is_task || n.status === 'archived')) return false;
      if (filter === 'all' && n.status === 'archived') return false;
      if (category !== 'all' && n.category !== category) return false;
      if (term && !`${n.title || ''} ${n.content || ''}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [notes, search, filter, category]);

  return (
    <div className="min-h-screen bg-[#F6F1EC] pb-32">
      <div className="mx-auto max-w-4xl px-4 pt-8 sm:px-6 lg:max-w-5xl lg:pt-12">
        <InkBoardHeader
          search={search} onSearchChange={setSearch}
          filter={filter} onFilterChange={setFilter}
          category={category} onCategoryChange={setCategory}
          onCreate={handleCreate}
          onManageCategories={() => setCategoryManagerOpen(true)}
          categories={categories}
        />

        <div className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-[#7A736C]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#E6DDD2] bg-[#FCF8F4] p-10 text-center">
              <StickyNote className="mx-auto mb-3 h-8 w-8 text-[#B89A66]" />
              <p className="font-display text-lg text-[#231F20]">Nenhuma nota aqui ainda</p>
              <p className="mt-1 text-sm text-[#7A736C]">Crie sua primeira nota ou peça à IA.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              <AnimatePresence>
                {filtered.map(note => (
                  <NoteListItem
                    key={note.id}
                    note={note}
                    categoryStyle={categoryStyleMap[note.category]}
                    onEdit={handleEdit}
                    onComplete={handleComplete}
                    onArchive={handleArchive}
                    onTogglePin={handleTogglePin}
                    onDelete={handleDelete}
                    onRegenerate={handleRegenerate}
                    isRegenerating={regenerateMutation.isPending}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <NoteEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        note={editingNote}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
        categories={categories}
        onManageCategories={() => setCategoryManagerOpen(true)}
      />
      <CategoryManagerDialog
        open={categoryManagerOpen}
        onOpenChange={setCategoryManagerOpen}
        categories={categories}
        onCategoriesChange={() => queryClient.invalidateQueries({ queryKey: ['note-categories'] })}
      />
    </div>
  );
}