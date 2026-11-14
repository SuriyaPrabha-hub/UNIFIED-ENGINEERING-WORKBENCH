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
    <div 
      className="flex min-h-screen font-sans"
      style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}
    >
      {/* Sidebar Navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        serverOnline={serverOnline} 
      />

      {/* Main Content Area */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        {/* Top CAD-Style Status Bar */}
        <header 
          className="h-11 sticky top-0 z-20 px-6 flex items-center justify-between border-b"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center space-x-2 text-xs">
            <span 
              className="font-mono text-[11px] uppercase tracking-wider"
              style={{ color: 'var(--muted)' }}
            >
              Workbench
            </span>
            <span style={{ color: 'var(--border)' }}>/</span>
            <span 
              className="font-mono font-semibold uppercase"
              style={{ color: 'var(--text)' }}
            >
              {activeTab.replace('-', ' ')}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {/* C++ Core Status Indicator */}
            <div 
              className="flex items-center space-x-2 text-xs font-mono px-2.5 py-1 rounded-[4px] border"
              style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}
            >
              <span 
                className="w-2 h-2 rounded-[1px]"
                style={{ backgroundColor: serverOnline ? 'var(--ok)' : 'var(--err)' }}
              ></span>
              <span style={{ color: 'var(--muted)' }}>C++ REST:</span>
              <span 
                className="font-bold"
                style={{ color: serverOnline ? 'var(--ok)' : 'var(--err)' }}
              >
                {serverOnline ? 'CONNECTED' : 'DISCONNECTED'}
              </span>
            </div>

            <button
              onClick={checkServer}
              title="Refresh connection"
              className="p-1 rounded-[4px] border transition-none"
              style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--muted)' }}
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
