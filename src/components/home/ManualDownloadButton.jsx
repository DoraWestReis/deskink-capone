import React from 'react';
import { Download } from 'lucide-react';

export default function ManualDownloadButton() {
  return (
    <a
      href="/manual-do-usuario.html"
      download="Manual_do_Usuario_DeskInk.html"
      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/6 px-3 text-xs font-medium text-white/80 backdrop-blur-md transition-all hover:bg-white/10 hover:text-white"
      title="Baixar manual"
    >
      <Download className="h-3.5 w-3.5" strokeWidth={2} />
      <span className="hidden sm:inline">Manual</span>
    </a>
  );
}