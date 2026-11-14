import React, { useState, useEffect } from 'react';
import { 
  CircuitBoard, 
  Power, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Cpu, 
  Activity, 
  Zap, 
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

  // Poll devices & telemetry every 2 seconds
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center">
            <CircuitBoard className="w-6 h-6 text-emerald-400 mr-2.5" /> Embedded System Integration
          </h2>
          <p className="text-sm text-gray-400">
            Host-connected workbench architecture for Microcontroller, FPGA, and JTAG Debug Probe with C++ state machines.
          </p>
        </div>

        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
          <span>SIMULATED HARDWARE BEHAVIOUR (MOCK ADAPTERS)</span>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex items-start space-x-3 text-rose-300 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* Three Device Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {devices.map((dev) => {
          const isConnected = dev.status === 'Connected';
          const isError = dev.status.includes('Error') || dev.status.includes('Timeout');
          const isBusy = actionInProgress === dev.id;

          return (
            <div 
              key={dev.id} 
              className={`bg-[#111827] border rounded-xl overflow-hidden shadow-sm flex flex-col justify-between transition-all ${
                isError 
                  ? 'border-rose-500/60 bg-rose-950/10' 
                  : isConnected 
                  ? 'border-emerald-500/40 bg-[#121d28]/30' 
                  : 'border-[#1F2937]'
              }`}
            >
              {/* Card Header */}
              <div className="p-5 border-b border-[#1F2937]/60">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2.5 rounded-lg border ${
                      isError 
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-400' 
                        : isConnected 
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' 
                        : 'bg-gray-800 border-gray-700 text-gray-400'
                    }`}>
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white">{dev.name}</h3>
                      <span className="text-[11px] font-mono text-gray-400">{dev.serial_number}</span>
                    </div>
                  </div>

                  <span className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
                    isError 
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300 animate-pulse' 
                      : isConnected 
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' 
                      : 'bg-gray-800 border-gray-700 text-gray-400'
                  }`}>
                    {dev.status}
                  </span>
                </div>

                <div className="mt-3 text-xs text-blue-300 font-mono bg-[#161F30] px-2.5 py-1 rounded border border-[#1F2937]">
                  {dev.voltage_domain}
                </div>
              </div>

              {/* Card Body: Live Telemetry & Capabilities */}
              <div className="p-5 space-y-4 flex-1">
                {/* Telemetry Stream */}
                <div>
                  <div className="text-xs font-semibold text-gray-400 mb-2 flex items-center justify-between">
                    <span className="flex items-center">
                      <Activity className="w-3.5 h-3.5 text-blue-400 mr-1.5" /> Telemetry Packet #{dev.telemetry?.packet_id}
                    </span>
                    <span className="text-[10px] font-mono text-gray-500">
                      T+{dev.telemetry?.timestamp_s?.toFixed(1)}s
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center font-mono">
                    <div className="p-2 rounded bg-[#161F30] border border-[#1F2937]">
                      <div className="text-[10px] text-gray-400">Supply</div>
                      <div className="text-sm font-bold text-white mt-0.5">
                        {dev.telemetry?.voltage_V?.toFixed(2)} V
                      </div>
                    </div>
                    <div className="p-2 rounded bg-[#161F30] border border-[#1F2937]">
                      <div className="text-[10px] text-gray-400">Current</div>
                      <div className="text-sm font-bold text-amber-400 mt-0.5">
                        {dev.telemetry?.current_mA?.toFixed(1)} mA
                      </div>
                    </div>
                    <div className="p-2 rounded bg-[#161F30] border border-[#1F2937]">
                      <div className="text-[10px] text-gray-400">Temp</div>
                      <div className="text-sm font-bold text-rose-400 mt-0.5">
                        {dev.telemetry?.temperature_C?.toFixed(1)} °C
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 text-[11px] font-mono text-gray-300 bg-[#161F30] p-2 rounded border border-[#1F2937] truncate">
                    {dev.telemetry?.custom_data}
                  </div>
                </div>

                {/* Error Banner if tripped */}
                {isError && (
                  <div className="p-3 bg-rose-500/15 border border-rose-500/40 rounded-lg text-xs text-rose-200">
                    <div className="font-bold flex items-center mb-0.5">
                      <AlertTriangle className="w-3.5 h-3.5 mr-1 text-rose-400" /> Comm Fault Injected
                    </div>
                    <p className="text-[11px] leading-tight">{dev.last_error}</p>
                  </div>
                )}

                {/* Capabilities list */}
                <div>
                  <div className="text-xs font-semibold text-gray-400 mb-1.5">Hardware Capabilities:</div>
                  <ul className="text-[11px] text-gray-400 space-y-0.5 list-disc list-inside">
                    {dev.capabilities?.slice(0, 3).map((cap, i) => (
                      <li key={i} className="truncate">{cap}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Card Actions Footer */}
              <div className="p-4 bg-[#161F30]/60 border-t border-[#1F2937] flex items-center justify-between gap-2">
                {!isConnected && !isError && (
                  <button
                    onClick={() => handleConnect(dev.id)}
                    disabled={isBusy}
                    className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition flex items-center justify-center shadow-sm"
                  >
                    <Power className="w-3.5 h-3.5 mr-1.5" /> Connect Device
                  </button>
                )}

                {isConnected && (
                  <>
                    <button
                      onClick={() => handleDisconnect(dev.id)}
                      disabled={isBusy}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-[#1F2937] hover:bg-[#374151] border border-[#374151] text-xs font-medium text-gray-300 transition"
                    >
                      Disconnect
                    </button>
                    <button
                      onClick={() => handleInjectFailure(dev.id)}
                      disabled={isBusy}
                      className="py-1.5 px-3 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-xs font-medium text-rose-300 transition flex items-center"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Trip Timeout
                    </button>
                  </>
                )}

                {isError && (
                  <button
                    onClick={() => handleRecover(dev.id)}
                    disabled={isBusy}
                    className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition flex items-center justify-center shadow-lg shadow-emerald-500/20"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Reconnect & Recover Safely
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Embedded Architecture Documentation & Block Diagram */}
      <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
          <h3 className="text-base font-bold text-white flex items-center">
            <Layers className="w-5 h-5 text-blue-400 mr-2" /> Host-Connected Workbench Architecture & Electrical Design
          </h3>
          <span className="text-xs text-gray-400 font-mono">IEEE 1149.1 / ARM SWD & SPI-UART Specification</span>
        </div>

        {/* JTAG Critical Architectural Rationale */}
        <div className="p-4 bg-blue-900/15 border border-blue-500/30 rounded-xl text-xs text-gray-300 space-y-2">
          <div className="text-sm font-bold text-blue-400 flex items-center">
            <Info className="w-4 h-4 mr-2 text-blue-400" /> Why a JTAG Adapter is a Debug Interface, NOT a Generic Compute Board
          </div>
          <p className="leading-relaxed">
            {docData?.jtag_rationale || 
              "A JTAG debug probe (e.g. SEGGER J-Link / ST-Link) operates as a test access port (TAP) controller rather than an application coprocessor. " +
              "It possesses dedicated hardware line drivers to assert IEEE 1149.1 state machine sequences (TCK, TMS, TDI, TDO, nSRST) to halt target execution, read CPU core registers, " +
              "and flash non-volatile memory via boundary scan. It does NOT execute firmware payloads or share common compute buses with the target MCU/FPGA."}
          </p>
        </div>

        {/* Pinout & Voltage Table */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
            Interface, Pinout, Voltage Domains & Level Shifting Matrix
          </h4>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#161F30] text-gray-400 border-b border-[#1F2937]">
                <tr>
                  <th className="py-2.5 px-3">Subsystem</th>
                  <th className="py-2.5 px-3">Key Signals</th>
                  <th className="py-2.5 px-3">Voltage Domain</th>
                  <th className="py-2.5 px-3">Level Shifter Required?</th>
                  <th className="py-2.5 px-3">Physical Connector</th>
                  <th className="py-2.5 px-3">Transport Protocol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F2937] text-gray-200">
                {docData?.pin_table?.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#161F30]/50">
                    <td className="py-2.5 px-3 font-bold text-blue-400">{row.subsystem}</td>
                    <td className="py-2.5 px-3 text-gray-300">{row.pin_signal}</td>
                    <td className="py-2.5 px-3 text-amber-300">{row.voltage_domain}</td>
                    <td className="py-2.5 px-3 font-semibold text-rose-300">{row.level_shifting}</td>
                    <td className="py-2.5 px-3">{row.connector}</td>
                    <td className="py-2.5 px-3 text-emerald-400">{row.protocol}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Safe Integration Guidelines */}
        <div className="p-4 bg-[#161F30] rounded-xl border border-[#1F2937] text-xs space-y-2">
          <div className="font-bold text-white flex items-center">
            <ShieldAlert className="w-4 h-4 text-emerald-400 mr-2" /> Safe Hardware Integration Plan
          </div>
          <p className="text-gray-300 whitespace-pre-line leading-relaxed font-sans">
            {docData?.safe_integration_plan || 
              "1. Ground Integrity: Star ground bus must be tied prior to power distribution.\n" +
              "2. Level Translation: Never connect 3.3V MCU directly to 1.8V FPGA banks without bidirectional level translation (TXS0108E).\n" +
              "3. Power Sequencing: FPGA internal core (1.0V) and I/O banks (1.8V) must stabilize before asserting JTAG clock to prevent latch-up.\n" +
              "4. JTAG Ownership: Debug probe acts as Master TAP driver; MCU and FPGA remain slaves on isolated boundary chains."}
          </p>
        </div>
      </div>
    </div>
  );
}
