import React from 'react';
import { 
  Box, 
  Flame, 
  Cpu, 
  CircuitBoard, 
  BrainCircuit, 
  ShieldCheck, 
  ArrowRight,
  Server
} from 'lucide-react';
import StatusCard from '../components/StatusCard';

export default function DashboardView({ setActiveTab, serverStatus }) {
  return (
    <div className="space-y-5">
      {/* Top Engineering Specification Banner */}
      <div 
        className="rounded-[4px] border p-5"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="max-w-3xl">
            <div 
              className="inline-flex items-center space-x-2 px-2 py-0.5 rounded-[4px] border text-[10px] font-mono mb-2"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)', color: 'var(--muted)' }}
            >
              <span>PASS SCIENCE WORKS | R&D ASSESSMENT 2026-2027</span>
            </div>
            <h1 
              className="text-xl font-bold tracking-tight"
              style={{ color: 'var(--text)' }}
            >
              Unified Engineering Workbench
            </h1>
            <p 
              className="mt-1 text-xs leading-relaxed"
              style={{ color: 'var(--muted)' }}
            >
              Multi-domain engineering platform integrating C++17 1D thermal finite-element analysis, 
              ASCII STL &amp; ANSYS CSV visualization, multicore parallel benchmarking, embedded hardware telemetry simulation, 
              and central finite-difference gradient verification.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('thermal')}
              className="inline-flex items-center px-3 py-1.5 rounded-[4px] text-xs font-semibold"
              style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}
            >
              <Flame className="w-3.5 h-3.5 mr-1.5" /> Launch Thermal FEA
            </button>
            <button
              onClick={() => setActiveTab('geometry')}
              className="inline-flex items-center px-3 py-1.5 rounded-[4px] text-xs font-semibold border"
              style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              <Box className="w-3.5 h-3.5 mr-1.5" style={{ color: 'var(--muted)' }} /> CAD Geometry
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className="inline-flex items-center px-3 py-1.5 rounded-[4px] text-xs font-semibold border"
              style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              <Cpu className="w-3.5 h-3.5 mr-1.5" style={{ color: 'var(--muted)' }} /> Multicore Lab
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatusCard 
          title="Backend Engine" 
          value="C++17 UCRT" 
          subtext={serverStatus ? `Online | ${serverStatus.hardware_concurrency || 8} Logical Cores` : 'Connecting to Core...'} 
          icon={Server} 
          badge="Native"
        />
        <StatusCard 
          title="Thermal FEA Solver" 
          value="O(h²) Order" 
          subtext="Quadratic midpoint convergence verified" 
          icon={Flame} 
          badge="Verified"
        />
        <StatusCard 
          title="Parallel Workload" 
          value="1 to 4 Workers" 
          subtext="Deterministic order | Diff <= 1e-8 C" 
          icon={Cpu} 
          badge="Multithreaded"
        />
        <StatusCard 
          title="Embedded Hardware" 
          value="3 Devices" 
          subtext="MCU, FPGA & JTAG TAP Mocks" 
          icon={CircuitBoard} 
          badge="Simulated"
        />
      </div>

      {/* Engineering Workbench Modules Grid */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h2 
            className="text-xs font-semibold uppercase tracking-wider font-mono"
            style={{ color: 'var(--muted)' }}
          >
            Engineering Modules
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Card 1: Thermal FEA */}
          <div 
            onClick={() => setActiveTab('thermal')}
            className="cursor-pointer rounded-[4px] border p-4 flex flex-col justify-between"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div 
                  className="w-7 h-7 rounded-[4px] border flex items-center justify-center"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
                >
                  <Flame className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                </div>
                <span 
                  className="text-[10px] font-mono border px-1.5 py-0.2 rounded-[4px]"
                  style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
                >
                  TASK C
                </span>
              </div>
              <h3 
                className="font-semibold text-xs"
                style={{ color: 'var(--text)' }}
              >
                1D Thermal Finite Element Analysis
              </h3>
              <p 
                className="text-[11px] mt-1.5 leading-relaxed"
                style={{ color: 'var(--muted)' }}
              >
                Uniform rod heat conduction with internal generation. Solves N=10, 20, 40, 80 elements with Gaussian elimination, exact analytical solution comparison, and midpoint convergence verification.
              </p>
            </div>
            <div 
              className="mt-3 pt-2.5 border-t flex items-center justify-between text-[11px] font-medium"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              <span>Open Solver</span>
              <ArrowRight className="w-3.5 h-3.5" style={{ color: 'var(--muted)' }} />
            </div>
          </div>

          {/* Card 2: 3D CAD & ANSYS */}
          <div 
            onClick={() => setActiveTab('geometry')}
            className="cursor-pointer rounded-[4px] border p-4 flex flex-col justify-between"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div 
                  className="w-7 h-7 rounded-[4px] border flex items-center justify-center"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
                >
                  <Box className="w-4 h-4" style={{ color: 'var(--muted)' }} />
                </div>
                <span 
                  className="text-[10px] font-mono border px-1.5 py-0.2 rounded-[4px]"
                  style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}
                >
                  SYNTHETIC
                </span>
              </div>
              <h3 
                className="font-semibold text-xs"
                style={{ color: 'var(--text)' }}
              >
                CAD &amp; ANSYS Data Visualization
              </h3>
              <p 
                className="text-[11px] mt-1.5 leading-relaxed"
                style={{ color: 'var(--muted)' }}
              >
                Stream ASCII STL triangle meshes with Three.js orbit controls. Import ANSYS CSV nodal temperatures with classic blue-to-red legend and 3D node inspection.
              </p>
            </div>
            <div 
              className="mt-3 pt-2.5 border-t flex items-center justify-between text-[11px] font-medium"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              <span>Open 3D Viewer</span>
              <ArrowRight className="w-3.5 h-3.5" style={{ color: 'var(--muted)' }} />
            </div>
          </div>

          {/* Card 3: Multicore Lab */}
          <div 
            onClick={() => setActiveTab('performance')}
            className="cursor-pointer rounded-[4px] border p-4 flex flex-col justify-between"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div 
                  className="w-7 h-7 rounded-[4px] border flex items-center justify-center"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
                >
                  <Cpu className="w-4 h-4" style={{ color: 'var(--muted)' }} />
                </div>
                <span 
                  className="text-[10px] font-mono border px-1.5 py-0.2 rounded-[4px]"
                  style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
                >
                  TASK D
                </span>
              </div>
              <h3 
                className="font-semibold text-xs"
                style={{ color: 'var(--text)' }}
              >
                Performance &amp; Multicore Benchmark
              </h3>
              <p 
                className="text-[11px] mt-1.5 leading-relaxed"
                style={{ color: 'var(--muted)' }}
              >
                Batch generator with fixed seed, 5 measured repetitions, median timing, speedup and efficiency for 1, 2, 3, 4 workers. Serial/parallel numerical agreement verified.
              </p>
            </div>
            <div 
              className="mt-3 pt-2.5 border-t flex items-center justify-between text-[11px] font-medium"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              <span>Benchmark CPU</span>
              <ArrowRight className="w-3.5 h-3.5" style={{ color: 'var(--muted)' }} />
            </div>
          </div>

          {/* Card 4: Hardware Integration */}
          <div 
            onClick={() => setActiveTab('hardware')}
            className="cursor-pointer rounded-[4px] border p-4 flex flex-col justify-between"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div 
                  className="w-7 h-7 rounded-[4px] border flex items-center justify-center"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
                >
                  <CircuitBoard className="w-4 h-4" style={{ color: 'var(--muted)' }} />
                </div>
                <span 
                  className="text-[10px] font-mono border px-1.5 py-0.2 rounded-[4px]"
                  style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}
                >
                  SIMULATED
                </span>
              </div>
              <h3 
                className="font-semibold text-xs"
                style={{ color: 'var(--text)' }}
              >
                Embedded System Integration
              </h3>
              <p 
                className="text-[11px] mt-1.5 leading-relaxed"
                style={{ color: 'var(--muted)' }}
              >
                Host-connected workbench architecture for STM32 MCU (3.3V), Artix-7 FPGA (1.8V level-shifted), and JTAG debug TAP probe. State machines with timeout tripping &amp; recovery.
              </p>
            </div>
            <div 
              className="mt-3 pt-2.5 border-t flex items-center justify-between text-[11px] font-medium"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              <span>Manage Devices</span>
              <ArrowRight className="w-3.5 h-3.5" style={{ color: 'var(--muted)' }} />
            </div>
          </div>

          {/* Card 5: Neural Network */}
          <div 
            onClick={() => setActiveTab('neural')}
            className="cursor-pointer rounded-[4px] border p-4 flex flex-col justify-between"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div 
                  className="w-7 h-7 rounded-[4px] border flex items-center justify-center"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
                >
                  <BrainCircuit className="w-4 h-4" style={{ color: 'var(--muted)' }} />
                </div>
                <span 
                  className="text-[10px] font-mono border px-1.5 py-0.2 rounded-[4px]"
                  style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
                >
                  TASK F
                </span>
              </div>
              <h3 
                className="font-semibold text-xs"
                style={{ color: 'var(--text)' }}
              >
                Backpropagation &amp; Gradient Verification
              </h3>
              <p 
                className="text-[11px] mt-1.5 leading-relaxed"
                style={{ color: 'var(--muted)' }}
              >
                Exact analytical chain-rule derivation compared with C++ central finite difference (ε=1e-6, error &le; 1e-5). 100-step training loss curve.
              </p>
            </div>
            <div 
              className="mt-3 pt-2.5 border-t flex items-center justify-between text-[11px] font-medium"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              <span>Verify Math</span>
              <ArrowRight className="w-3.5 h-3.5" style={{ color: 'var(--muted)' }} />
            </div>
          </div>

          {/* Card 6: Reports & Verification */}
          <div 
            onClick={() => setActiveTab('reports')}
            className="cursor-pointer rounded-[4px] border p-4 flex flex-col justify-between"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div 
                  className="w-7 h-7 rounded-[4px] border flex items-center justify-center"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
                >
                  <ShieldCheck className="w-4 h-4" style={{ color: 'var(--ok)' }} />
                </div>
                <span 
                  className="text-[10px] font-mono border px-1.5 py-0.2 rounded-[4px]"
                  style={{ borderColor: 'var(--ok)', color: 'var(--ok)' }}
                >
                  100 PTS
                </span>
              </div>
              <h3 
                className="font-semibold text-xs"
                style={{ color: 'var(--text)' }}
              >
                Verification &amp; Technical Report
              </h3>
              <p 
                className="text-[11px] mt-1.5 leading-relaxed"
                style={{ color: 'var(--muted)' }}
              >
                Formal technical report, 100-point rubric breakdown, downloadable CSV results data, and AI assistance disclosure logs.
              </p>
            </div>
            <div 
              className="mt-3 pt-2.5 border-t flex items-center justify-between text-[11px] font-medium"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              <span>View Report</span>
              <ArrowRight className="w-3.5 h-3.5" style={{ color: 'var(--muted)' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
