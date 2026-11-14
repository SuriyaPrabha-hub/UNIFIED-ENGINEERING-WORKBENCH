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
import { Activity, Bell, RefreshCw, Cpu, Layers } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [serverOnline, setServerOnline] = useState(false);
  const [serverStatus, setServerStatus] = useState(null);

  // Poll backend health every 4 seconds
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
    <div className="flex min-h-screen bg-[#0B0F19] text-gray-100 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        serverOnline={serverOnline} 
      />

      {/* Main Content Area */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        {/* Top Navbar */}
        <header className="h-16 bg-[#111827]/80 backdrop-blur-md border-b border-[#1F2937] sticky top-0 z-20 px-8 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-xs uppercase tracking-wider text-gray-400 font-mono">Module</span>
            <span className="text-gray-600">/</span>
            <span className="text-sm font-semibold text-white capitalize font-mono">
              {activeTab.replace('-', ' ')}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            {/* Live Core Indicator */}
            <div className="flex items-center space-x-2 text-xs font-mono px-3 py-1.5 rounded-full bg-[#161F30] border border-[#1F2937]">
              <span className={`w-2 h-2 rounded-full ${serverOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
              <span className="text-gray-300">C++ REST Engine:</span>
              <span className={`font-bold ${serverOnline ? 'text-emerald-400' : 'text-rose-400'}`}>
                {serverOnline ? 'CONNECTED' : 'DISCONNECTED'}
              </span>
            </div>

            <button
              onClick={checkServer}
              title="Refresh connection"
              className="p-2 rounded-lg bg-[#1F2937] hover:bg-[#374151] border border-[#374151] text-gray-300 transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* View Viewport */}
        <main className="flex-1 p-8 max-w-7xl w-full mx-auto">
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
}
