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
          <h2 
            className="text-base font-bold tracking-tight flex items-center"
            style={{ color: 'var(--text)' }}
          >
            <CircuitBoard className="w-4 h-4 mr-2" style={{ color: 'var(--muted)' }} /> Embedded System Integration
          </h2>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Host-connected workbench architecture for Microcontroller, FPGA, and JTAG Debug Probe with C++ state machines.
          </p>
        </div>

        {/* SIMULATED badge: small grey/amber outlined label */}
        <span 
          className="rounded-[4px] border px-2 py-0.5 text-[11px] font-mono uppercase tracking-wider"
          style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}
        >
          SIMULATED HARDWARE BEHAVIOUR (MOCK ADAPTERS)
        </span>
      </div>

      {/* Error Alert */}
      {error && (
        <div 
          className="rounded-[4px] border p-3 flex items-start space-x-2 text-xs font-mono"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--err)', color: 'var(--err)' }}
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--err)' }} />
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
              className="border rounded-[4px] p-4 flex flex-col justify-between"
              style={{
                backgroundColor: 'var(--card)',
                borderColor: isError ? 'var(--err)' : 'var(--border)'
              }}
            >
              <div>
                {/* Device Title & Status Indicator */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs font-mono" style={{ color: 'var(--text)' }}>{dev.name}</span>
                    <span 
                      className="border text-[10px] font-mono px-1 py-0.2 rounded-[2px]"
                      style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
                    >
                      {dev.type}
                    </span>
                  </div>

                  <span 
                    className="text-[10px] font-mono px-1.5 py-0.2 rounded-[2px] border"
                    style={{
                      borderColor: isError ? 'var(--err)' : isConnected ? 'var(--ok)' : 'var(--border)',
                      color: isError ? 'var(--err)' : isConnected ? 'var(--ok)' : 'var(--muted)',
                      fontWeight: isConnected || isError ? 'bold' : 'normal'
                    }}
                  >
                    {dev.status}
                  </span>
                </div>

                {/* Device Specs Table */}
                <div 
                  className="space-y-1 text-xs font-mono py-2 border-y my-2"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--muted)' }}>Interface:</span>
                    <span style={{ color: 'var(--text)' }}>{dev.interface_protocol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--muted)' }}>Logic Domain:</span>
                    <span className="font-bold" style={{ color: 'var(--text)' }}>{dev.voltage_domain_V}V</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--muted)' }}>Max Current:</span>
                    <span style={{ color: 'var(--text)' }}>{dev.max_current_mA} mA</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--muted)' }}>Connector:</span>
                    <span style={{ color: 'var(--text)' }}>{dev.connector_type}</span>
                  </div>
                </div>

                {/* Live Telemetry Message */}
                <div 
                  className="p-2 rounded-[4px] border text-[11px] font-mono my-2"
                  style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}
                >
                  <span className="block text-[10px] uppercase font-bold" style={{ color: 'var(--muted)' }}>Telemetry Stream:</span>
                  <span 
                    style={{
                      color: isError ? 'var(--err)' : isConnected ? 'var(--text)' : 'var(--muted)',
                      fontWeight: isError ? 'bold' : 'normal'
                    }}
                  >
                    {dev.last_telemetry || 'Standby / Idle'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-1.5 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                <div className="grid grid-cols-2 gap-1.5">
                  {!isConnected ? (
                    <button
                      onClick={() => handleConnect(dev.id)}
                      disabled={isBusy}
                      className="px-2.5 py-1 rounded-[4px] text-xs font-semibold text-white disabled:opacity-50 transition-none"
                      style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}
                    >
                      Connect
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDisconnect(dev.id)}
                      disabled={isBusy}
                      className="px-2.5 py-1 rounded-[4px] border text-xs font-semibold disabled:opacity-50 transition-none"
                      style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    >
                      Disconnect
                    </button>
                  )}

                  {isError ? (
                    <button
                      onClick={() => handleRecover(dev.id)}
                      disabled={isBusy}
                      className="px-2.5 py-1 rounded-[4px] text-xs font-semibold text-white disabled:opacity-50 transition-none"
                      style={{ backgroundColor: 'var(--ok)', color: '#FFFFFF' }}
                    >
                      Recover / Reset
                    </button>
                  ) : (
                    <button
                      onClick={() => handleInjectFailure(dev.id)}
                      disabled={!isConnected || isBusy}
                      className="px-2.5 py-1 rounded-[4px] border text-xs font-semibold disabled:opacity-50 transition-none"
                      style={{ backgroundColor: 'var(--card)', borderColor: 'var(--err)', color: 'var(--err)' }}
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
      <div 
        className="rounded-[4px] border p-4 space-y-3"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
      >
        <h3 
          className="text-xs font-bold uppercase tracking-wider font-mono"
          style={{ color: 'var(--text)' }}
        >
          Hardware Architecture &amp; Voltage Domain Matrix
        </h3>

        <div className="overflow-x-auto">
          <table 
            className="w-full text-left text-xs font-mono border"
            style={{ borderColor: 'var(--border)' }}
          >
            <thead 
              className="border-b"
              style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--muted)' }}
            >
              <tr>
                <th className="py-2 px-3">Device Target</th>
                <th className="py-2 px-3">Primary Role</th>
                <th className="py-2 px-3">Voltage Domain</th>
                <th className="py-2 px-3">Level Shifting Required</th>
                <th className="py-2 px-3">Host Protocol</th>
                <th className="py-2 px-3">JTAG Ownership</th>
              </tr>
            </thead>
            <tbody 
              className="divide-y"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              <tr>
                <td className="py-2 px-3 font-bold">STM32H743ZI MCU</td>
                <td className="py-2 px-3">Sensor Telemetry &amp; Actuation</td>
                <td className="py-2 px-3 font-bold">3.3V DC</td>
                <td className="py-2 px-3" style={{ color: 'var(--ok)' }}>Direct (Native 3.3V)</td>
                <td className="py-2 px-3">USB-CDC Virtual COM (115200)</td>
                <td className="py-2 px-3">Target (SWD / JTAG Slave)</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-bold">Artix-7 FPGA</td>
                <td className="py-2 px-3">Parallel Matrix Accelerator</td>
                <td className="py-2 px-3 font-bold" style={{ color: 'var(--warn)' }}>1.8V VCCO</td>
                <td className="py-2 px-3 font-bold" style={{ color: 'var(--warn)' }}>TI TXS0108E / TXB0108 Bidirectional</td>
                <td className="py-2 px-3">SPI / FTDI USB FIFO (12 MB/s)</td>
                <td className="py-2 px-3">Target (IEEE 1149.1 TAP Slave)</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-bold">JTAG Adapter</td>
                <td className="py-2 px-3">Hardware Debug &amp; Boundary Scan</td>
                <td className="py-2 px-3 font-bold">1.2V - 5.0V VREF Sense</td>
                <td className="py-2 px-3" style={{ color: 'var(--ok)' }}>VREF-Referenced Buffers</td>
                <td className="py-2 px-3">USB High-Speed (CMSIS-DAP)</td>
                <td className="py-2 px-3 font-bold" style={{ color: 'var(--accent)' }}>Master (Drives TCK/TMS/TDI)</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div 
          className="p-3 rounded-[4px] border text-xs leading-relaxed"
          style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
        >
          <span className="font-bold">Why JTAG is a Debug Interface, Not an Interchangeable Compute Board:</span> A JTAG adapter is a transparent boundary-scan and TAP state-machine bus controller operating under IEEE 1149.1. It possesses no autonomous workload compute capability, executes no user algorithms, and owns master drive rights over synchronous clock and state transition lines. Connecting JTAG directly to incompatible voltage domains without VREF tracking causes permanent latch-up or diode clamping destruction.
        </div>
      </div>
    </div>
  );
}
