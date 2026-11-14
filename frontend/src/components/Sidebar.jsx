import React from 'react';
import { 
  LayoutDashboard, 
  Box, 
  Flame, 
  Cpu, 
  CircuitBoard, 
  BrainCircuit, 
  FileText, 
  Activity
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
    <aside className="w-64 bg-[#1F2429] border-r border-[#2C333A] flex flex-col h-screen fixed left-0 top-0 select-none z-30">
      {/* Brand Header */}
      <div className="p-4 border-b border-[#2C333A] flex items-center space-x-3">
        <div className="w-7 h-7 rounded-[4px] bg-[#E8590C] text-white flex items-center justify-center font-bold text-xs font-mono">
          PW
        </div>
        <div>
          <h1 className="font-bold text-xs tracking-wider uppercase text-white font-mono">PASS SCIENCE</h1>
          <p className="text-[11px] text-[#C9CED4]">Engineering Workbench</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-[#7E8792]">
          Workspaces
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center px-2.5 py-2 rounded-[4px] text-left transition-none ${
                isActive 
                  ? 'bg-[#2A313A] border-l-2 border-l-[#E8590C] text-white' 
                  : 'text-[#C9CED4] hover:bg-[#262C33] hover:text-white border-l-2 border-l-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 mr-2.5 flex-shrink-0 ${
                isActive ? 'text-[#E8590C]' : 'text-[#7E8792]'
              }`} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">
                  {item.label}
                </div>
                {item.sub && (
                  <p className="text-[10px] text-[#7E8792] truncate font-mono">{item.sub}</p>
                )}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer System Status */}
      <div className="p-3 border-t border-[#2C333A] bg-[#1A1E22] text-[11px] font-mono">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[#7E8792]">C++ Engine</span>
          {serverOnline ? (
            <div className="flex items-center text-[#2E7D32] font-semibold space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-[1px] bg-[#2E7D32]"></span>
              <span>ONLINE:8080</span>
            </div>
          ) : (
            <div className="flex items-center text-[#C62828] font-semibold space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-[1px] bg-[#C62828]"></span>
              <span>OFFLINE</span>
            </div>
          )}
        </div>
        <div className="text-[10px] text-[#7E8792] space-y-0.5">
          <div>Arch: C++17 / GCC UCRT64</div>
          <div>Target: Windows 11 x64</div>
        </div>
      </div>
    </aside>
  );
}
