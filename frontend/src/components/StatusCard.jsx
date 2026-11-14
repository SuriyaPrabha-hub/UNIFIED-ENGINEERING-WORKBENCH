import React from 'react';

export default function StatusCard({ title, value, subtext, icon: Icon, badge }) {
  return (
    <div 
      className="bg-[#FFFFFF] border border-[#D5D9DE] rounded-[4px] p-4 flex flex-col justify-between"
      style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <span 
          className="text-[11px] font-semibold uppercase tracking-wider text-[#5F6B76]"
          style={{ color: 'var(--muted)' }}
        >
          {title}
        </span>
        {Icon && (
          <div 
            className="p-1 rounded-[4px] border border-[#D5D9DE] bg-[#F4F5F7] text-[#5F6B76]"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)', color: 'var(--muted)' }}
          >
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      <div>
        <div className="flex items-baseline space-x-2">
          <span 
            className="text-xl font-bold font-mono text-[#1B1F23]"
            style={{ color: 'var(--text)' }}
          >
            {value}
          </span>
          {badge && (
            <span 
              className="text-[10px] px-1.5 py-0.2 rounded-[4px] border border-[#D5D9DE] text-[#5F6B76] font-mono"
              style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
            >
              {badge}
            </span>
          )}
        </div>
        {subtext && (
          <p 
            className="text-[11px] text-[#5F6B76] mt-1"
            style={{ color: 'var(--muted)' }}
          >
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
}
