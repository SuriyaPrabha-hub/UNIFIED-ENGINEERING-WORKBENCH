import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import DashboardView from './views/DashboardView';
import GeometryView from './views/GeometryView';
import ThermalView from './views/ThermalView';
import PerformanceView from './views/PerformanceView';
import HardwareView from './views/HardwareView';
import NeuralNetView from './views/NeuralNetView';
import ReportsView from './views/ReportsView';
import { api } from './api/client';
import { RefreshCw } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [serverOnline, setServerOnline] = useState(false);
  const [serverStatus, setServerStatus] = useState(null);

  useEffect(() => {
    checkServer();
    const interval = setInterval(checkServer, 4000);
    return () => clearInterval(interval);
  }, []);

  const checkServer = async () => {
    try {
      const res = await api.getStatus();
      setServerStatus(res);
      setServerOnline(true);
    } catch (_) {
      setServerOnline(false);
    }
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView setActiveTab={setActiveTab} serverStatus={serverStatus} />;
      case 'geometry':
        return <GeometryView />;
      case 'thermal':
        return <ThermalView />;
      case 'performance':
        return <PerformanceView />;
      case 'hardware':
        return <HardwareView />;
      case 'neural':
        return <NeuralNetView />;
      case 'reports':
        return <ReportsView />;
      default:
        return <DashboardView setActiveTab={setActiveTab} serverStatus={serverStatus} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F4F5F7] text-[#1B1F23] font-sans">
      {/* Sidebar Navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        serverOnline={serverOnline} 
      />

      {/* Main Content Area */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        {/* Top CAD-Style Status Bar */}
        <header className="h-11 bg-[#FFFFFF] border-b border-[#D5D9DE] sticky top-0 z-20 px-6 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs">
            <span className="font-mono text-[11px] uppercase tracking-wider text-[#5F6B76]">Workbench</span>
            <span className="text-[#D5D9DE]">/</span>
            <span className="font-mono font-semibold text-[#1B1F23] uppercase">
              {activeTab.replace('-', ' ')}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {/* C++ Core Status Indicator */}
            <div className="flex items-center space-x-2 text-xs font-mono px-2.5 py-1 rounded-[4px] bg-[#F4F5F7] border border-[#D5D9DE]">
              <span className={`w-2 h-2 rounded-[1px] ${serverOnline ? 'bg-[#2E7D32]' : 'bg-[#C62828]'}`}></span>
              <span className="text-[#5F6B76]">C++ REST:</span>
              <span className={`font-bold ${serverOnline ? 'text-[#2E7D32]' : 'text-[#C62828]'}`}>
                {serverOnline ? 'CONNECTED' : 'DISCONNECTED'}
              </span>
            </div>

            <button
              onClick={checkServer}
              title="Refresh connection"
              className="p-1 rounded-[4px] bg-[#FFFFFF] hover:bg-[#F4F5F7] border border-[#D5D9DE] text-[#5F6B76] transition-none"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* View Viewport */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
}
