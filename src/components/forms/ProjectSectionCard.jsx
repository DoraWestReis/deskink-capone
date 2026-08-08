import React from 'react';

export default function ProjectSectionCard({ title, children, className = '' }) {
  return (
    <div className={`rounded-[24px] border border-[#EEE7DD] bg-[#FBF7F2] p-4 sm:p-5 ${className}`}>
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#B8C1CF]">{title}</p>
      {children}
    </div>
  );
}