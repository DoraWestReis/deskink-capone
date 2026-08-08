import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, Pencil, Archive, ArchiveRestore, Pin, PinOff, Trash2, RefreshCw, Sparkles, Calendar, User } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const PRIORITY_COLORS = {
  high: '#E05A5A',
  medium: '#E8A24A',
  low: '#7EB77F',
};

const CATEGORY_COLORS = {
  'Projetos': { bg: '#EFE9E3', text: '#7A736C' },
  'Financeiro': { bg: '#EFE9E3', text: '#7A736C' },
  'Cliente': { bg: '#EFE9E3', text: '#7A736C' },
  'Ideias': { bg: '#EFE9E3', text: '#7A736C' },
};

function ActionButton({ icon: Icon, label, onClick, className = '', disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-1 text-[11px] font-normal transition-opacity disabled:opacity-40 ${className}`}
    >
      <Icon className="h-4 w-4" strokeWidth={1.5} />
      <span>{label}</span>
    </button>
  );
}

export default function NoteListItem({
  note, categoryStyle,
  onEdit, onComplete, onArchive, onTogglePin, onDelete,
  onRegenerate, isRegenerating,
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  const isCompleted = note.status === 'completed';
  const isArchived = note.status === 'archived';
  const priorityColor = PRIORITY_COLORS[note.priority] || PRIORITY_COLORS.medium;

  const dueDateFormatted = note.due_date
    ? format(parseISO(note.due_date), "d 'de' MMM", { locale: ptBR })
    : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18 }}
      className="flex overflow-hidden rounded-2xl border border-[#EAE3DB] bg-white shadow-sm"
    >
      {/* Priority bar */}
      <div className="w-1 flex-shrink-0" style={{ backgroundColor: priorityColor }} />

      {/* Full content area */}
      <div className="flex-1 px-5 py-4 min-w-0">
        {/* Top row: badges (left) + date & actions (right) */}
        <div className="flex items-start justify-between gap-4 mb-2">
          {/* Left: category badge + AI badge + pinned */}
          <div className="flex items-center gap-2 flex-wrap pt-0.5">
            {note.category && (
              <span
                className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                style={{
                  backgroundColor: CATEGORY_COLORS[note.category]?.bg || categoryStyle?.bg || '#EFE9E3',
                  color: CATEGORY_COLORS[note.category]?.text || categoryStyle?.text || '#7A736C',
                }}
              >
                {note.category}
              </span>
            )}
            {note.source === 'ai' && (
              <span className="flex items-center gap-1 rounded-full bg-[#231F20] px-2.5 py-1 text-[10px] font-semibold text-white">
                <Sparkles className="h-2.5 w-2.5 text-[#B89A66]" />
                Sugestão do Desk IA
              </span>
            )}
            {note.pinned && (
              <span className="rounded-full bg-[#F0EAE2] px-2.5 py-0.5 text-[10px] font-semibold text-[#7A736C]">
                📌 Fixada
              </span>
            )}
          </div>

          {/* Right: date on top, action buttons row below */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {dueDateFormatted && (
              <span className="flex items-center gap-1 text-xs text-[#7A736C] whitespace-nowrap">
                <Calendar className="h-3 w-3" />
                {dueDateFormatted}
              </span>
            )}
            <div className="flex items-start gap-5">
            {!isCompleted && !isArchived && (
              <ActionButton
                icon={Check}
                label="Concluir"
                onClick={() => onComplete(note)}
                className="text-[#2F8A6E] hover:opacity-70"
              />
            )}
            <ActionButton
              icon={Pencil}
              label="Editar"
              onClick={() => onEdit(note)}
              className="text-[#7A6E60] hover:opacity-70"
            />
            <ActionButton
              icon={isArchived ? ArchiveRestore : Archive}
              label={isArchived ? 'Desarquivar' : 'Arquivar'}
              onClick={() => onArchive(note)}
              className="text-[#7A6E60] hover:opacity-70"
            />
            <ActionButton
              icon={note.pinned ? PinOff : Pin}
              label={note.pinned ? 'Desafixar' : 'Fixar'}
              onClick={() => onTogglePin(note)}
              className="text-[#B8AC9E] hover:opacity-70"
            />
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <AlertDialogTrigger asChild>
                <ActionButton
                  icon={Trash2}
                  label="Excluir"
                  onClick={() => setDeleteOpen(true)}
                  className="text-[#D14545] hover:opacity-70"
                />
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-2xl border-[#E6DDD2] bg-[#FBF7F2]">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-[#231F20]">Excluir nota?</AlertDialogTitle>
                  <AlertDialogDescription className="text-[#7A736C]">
                    Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl border-[#E6DDD2]">Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(note)}
                    className="rounded-xl bg-[#E05A5A] text-white hover:bg-[#c94a4a]"
                  >
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            </div>
          </div>
        </div>

        {/* Title */}
        <p className={`font-semibold text-[#231F20] leading-snug ${isCompleted ? 'line-through text-[#A89E95]' : ''}`}>
          {note.title}
        </p>

        {/* Content */}
        {note.content && (
          <p className="text-sm text-[#7A736C] leading-relaxed mt-1">{note.content}</p>
        )}

        {/* Client badges */}
        {(() => {
          const linkedClients = Array.isArray(note.clients) && note.clients.length > 0
            ? note.clients
            : (note.client_name ? [{ id: note.client_id, name: note.client_name }] : []);
          if (linkedClients.length === 0) return null;
          return (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {linkedClients.map((c) => (
                <span
                  key={c.id || c.name}
                  className="flex w-fit items-center gap-1 rounded-full bg-[#EEF2FF] px-2.5 py-0.5 text-[10px] font-medium text-[#4F6BBF]"
                >
                  <User className="h-2.5 w-2.5" />
                  {c.name}
                </span>
              ))}
            </div>
          );
        })()}

        {/* AI reason box - full width */}
        {note.source === 'ai' && note.ai_reason && (
          <div className="mt-3 flex items-start justify-between gap-3 rounded-xl border border-[#EADDC4] bg-[#FBF3E2] px-4 py-2.5">
            <p className="text-xs text-[#9A8B6E] leading-relaxed flex-1">
              <span className="text-[#9A8B6E]">Por que sugeri: </span>
              <span className="italic">{note.ai_reason}</span>
            </p>
            <button
              type="button"
              onClick={onRegenerate}
              disabled={isRegenerating}
              title="Regenerar sugestão"
              className="flex-shrink-0 rounded-lg p-1 text-[#B89A66] transition-colors hover:bg-[#F0E8D6] disabled:opacity-40"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}