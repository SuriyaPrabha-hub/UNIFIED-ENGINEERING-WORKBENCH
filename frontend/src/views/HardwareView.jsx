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
                  className="space-y-1.5 text-xs font-mono py-2.5 border-y my-2"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--muted)' }}>Interface:</span>
                    <span style={{ color: 'var(--text)' }} className="truncate max-w-[170px]" title={dev.interface_type || dev.interface_protocol}>
                      {dev.interface_type || dev.interface_protocol || 'USB CDC-ACM'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--muted)' }}>Logic Domain:</span>
                    <span className="font-bold" style={{ color: 'var(--text)' }}>
                      {dev.voltage_domain || (dev.operating_voltage_V ? `${dev.operating_voltage_V}V DC` : '3.3V DC')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--muted)' }}>Serial Number:</span>
                    <span style={{ color: 'var(--text)' }}>{dev.serial_number || dev.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--muted)' }}>Firmware / MD5:</span>
                    <span style={{ color: 'var(--text)' }} className="truncate max-w-[170px]" title={dev.firmware_version}>
                      {dev.firmware_version || 'v2.4.1'}
                    </span>
                  </div>
                </div>

                {/* Live Telemetry Message */}
                <div 
                  className="p-3 rounded-[4px] border text-xs font-mono my-2 space-y-1.5"
                  style={{ 
                    backgroundColor: isError ? 'rgba(239,68,68,0.08)' : isConnected ? 'rgba(16,185,129,0.08)' : 'var(--bg)', 
                    borderColor: isError ? 'var(--err)' : isConnected ? 'var(--ok)' : 'var(--border)' 
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span 
                      className="text-[10px] uppercase font-bold tracking-wider flex items-center" 
                      style={{ color: isError ? 'var(--err)' : isConnected ? 'var(--ok)' : 'var(--muted)' }}
                    >
                      {isError ? '● BUS TIMEOUT FAULT' : isConnected ? '● LIVE TELEMETRY STREAM' : '○ STATUS'}
                    </span>
                    {isConnected && (
                      <span 
                        className="text-[10px] font-mono px-1.5 py-0.2 rounded-[2px] border font-bold animate-pulse" 
                        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--ok)', color: 'var(--ok)' }}
                      >
                        Pkt #{dev.telemetry?.packet_id || 1}
                      </span>
                    )}
                  </div>

                  {isError ? (
                    <div className="text-[11px] font-bold leading-relaxed" style={{ color: 'var(--err)' }}>
                      {dev.last_error || dev.telemetry?.custom_data || 'Target response timed out (1500 ms). Communication link stalled.'}
                    </div>
                  ) : isConnected && dev.telemetry ? (
                    <div className="space-y-1.5">
                      <div className="grid grid-cols-3 gap-1 text-[11px] font-mono">
                        <div className="p-1 rounded-[2px]" style={{ backgroundColor: 'var(--card)' }}>
                          <div className="text-[9px]" style={{ color: 'var(--muted)' }}>VOLTAGE</div>
                          <div className="font-bold text-[12px]" style={{ color: 'var(--text)' }}>
                            {dev.telemetry.voltage_V?.toFixed(2)} V
                          </div>
                        </div>
                        <div className="p-1 rounded-[2px]" style={{ backgroundColor: 'var(--card)' }}>
                          <div className="text-[9px]" style={{ color: 'var(--muted)' }}>CURRENT</div>
                          <div className="font-bold text-[12px]" style={{ color: 'var(--text)' }}>
                            {dev.telemetry.current_mA?.toFixed(1)} mA
                          </div>
                        </div>
                        <div className="p-1 rounded-[2px]" style={{ backgroundColor: 'var(--card)' }}>
                          <div className="text-[9px]" style={{ color: 'var(--muted)' }}>TEMP</div>
                          <div className="font-bold text-[12px]" style={{ color: 'var(--text)' }}>
                            {dev.telemetry.temperature_C?.toFixed(1)} °C
                          </div>
                        </div>
                      </div>
                      <div className="text-[10px] pt-1 border-t truncate" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
                        Payload: <span style={{ color: 'var(--text)' }}>{dev.telemetry.custom_data}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] leading-relaxed" style={{ color: 'var(--muted)' }}>
                      Standby / Idle — Click "Connect" to establish host connection &amp; start live telemetry stream.
                    </div>
                  )}
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
              {(() => {
                const mcuDev = devices.find(d => d.type === 'Microcontroller');
                const fpgaDev = devices.find(d => d.type === 'FPGA');
                const jtagDev = devices.find(d => d.type === 'JTAG Debug Probe');

                const getBadge = (dev) => {
                  if (!dev) return { text: 'IDLE', color: 'var(--muted)', bg: 'transparent' };
                  if (dev.status === 'Connected') return { text: 'CONNECTED', color: 'var(--ok)', bg: 'rgba(16,185,129,0.08)' };
                  if (dev.status.includes('Error') || dev.status.includes('Timeout')) return { text: 'TIMEOUT', color: 'var(--err)', bg: 'rgba(239,68,68,0.08)' };
                  return { text: 'DISCONNECTED', color: 'var(--muted)', bg: 'transparent' };
                };

                const mcuBadge = getBadge(mcuDev);
                const fpgaBadge = getBadge(fpgaDev);
                const jtagBadge = getBadge(jtagDev);

                return (
                  <>
                    <tr style={{ backgroundColor: mcuBadge.bg }}>
                      <td className="py-2 px-3 font-bold">
                        <div className="flex items-center justify-between">
                          <span>STM32H743ZI MCU</span>
                          <span 
                            className="text-[9px] font-mono border px-1.5 py-0.2 rounded-[2px] font-bold"
                            style={{ borderColor: mcuBadge.color, color: mcuBadge.color }}
                          >
                            {mcuBadge.text}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-3">Sensor Telemetry &amp; Actuation</td>
                      <td className="py-2 px-3 font-bold">3.3V DC</td>
                      <td className="py-2 px-3" style={{ color: 'var(--ok)' }}>Direct (Native 3.3V)</td>
                      <td className="py-2 px-3">USB-CDC Virtual COM (115200)</td>
                      <td className="py-2 px-3">Target (SWD / JTAG Slave)</td>
                    </tr>
                    <tr style={{ backgroundColor: fpgaBadge.bg }}>
                      <td className="py-2 px-3 font-bold">
                        <div className="flex items-center justify-between">
                          <span>Artix-7 FPGA</span>
                          <span 
                            className="text-[9px] font-mono border px-1.5 py-0.2 rounded-[2px] font-bold"
                            style={{ borderColor: fpgaBadge.color, color: fpgaBadge.color }}
                          >
                            {fpgaBadge.text}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-3">Parallel Matrix Accelerator</td>
                      <td className="py-2 px-3 font-bold" style={{ color: 'var(--warn)' }}>1.8V VCCO</td>
                      <td className="py-2 px-3 font-bold" style={{ color: 'var(--warn)' }}>TI TXS0108E / TXB0108 Bidirectional</td>
                      <td className="py-2 px-3">SPI / FTDI USB FIFO (12 MB/s)</td>
                      <td className="py-2 px-3">Target (IEEE 1149.1 TAP Slave)</td>
                    </tr>
                    <tr style={{ backgroundColor: jtagBadge.bg }}>
                      <td className="py-2 px-3 font-bold">
                        <div className="flex items-center justify-between">
                          <span>JTAG Adapter</span>
                          <span 
                            className="text-[9px] font-mono border px-1.5 py-0.2 rounded-[2px] font-bold"
                            style={{ borderColor: jtagBadge.color, color: jtagBadge.color }}
                          >
                            {jtagBadge.text}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-3">Hardware Debug &amp; Boundary Scan</td>
                      <td className="py-2 px-3 font-bold">1.2V - 5.0V VREF Sense</td>
                      <td className="py-2 px-3" style={{ color: 'var(--ok)' }}>VREF-Referenced Buffers</td>
                      <td className="py-2 px-3 font-bold" style={{ color: 'var(--accent)' }}>Master (Drives TCK/TMS/TDI)</td>
                    </tr>
                  </>
                );
              })()}
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
