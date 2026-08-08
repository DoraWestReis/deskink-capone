import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, UserPlus, ChevronDown } from 'lucide-react';

export default function ClientSearchSelect({ value, onChange, clients = [], disabled, onAddNew }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  const selectedClient = clients.find(c => c.id === value);

  const sortedFiltered = useMemo(() => {
    const sorted = [...clients].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
    if (!search.trim()) return sorted;
    const q = search.toLowerCase();
    return sorted.filter(c => c.name?.toLowerCase().includes(q));
  }, [clients, search]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (clientId) => {
    onChange(clientId);
    setOpen(false);
    setSearch('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
    setSearch('');
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => { setOpen(!open); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm transition-colors hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50"
      >
        <span className={selectedClient ? 'text-slate-900' : 'text-slate-400'}>
          {selectedClient ? selectedClient.name : 'Buscar cliente indicador...'}
        </span>
        <div className="flex items-center gap-1">
          {selectedClient && !disabled && (
            <span onClick={handleClear} className="p-0.5 hover:bg-slate-200 rounded">
              <X className="w-3.5 h-3.5 text-slate-400" />
            </span>
          )}
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </div>
      </button>

      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input
                ref={inputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar por nome..."
                className="pl-8 h-9 text-sm bg-slate-50 border-slate-200"
              />
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto">
            {onAddNew && (
              <button
                type="button"
                onClick={() => { setOpen(false); onAddNew(); }}
                className="w-full px-3 py-2.5 text-left text-sm text-blue-600 font-medium hover:bg-blue-50 flex items-center gap-2 border-b border-slate-100"
              >
                <UserPlus className="w-4 h-4" />
                + Adicionar Cliente Indicador
              </button>
            )}

            {sortedFiltered.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-slate-400">
                Nenhum cliente encontrado
              </div>
            ) : (
              sortedFiltered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelect(c.id)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 transition-colors ${value === c.id ? 'bg-slate-100 font-medium' : ''}`}
                >
                  {c.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}