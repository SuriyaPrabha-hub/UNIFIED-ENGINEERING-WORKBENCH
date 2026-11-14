import React from 'react';
import { 
  LayoutDashboard, 
  Box, 
  Flame, 
  Cpu, 
  CircuitBoard, 
  BrainCircuit, 
  FileText
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, serverOnline }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'geometry', label: 'Geometry Viewer', icon: Box, sub: 'ASCII STL & ANSYS CSV' },
    { id: 'thermal', label: 'Thermal Analysis', icon: Flame, sub: '1D FEA & Convergence' },
    { id: 'performance', label: 'Performance Lab', icon: Cpu, sub: 'Multicore Benchmarking' },
    { id: 'hardware', label: 'Hardware Integration', icon: CircuitBoard, sub: 'MCU / FPGA / JTAG' },
    { id: 'neural', label: 'Neural Network', icon: BrainCircuit, sub: 'Backprop & FD Check' },
    { id: 'reports', label: 'Reports & Exports', icon: FileText, sub: 'Rubric & Evidence' },
  ];

  return (
    <aside 
      className="w-64 bg-[#1F2429] border-r border-[#D5D9DE] flex flex-col h-screen fixed left-0 top-0 select-none z-30"
      style={{ backgroundColor: 'var(--sidebar)', borderColor: 'var(--border)' }}
    >
      {/* Brand Header */}
      <div 
        className="p-4 border-b border-[#D5D9DE] flex items-center space-x-3"
        style={{ borderColor: 'var(--border)' }}
      >
        <div 
          className="w-7 h-7 rounded-[4px] bg-[#E8590C] text-white flex items-center justify-center font-bold text-xs font-mono"
          style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}
        >
          PW
        </div>
        <div>
          <h1 className="font-bold text-xs tracking-wider uppercase text-white font-mono">PASS SCIENCE</h1>
          <p 
            className="text-[11px] text-[#C9CED4]"
            style={{ color: 'var(--sidebar-text)' }}
          >
            Engineering Workbench
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        <div 
          className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-[#C9CED4]"
          style={{ color: 'var(--sidebar-text)' }}
        >
          Modules
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="w-full flex items-center px-2.5 py-2 rounded-[4px] text-left transition-none"
              style={{
                backgroundColor: isActive ? 'var(--sidebar)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                color: isActive ? '#FFFFFF' : 'var(--sidebar-text)'
              }}
            >
              <Icon 
                className="w-4 h-4 mr-2.5 flex-shrink-0"
                style={{ color: isActive ? 'var(--accent)' : 'var(--sidebar-text)' }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">
                  {item.label}
                </div>
                {item.sub && (
                  <p 
                    className="text-[10px] truncate font-mono"
                    style={{ color: 'var(--sidebar-text)' }}
                  >
                    {item.sub}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer System Status */}
      <div 
        className="p-3 border-t border-[#D5D9DE] text-[11px] font-mono"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--sidebar)' }}
      >
        <div className="flex items-center justify-between mb-1.5">
          <span style={{ color: 'var(--sidebar-text)' }}>C++ Engine</span>
          {serverOnline ? (
            <div 
              className="flex items-center font-semibold space-x-1.5"
              style={{ color: 'var(--ok)' }}
            >
              <span 
                className="w-1.5 h-1.5 rounded-[1px]"
                style={{ backgroundColor: 'var(--ok)' }}
              ></span>
              <span>ONLINE:8080</span>
            </div>
          ) : (
            <div 
              className="flex items-center font-semibold space-x-1.5"
              style={{ color: 'var(--err)' }}
            >
              <span 
                className="w-1.5 h-1.5 rounded-[1px]"
                style={{ backgroundColor: 'var(--err)' }}
              ></span>
              <span>OFFLINE</span>
            </div>
          )}
        </div>
        <div 
          className="text-[10px] space-y-0.5"
          style={{ color: 'var(--sidebar-text)' }}
        >
          <div>Arch: C++17 / GCC UCRT64</div>
          <div>Target: Windows 11 x64</div>
        </div>
      </div>
    </aside>
  );
}
