import React from 'react';
import { Search, Tag, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function InkBoardHeader({
  search, onSearchChange,
  filter, onFilterChange,
  category, onCategoryChange,
  onCreate, onManageCategories,
  categories,
}) {
  return (
    <div className="space-y-5">
      {/* Title row */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#B89A66]">WORKSPACE</p>
          <h1 className="mt-0.5 font-display text-3xl font-bold tracking-tight text-[#231F20]">InkBoard</h1>
          <p className="mt-1 text-sm text-[#7A736C]">Suas notas, ideias e tarefas em um só lugar.</p>
        </div>
        <Button
          onClick={onCreate}
          className="flex items-center gap-2 rounded-xl bg-[#231F20] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#3a3435] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nova nota
        </Button>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B7AEA4]" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar nota..."
            className="pl-9 border-[#E6DDD2] bg-white text-[#231F20] placeholder:text-[#B7AEA4] rounded-xl focus:bg-white"
          />
        </div>

        {/* Status filter */}
        <Select value={filter} onValueChange={onFilterChange}>
          <SelectTrigger className="w-[160px] border-[#E6DDD2] bg-white rounded-xl text-[#231F20]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-[#E6DDD2] bg-[#FBF7F2]">
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="tasks">Tarefas</SelectItem>
            <SelectItem value="completed">Concluídas</SelectItem>
            <SelectItem value="archived">Arquivadas</SelectItem>
            <SelectItem value="all">Todas</SelectItem>
          </SelectContent>
        </Select>

        {/* Category filter */}
        <Select value={category} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-[180px] border-[#E6DDD2] bg-white rounded-xl text-[#231F20]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-[#E6DDD2] bg-[#FBF7F2]">
            <SelectItem value="all">Todas categorias</SelectItem>
            {categories.map(c => (
              <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Manage categories */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onManageCategories}
          className="h-10 w-10 rounded-xl border border-[#E6DDD2] bg-white text-[#7A736C] hover:bg-[#F0EAE2]"
          title="Gerenciar categorias"
        >
          <Tag className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}