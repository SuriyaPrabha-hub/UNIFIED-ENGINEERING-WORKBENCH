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
  Zap,
  CheckCircle2
} from 'lucide-react';
import StatusCard from '../components/StatusCard';

export default function DashboardView({ setActiveTab, serverStatus }) {
  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/20 border border-blue-500/20 p-8 shadow-xl">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono mb-4">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
            <span>PASS SCIENCE WORKS | R&D INTERNSHIP 2026-2027</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
            Unified Engineering Workbench
          </h1>
          <p className="mt-3 text-base text-gray-300 leading-relaxed">
            Multi-domain engineering assessment platform integrating C++17 thermal finite-element analysis, 
            3D CAD/ANSYS visualization, multicore multithreaded benchmarking, embedded hardware telemetry simulation, 
            and verified neural network backpropagation.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => setActiveTab('thermal')}
              className="inline-flex items-center px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition shadow-lg shadow-blue-500/25"
            >
              <Flame className="w-4 h-4 mr-2" /> Launch Thermal FEA
            </button>
            <button
              onClick={() => setActiveTab('geometry')}
              className="inline-flex items-center px-4 py-2.5 rounded-lg bg-[#1F2937] hover:bg-[#374151] text-gray-200 text-sm font-medium transition border border-[#374151]"
            >
              <Box className="w-4 h-4 mr-2" /> Inspect 3D Geometry
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className="inline-flex items-center px-4 py-2.5 rounded-lg bg-[#1F2937] hover:bg-[#374151] text-gray-200 text-sm font-medium transition border border-[#374151]"
            >
              <Cpu className="w-4 h-4 mr-2" /> Multicore Lab
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard 
          title="Backend Engine" 
          value="C++17 UCRT" 
          subtext={serverStatus ? `Online | ${serverStatus.hardware_concurrency || 8} Logical Cores` : 'Connecting to Core...'} 
          icon={Server} 
          color="blue"
          badge="Native"
        />
        <StatusCard 
          title="Thermal FEA Solvers" 
          value="O(h²) Order" 
          subtext="Quadratic midpoint convergence verified" 
          icon={Flame} 
          color="emerald"
          badge="Verified"
        />
        <StatusCard 
          title="Parallel Speedup" 
          value="1 to 4 Workers" 
          subtext="Deterministic order | Diff <= 1e-8 C" 
          icon={Cpu} 
          color="purple"
          badge="Multithreaded"
        />
        <StatusCard 
          title="Embedded Hardware" 
          value="3 Devices" 
          subtext="MCU, FPGA & JTAG TAP Mocks" 
          icon={CircuitBoard} 
          color="amber"
          badge="Simulated"
        />
      </div>

      {/* Core Engineering Modules Grid */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4 flex items-center">
          <Zap className="w-5 h-5 text-blue-400 mr-2" /> Engineering Workbench Modules
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Thermal FEA */}
          <div 
            onClick={() => setActiveTab('thermal')}
            className="group cursor-pointer bg-[#111827] border border-[#1F2937] rounded-xl p-5 hover:border-blue-500/50 hover:bg-[#131d33] transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center mb-4">
                <Flame className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-white group-hover:text-blue-400 transition">1D Thermal Finite Element Analysis</h3>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                Steady-state uniform rod heat equation with volumetric generation. Solves N=10, 20, 40, 80 elements with Gaussian elimination, exact analytical comparison, and midpoint convergence.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#1F2937] flex items-center justify-between text-xs text-blue-400 font-medium">
              <span>Run Solver</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </div>
          </div>

          {/* Card 2: 3D CAD & ANSYS */}
          <div 
            onClick={() => setActiveTab('geometry')}
            className="group cursor-pointer bg-[#111827] border border-[#1F2937] rounded-xl p-5 hover:border-blue-500/50 hover:bg-[#131d33] transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4">
                <Box className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-white group-hover:text-blue-400 transition">CAD & ANSYS Visualization</h3>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                Stream ASCII STL triangle meshes with Three.js orbit controls. Import ANSYS CSV nodal temperatures with 3D color gradients, legend, and interactive node inspection.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#1F2937] flex items-center justify-between text-xs text-blue-400 font-medium">
              <span>Open 3D Viewer</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </div>
          </div>

          {/* Card 3: Multicore Lab */}
          <div 
            onClick={() => setActiveTab('performance')}
            className="group cursor-pointer bg-[#111827] border border-[#1F2937] rounded-xl p-5 hover:border-blue-500/50 hover:bg-[#131d33] transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-white group-hover:text-blue-400 transition">Performance & Multicore Lab</h3>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                Batch generator with fixed seed, 5 measured repetitions, median timing, speedup and efficiency for 1, 2, 3, 4 workers. Serial/parallel numerical agreement checked.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#1F2937] flex items-center justify-between text-xs text-blue-400 font-medium">
              <span>Benchmark CPU</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </div>
          </div>

          {/* Card 4: Hardware Integration */}
          <div 
            onClick={() => setActiveTab('hardware')}
            className="group cursor-pointer bg-[#111827] border border-[#1F2937] rounded-xl p-5 hover:border-blue-500/50 hover:bg-[#131d33] transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                <CircuitBoard className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-white group-hover:text-blue-400 transition">Embedded System Integration</h3>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                Modular workbench for STM32 MCU (3.3V), Artix-7 FPGA (1.8V level-shifted), and JTAG debug probe. Real-time telemetry, timeout injection, and reset recovery.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#1F2937] flex items-center justify-between text-xs text-blue-400 font-medium">
              <span>Manage Hardware</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </div>
          </div>

          {/* Card 5: Neural Network */}
          <div 
            onClick={() => setActiveTab('neural')}
            className="group cursor-pointer bg-[#111827] border border-[#1F2937] rounded-xl p-5 hover:border-blue-500/50 hover:bg-[#131d33] transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center mb-4">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-white group-hover:text-blue-400 transition">Backpropagation & Gradient Verification</h3>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                Exact analytical chain-rule derivation compared with central finite difference (ε=1e-6, error ≤ 1e-5). 100-step training loss curve.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#1F2937] flex items-center justify-between text-xs text-blue-400 font-medium">
              <span>Verify Math</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </div>
          </div>

          {/* Card 6: Reports & Verification */}
          <div 
            onClick={() => setActiveTab('reports')}
            className="group cursor-pointer bg-[#111827] border border-[#1F2937] rounded-xl p-5 hover:border-blue-500/50 hover:bg-[#131d33] transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-white group-hover:text-blue-400 transition">Verification & Reports</h3>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                Comprehensive technical report, verification evidence against the 100-point rubric, downloadable CSV data, and AI assistance disclosure logs.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#1F2937] flex items-center justify-between text-xs text-blue-400 font-medium">
              <span>View Report</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
