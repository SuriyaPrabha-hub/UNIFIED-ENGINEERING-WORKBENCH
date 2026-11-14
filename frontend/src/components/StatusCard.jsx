import React from 'react';

export default function StatusCard({ title, value, subtext, icon: Icon, badge }) {
  return (
    <div className="bg-[#FFFFFF] border border-[#D5D9DE] rounded-[4px] p-4 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5F6B76]">{title}</span>
        {Icon && (
          <div className="p-1 rounded-[4px] border border-[#D5D9DE] bg-[#F4F5F7] text-[#5F6B76]">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      <div>
        <div className="flex items-baseline space-x-2">
          <span className="text-xl font-bold font-mono text-[#1B1F23]">{value}</span>
          {badge && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-[4px] border border-[#D5D9DE] text-[#5F6B76] font-mono">
              {badge}
            </span>
          )}
        </div>
        {subtext && <p className="text-[11px] text-[#5F6B76] mt-1">{subtext}</p>}
      </div>
    </div>
  );
}
