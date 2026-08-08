import React from 'react';
import { CalendarDays, CircleAlert, Target } from 'lucide-react';

const tones = {
  gold: 'border-[#B89A66]/35 bg-[#B89A66]/20 text-[#E7C990]',
  alert: 'border-red-400/30 bg-red-400/15 text-red-200',
  neutral: 'border-white/10 bg-white/[0.06] text-white/65',
};

export default function AssistantGreeting({ name, appointmentCount, pendingCount, goalProgress, children }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia ☀️' : hour < 18 ? 'Boa tarde 🌤️' : 'Boa noite 🌙';
  const chips = [
    { icon: CalendarDays, text: `${appointmentCount} compromissos hoje`, tone: 'gold' },
    { icon: CircleAlert, text: `${pendingCount} pendências`, tone: 'alert' },
    { icon: Target, text: `${goalProgress.toFixed(0)}% da meta`, tone: 'neutral' },
  ];

  return (
    <div className="min-w-0 flex-1">
      <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">{greeting}</p>
      <h1 className="mt-1 truncate text-2xl font-display text-white sm:text-3xl md:text-4xl">{name || 'Tatuador'}</h1>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {chips.map(({ icon: Icon, text, tone }) => (
          <span key={text} className={`inline-flex h-8 items-center gap-2 rounded-full border px-3 text-[11px] ${tones[tone]}`}>
            <Icon className="h-3.5 w-3.5" /> {text}
          </span>
        ))}
        <div className="min-w-[128px]">{children}</div>
      </div>
    </div>
  );
}