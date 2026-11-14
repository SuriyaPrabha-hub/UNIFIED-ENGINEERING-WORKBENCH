import React from 'react';
import { 
  Box, 
  Flame, 
  Cpu, 
  CircuitBoard, 
  BrainCircuit, 
  ShieldCheck, 
  ArrowRight,
  Server,
  Layers
} from 'lucide-react';
import StatusCard from '../components/StatusCard';

export default function DashboardView({ setActiveTab, serverStatus }) {
  return (
    <div className="space-y-5">
      {/* Top Engineering Specification Banner */}
      <div className="bg-[#FFFFFF] border border-[#D5D9DE] rounded-[4px] p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="max-w-3xl">
            <div className="inline-flex items-center space-x-2 px-2 py-0.5 rounded-[4px] border border-[#D5D9DE] bg-[#F4F5F7] text-[#5F6B76] text-[10px] font-mono mb-2">
              <span>PASS SCIENCE WORKS | R&D ASSESSMENT 2026-2027</span>
            </div>
            <h1 className="text-xl font-bold text-[#1B1F23] tracking-tight">
              Unified Engineering Workbench
            </h1>
            <p className="mt-1 text-xs text-[#5F6B76] leading-relaxed">
              Multi-domain engineering platform integrating C++17 1D thermal finite-element analysis, 
              ASCII STL & ANSYS CSV visualization, multicore parallel benchmarking, embedded hardware telemetry simulation, 
              and central finite-difference gradient verification.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('thermal')}
              className="inline-flex items-center px-3 py-1.5 rounded-[4px] bg-[#E8590C] hover:bg-[#d04f0a] text-white text-xs font-semibold"
            >
              <Flame className="w-3.5 h-3.5 mr-1.5" /> Launch Thermal FEA
            </button>
            <button
              onClick={() => setActiveTab('geometry')}
              className="inline-flex items-center px-3 py-1.5 rounded-[4px] bg-[#FFFFFF] hover:bg-[#F4F5F7] text-[#1B1F23] text-xs font-semibold border border-[#D5D9DE]"
            >
              <Box className="w-3.5 h-3.5 mr-1.5 text-[#5F6B76]" /> CAD Geometry
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className="inline-flex items-center px-3 py-1.5 rounded-[4px] bg-[#FFFFFF] hover:bg-[#F4F5F7] text-[#1B1F23] text-xs font-semibold border border-[#D5D9DE]"
            >
              <Cpu className="w-3.5 h-3.5 mr-1.5 text-[#5F6B76]" /> Multicore Lab
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
          <h2 className="text-xs font-semibold text-[#5F6B76] uppercase tracking-wider font-mono">
            Engineering Modules
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Card 1: Thermal FEA */}
          <div 
            onClick={() => setActiveTab('thermal')}
            className="cursor-pointer bg-[#FFFFFF] border border-[#D5D9DE] rounded-[4px] p-4 hover:border-[#5F6B76] flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-7 h-7 rounded-[4px] border border-[#D5D9DE] bg-[#F4F5F7] text-[#1B1F23] flex items-center justify-center">
                  <Flame className="w-4 h-4 text-[#E8590C]" />
                </div>
                <span className="text-[10px] font-mono border border-[#D5D9DE] px-1.5 py-0.2 rounded-[4px] text-[#5F6B76]">
                  TASK C
                </span>
              </div>
              <h3 className="font-semibold text-xs text-[#1B1F23]">1D Thermal Finite Element Analysis</h3>
              <p className="text-[11px] text-[#5F6B76] mt-1.5 leading-relaxed">
                Uniform rod heat conduction with internal generation. Solves N=10, 20, 40, 80 elements with Gaussian elimination, exact analytical solution comparison, and midpoint convergence verification.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-[#D5D9DE] flex items-center justify-between text-[11px] text-[#1B1F23] font-medium">
              <span>Open Solver</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#5F6B76]" />
            </div>
          </div>

          {/* Card 2: 3D CAD & ANSYS */}
          <div 
            onClick={() => setActiveTab('geometry')}
            className="cursor-pointer bg-[#FFFFFF] border border-[#D5D9DE] rounded-[4px] p-4 hover:border-[#5F6B76] flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-7 h-7 rounded-[4px] border border-[#D5D9DE] bg-[#F4F5F7] text-[#1B1F23] flex items-center justify-center">
                  <Box className="w-4 h-4 text-[#5F6B76]" />
                </div>
                <span className="text-[10px] font-mono border border-[#B7791F] text-[#B7791F] px-1.5 py-0.2 rounded-[4px]">
                  SYNTHETIC
                </span>
              </div>
              <h3 className="font-semibold text-xs text-[#1B1F23]">CAD & ANSYS Data Visualization</h3>
              <p className="text-[11px] text-[#5F6B76] mt-1.5 leading-relaxed">
                Stream ASCII STL triangle meshes with Three.js orbit controls. Import ANSYS CSV nodal temperatures with classic blue-to-red legend and 3D node inspection.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-[#D5D9DE] flex items-center justify-between text-[11px] text-[#1B1F23] font-medium">
              <span>Open 3D Viewer</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#5F6B76]" />
            </div>
          </div>

          {/* Card 3: Multicore Lab */}
          <div 
            onClick={() => setActiveTab('performance')}
            className="cursor-pointer bg-[#FFFFFF] border border-[#D5D9DE] rounded-[4px] p-4 hover:border-[#5F6B76] flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-7 h-7 rounded-[4px] border border-[#D5D9DE] bg-[#F4F5F7] text-[#1B1F23] flex items-center justify-center">
                  <Cpu className="w-4 h-4 text-[#5F6B76]" />
                </div>
                <span className="text-[10px] font-mono border border-[#D5D9DE] px-1.5 py-0.2 rounded-[4px] text-[#5F6B76]">
                  TASK D
                </span>
              </div>
              <h3 className="font-semibold text-xs text-[#1B1F23]">Performance & Multicore Benchmark</h3>
              <p className="text-[11px] text-[#5F6B76] mt-1.5 leading-relaxed">
                Batch generator with fixed seed, 5 measured repetitions, median timing, speedup and efficiency for 1, 2, 3, 4 workers. Serial/parallel numerical agreement verified.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-[#D5D9DE] flex items-center justify-between text-[11px] text-[#1B1F23] font-medium">
              <span>Benchmark CPU</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#5F6B76]" />
            </div>
          </div>

          {/* Card 4: Hardware Integration */}
          <div 
            onClick={() => setActiveTab('hardware')}
            className="cursor-pointer bg-[#FFFFFF] border border-[#D5D9DE] rounded-[4px] p-4 hover:border-[#5F6B76] flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-7 h-7 rounded-[4px] border border-[#D5D9DE] bg-[#F4F5F7] text-[#1B1F23] flex items-center justify-center">
                  <CircuitBoard className="w-4 h-4 text-[#5F6B76]" />
                </div>
                <span className="text-[10px] font-mono border border-[#B7791F] text-[#B7791F] px-1.5 py-0.2 rounded-[4px]">
                  SIMULATED
                </span>
              </div>
              <h3 className="font-semibold text-xs text-[#1B1F23]">Embedded System Integration</h3>
              <p className="text-[11px] text-[#5F6B76] mt-1.5 leading-relaxed">
                Host-connected workbench architecture for STM32 MCU (3.3V), Artix-7 FPGA (1.8V level-shifted), and JTAG debug TAP probe. State machines with timeout tripping & recovery.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-[#D5D9DE] flex items-center justify-between text-[11px] text-[#1B1F23] font-medium">
              <span>Manage Devices</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#5F6B76]" />
            </div>
          </div>

          {/* Card 5: Neural Network */}
          <div 
            onClick={() => setActiveTab('neural')}
            className="cursor-pointer bg-[#FFFFFF] border border-[#D5D9DE] rounded-[4px] p-4 hover:border-[#5F6B76] flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-7 h-7 rounded-[4px] border border-[#D5D9DE] bg-[#F4F5F7] text-[#1B1F23] flex items-center justify-center">
                  <BrainCircuit className="w-4 h-4 text-[#5F6B76]" />
                </div>
                <span className="text-[10px] font-mono border border-[#D5D9DE] px-1.5 py-0.2 rounded-[4px] text-[#5F6B76]">
                  TASK F
                </span>
              </div>
              <h3 className="font-semibold text-xs text-[#1B1F23]">Backpropagation & Gradient Verification</h3>
              <p className="text-[11px] text-[#5F6B76] mt-1.5 leading-relaxed">
                Exact analytical chain-rule derivation compared with C++ central finite difference (ε=1e-6, error &le; 1e-5). 100-step training loss curve.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-[#D5D9DE] flex items-center justify-between text-[11px] text-[#1B1F23] font-medium">
              <span>Verify Math</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#5F6B76]" />
            </div>
          </div>

          {/* Card 6: Reports & Verification */}
          <div 
            onClick={() => setActiveTab('reports')}
            className="cursor-pointer bg-[#FFFFFF] border border-[#D5D9DE] rounded-[4px] p-4 hover:border-[#5F6B76] flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-7 h-7 rounded-[4px] border border-[#D5D9DE] bg-[#F4F5F7] text-[#1B1F23] flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-[#2E7D32]" />
                </div>
                <span className="text-[10px] font-mono border border-[#2E7D32] text-[#2E7D32] px-1.5 py-0.2 rounded-[4px]">
                  100 PTS
                </span>
              </div>
              <h3 className="font-semibold text-xs text-[#1B1F23]">Verification & Technical Report</h3>
              <p className="text-[11px] text-[#5F6B76] mt-1.5 leading-relaxed">
                Formal technical report, 100-point rubric breakdown, downloadable CSV results data, and AI assistance disclosure logs.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-[#D5D9DE] flex items-center justify-between text-[11px] text-[#1B1F23] font-medium">
              <span>View Report</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#5F6B76]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
