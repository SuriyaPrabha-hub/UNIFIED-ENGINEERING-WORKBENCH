import React from 'react';
import { 
  LayoutDashboard, 
  Box, 
  Flame, 
  Cpu, 
  CircuitBoard, 
  BrainCircuit, 
  FileText, 
  Activity,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, serverOnline }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: 'Live' },
    { id: 'geometry', label: 'Geometry Viewer', icon: Box, sub: 'STL & ANSYS 3D' },
    { id: 'thermal', label: 'Thermal Analysis', icon: Flame, sub: '1D FEA & Convergence' },
    { id: 'performance', label: 'Performance Lab', icon: Cpu, sub: 'Multicore Benchmark' },
    { id: 'hardware', label: 'Hardware Integration', icon: CircuitBoard, sub: 'MCU/FPGA/JTAG' },
    { id: 'neural', label: 'Neural Network', icon: BrainCircuit, sub: 'Backprop & FD Check' },
    { id: 'reports', label: 'Reports & Exports', icon: FileText, sub: 'Evidence & CSV' },
  ];

  return (
    <aside className="w-64 bg-[#111827] border-r border-[#1F2937] flex flex-col h-screen fixed left-0 top-0 select-none z-30">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#1F2937] flex items-center space-x-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Activity className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-sm tracking-wider uppercase text-white font-mono">PASS SCIENCE</h1>
          <p className="text-xs text-blue-400 font-medium">Unified Workbench</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center px-3.5 py-2.5 rounded-lg text-left transition-all group ${
                isActive 
                  ? 'bg-blue-600/15 border border-blue-500/30 text-white shadow-sm' 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#1F2937]/50'
              }`}
            >
              <Icon className={`w-5 h-5 mr-3 transition-colors ${
                isActive ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'
              }`} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium flex items-center justify-between">
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-mono">
                      {item.badge}
                    </span>
                  )}
                </div>
                {item.sub && (
                  <p className="text-[11px] text-gray-500 truncate">{item.sub}</p>
                )}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer System Status */}
      <div className="p-4 border-t border-[#1F2937] bg-[#0E1524]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400 font-medium">C++ Backend Core</span>
          {serverOnline ? (
            <div className="flex items-center text-xs text-emerald-400 font-medium space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Online (8080)</span>
            </div>
          ) : (
            <div className="flex items-center text-xs text-rose-400 font-medium space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>Connecting...</span>
            </div>
          )}
        </div>
        <div className="text-[11px] text-gray-500 font-mono">
          <div>Arch: C++17 / GCC UCRT64</div>
          <div>Platform: Windows 11 x64</div>
        </div>
      </div>
    </aside>
  );
}
