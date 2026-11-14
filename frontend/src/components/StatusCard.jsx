import React from 'react';

export default function StatusCard({ title, value, subtext, icon: Icon, badge, color = 'blue' }) {
  const colorMap = {
    blue: 'border-blue-500/20 bg-blue-500/5 text-blue-400',
    emerald: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400',
    amber: 'border-amber-500/20 bg-amber-500/5 text-amber-400',
    purple: 'border-purple-500/20 bg-purple-500/5 text-purple-400',
    rose: 'border-rose-500/20 bg-rose-500/5 text-rose-400',
  };

  return (
    <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-5 shadow-sm hover:border-[#374151] transition-all">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</span>
        {Icon && (
          <div className={`p-2 rounded-lg border ${colorMap[color] || colorMap.blue}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      <div className="flex items-baseline space-x-2">
        <span className="text-2xl font-bold font-mono text-white">{value}</span>
        {badge && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#1F2937] text-gray-300 font-mono">
            {badge}
          </span>
        )}
      </div>
      {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
    </div>
  );
}
