import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ text = 'Computing in C++ Core...' }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-3">
      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      <span className="text-sm font-medium text-gray-400 font-mono">{text}</span>
    </div>
  );
}
