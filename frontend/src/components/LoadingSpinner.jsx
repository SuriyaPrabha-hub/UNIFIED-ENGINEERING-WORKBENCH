import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ text = 'Computing in C++ Core...' }) {
  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-2.5">
      <Loader2 className="w-6 h-6 text-[#E8590C] animate-spin" style={{ color: 'var(--accent)' }} />
      <span className="text-xs font-mono text-[#5F6B76]" style={{ color: 'var(--muted)' }}>{text}</span>
    </div>
  );
}
