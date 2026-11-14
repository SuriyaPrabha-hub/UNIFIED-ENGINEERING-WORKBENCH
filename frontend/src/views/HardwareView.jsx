import React, { useState, useEffect } from 'react';
import { 
  CircuitBoard, 
  Power, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Cpu, 
  ShieldAlert, 
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';
import { api } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';

export default function HardwareView() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(null);
  const [docData, setDocData] = useState(null);

  useEffect(() => {
    fetchDevices();
    fetchDoc();
    const interval = setInterval(fetchDevices, 2000);
    return () => clearInterval(interval);
  }, []);

  const fetchDevices = async () => {
    try {
      const res = await api.getDevices();
      setDevices(res);
    } catch (err) {
      console.error('Failed to poll hardware devices:', err);
    }
  };

  const fetchDoc = async () => {
    try {
      const res = await api.getHardwareDoc();
      setDocData(res);
    } catch (err) {
      console.error('Failed to fetch hardware doc:', err);
    }
  };

  const handleConnect = async (id) => {
    setActionInProgress(id);
    try {
      const res = await api.connectDevice(id);
      if (res.devices) setDevices(res.devices);
    } catch (err) {
      setError(`Connection failed: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDisconnect = async (id) => {
    setActionInProgress(id);
    try {
      const res = await api.disconnectDevice(id);
      if (res.devices) setDevices(res.devices);
    } catch (err) {
      setError(`Disconnect failed: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleInjectFailure = async (id) => {
    setActionInProgress(id);
    try {
      const res = await api.injectFailure(id, 'TIMEOUT');
      if (res.devices) setDevices(res.devices);
    } catch (err) {
      setError(`Failure injection failed: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRecover = async (id) => {
    setActionInProgress(id);
    try {
      const res = await api.recoverDevice(id);
      if (res.devices) setDevices(res.devices);
    } catch (err) {
      setError(`Recovery failed: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#1B1F23] tracking-tight flex items-center">
            <CircuitBoard className="w-4 h-4 text-[#5F6B76] mr-2" /> Embedded System Integration
          </h2>
          <p className="text-xs text-[#5F6B76]">
            Host-connected workbench architecture for Microcontroller, FPGA, and JTAG Debug Probe with C++ state machines.
          </p>
        </div>

        {/* SIMULATED badge: small grey/amber outlined label */}
        <span className="border border-[#B7791F] text-[#B7791F] rounded-[4px] px-2 py-0.5 text-[11px] font-mono uppercase tracking-wider">
          SIMULATED HARDWARE BEHAVIOUR (MOCK ADAPTERS)
        </span>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-[#FFF5F5] border border-[#C62828] rounded-[4px] p-3 flex items-start space-x-2 text-[#C62828] text-xs font-mono">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-[#C62828] mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* Three Device Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {devices.map((dev) => {
          const isConnected = dev.status === 'Connected';
          const isError = dev.status.includes('Error') || dev.status.includes('Timeout');
          const isBusy = actionInProgress === dev.id;

          return (
            <div 
              key={dev.id} 
              className={`border rounded-[4px] p-4 flex flex-col justify-between ${
                isError 
                  ? 'border-[#C62828] bg-[#FFF8F8]' 
                  : 'border-[#D5D9DE] bg-[#FFFFFF]'
              }`}
            >
              <div>
                {/* Device Title & Status Indicator */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs text-[#1B1F23] font-mono">{dev.name}</span>
                    <span className="border border-[#D5D9DE] text-[#5F6B76] text-[10px] font-mono px-1 py-0.2 rounded-[2px]">
                      {dev.type}
                    </span>
                  </div>

                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-[2px] border ${
                    isError 
                      ? 'border-[#C62828] text-[#C62828] font-bold' 
                      : isConnected 
                        ? 'border-[#2E7D32] text-[#2E7D32] font-semibold' 
                        : 'border-[#D5D9DE] text-[#5F6B76]'
                  }`}>
                    {dev.status}
                  </span>
                </div>

                {/* Device Specs Table */}
                <div className="space-y-1 text-xs font-mono py-2 border-y border-[#D5D9DE] my-2">
                  <div className="flex justify-between">
                    <span className="text-[#5F6B76]">Interface:</span>
                    <span className="text-[#1B1F23]">{dev.interface_protocol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5F6B76]">Logic Domain:</span>
                    <span className="text-[#1B1F23] font-bold">{dev.voltage_domain_V}V</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5F6B76]">Max Current:</span>
                    <span className="text-[#1B1F23]">{dev.max_current_mA} mA</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5F6B76]">Connector:</span>
                    <span className="text-[#1B1F23]">{dev.connector_type}</span>
                  </div>
                </div>

                {/* Live Telemetry Message */}
                <div className="bg-[#F4F5F7] p-2 rounded-[4px] border border-[#D5D9DE] text-[11px] font-mono my-2">
                  <span className="text-[#5F6B76] block text-[10px] uppercase font-bold">Telemetry Stream:</span>
                  <span className={isError ? 'text-[#C62828] font-bold' : isConnected ? 'text-[#1B1F23]' : 'text-[#5F6B76]'}>
                    {dev.last_telemetry || 'Standby / Idle'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-1.5 pt-2 border-t border-[#D5D9DE]">
                <div className="grid grid-cols-2 gap-1.5">
                  {!isConnected ? (
                    <button
                      onClick={() => handleConnect(dev.id)}
                      disabled={isBusy}
                      className="px-2.5 py-1 rounded-[4px] bg-[#E8590C] hover:bg-[#d04f0a] text-white text-xs font-semibold disabled:opacity-50"
                    >
                      Connect
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDisconnect(dev.id)}
                      disabled={isBusy}
                      className="px-2.5 py-1 rounded-[4px] bg-[#FFFFFF] hover:bg-[#F4F5F7] border border-[#D5D9DE] text-[#1B1F23] text-xs font-semibold disabled:opacity-50"
                    >
                      Disconnect
                    </button>
                  )}

                  {isError ? (
                    <button
                      onClick={() => handleRecover(dev.id)}
                      disabled={isBusy}
                      className="px-2.5 py-1 rounded-[4px] bg-[#2E7D32] hover:bg-[#256628] text-white text-xs font-semibold disabled:opacity-50"
                    >
                      Recover / Reset
                    </button>
                  ) : (
                    <button
                      onClick={() => handleInjectFailure(dev.id)}
                      disabled={!isConnected || isBusy}
                      className="px-2.5 py-1 rounded-[4px] bg-[#FFFFFF] hover:bg-[#FFF5F5] border border-[#C62828] text-[#C62828] text-xs font-semibold disabled:opacity-50"
                    >
                      Trip Timeout
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interface and Voltage Matrix Table */}
      <div className="bg-[#FFFFFF] border border-[#D5D9DE] rounded-[4px] p-4 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#1B1F23] font-mono">
          Hardware Architecture &amp; Voltage Domain Matrix
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border border-[#D5D9DE]">
            <thead className="bg-[#F4F5F7] text-[#5F6B76] border-b border-[#D5D9DE]">
              <tr>
                <th className="py-2 px-3">Device Target</th>
                <th className="py-2 px-3">Primary Role</th>
                <th className="py-2 px-3">Voltage Domain</th>
                <th className="py-2 px-3">Level Shifting Required</th>
                <th className="py-2 px-3">Host Protocol</th>
                <th className="py-2 px-3">JTAG Ownership</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D5D9DE] text-[#1B1F23]">
              <tr className="hover:bg-[#F4F5F7]">
                <td className="py-2 px-3 font-bold">STM32F401 MCU</td>
                <td className="py-2 px-3">Sensor Telemetry &amp; Actuation</td>
                <td className="py-2 px-3 font-bold">3.3V DC</td>
                <td className="py-2 px-3 text-[#2E7D32]">Direct (Native 3.3V)</td>
                <td className="py-2 px-3">USB-CDC Virtual COM (115200)</td>
                <td className="py-2 px-3">Target (SWD / JTAG Slave)</td>
              </tr>
              <tr className="hover:bg-[#F4F5F7]">
                <td className="py-2 px-3 font-bold">Artix-7 FPGA</td>
                <td className="py-2 px-3">Parallel Matrix Accelerator</td>
                <td className="py-2 px-3 font-bold text-[#B7791F]">1.8V VCCO</td>
                <td className="py-2 px-3 text-[#B7791F] font-bold">TXB0108 / LSF0108 Bidirectional</td>
                <td className="py-2 px-3">SPI / FTDI USB FIFO (12 MB/s)</td>
                <td className="py-2 px-3">Target (IEEE 1149.1 TAP Slave)</td>
              </tr>
              <tr className="hover:bg-[#F4F5F7]">
                <td className="py-2 px-3 font-bold">JTAG Adapter</td>
                <td className="py-2 px-3">Hardware Debug &amp; Boundary Scan</td>
                <td className="py-2 px-3 font-bold">1.2V - 5.0V VREF Sense</td>
                <td className="py-2 px-3 text-[#2E7D32]">VREF-Referenced Buffers</td>
                <td className="py-2 px-3">USB High-Speed (CMSIS-DAP)</td>
                <td className="py-2 px-3 font-bold text-[#E8590C]">Master (Drives TCK/TMS/TDI)</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-[#F4F5F7] rounded-[4px] border border-[#D5D9DE] text-xs text-[#1B1F23] leading-relaxed">
          <span className="font-bold">Why JTAG is a Debug Interface, Not an Interchangeable Compute Board:</span> A JTAG adapter is a transparent boundary-scan and TAP state-machine bus controller operating under IEEE 1149.1. It possesses no autonomous workload compute capability, executes no user algorithms, and owns master drive rights over synchronous clock and state transition lines. Connecting JTAG directly to incompatible voltage domains without VREF tracking causes permanent latch-up or diode clamping destruction.
        </div>
      </div>
    </div>
  );
}
