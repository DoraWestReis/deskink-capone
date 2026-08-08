import React from 'react';
import { Input } from "@/components/ui/input";
import { X } from 'lucide-react';

export default function ClearableDate({ type = 'date', value, onChange, disabled, className = '' }) {
  const hasValue = !!value;

  return (
    <div className="relative">
      <Input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`${className} ${hasValue && !disabled ? 'pr-10' : ''}`}
      />
      {hasValue && !disabled && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Limpar data"
          title="Limpar data"
          className="absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full text-[#9C8A6D] hover:bg-[#F4EEE7] hover:text-[#231F20]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}