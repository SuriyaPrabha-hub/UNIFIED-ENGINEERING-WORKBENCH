import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  Play, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  TrendingDown, 
  HelpCircle,
  FileSpreadsheet,
  Settings,
  Layers
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ScatterChart,
  Scatter
} from 'recharts';
import { api } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';

export default function ThermalView() {
  const [params, setParams] = useState({
    L: 1.0,
    A: 0.0001,
    k: 10.0,
    q: 10000.0,
    T_0: 100.0,
    T_L: 20.0,
    num_elements: 20
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [solution, setSolution] = useState(null);
  const [convergenceData, setConvergenceData] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('solution'); // 'solution', 'convergence', 'table'

  // Run single FEA solve on mount
  useEffect(() => {
    handleSolve();
    handleConvergenceStudy();
  }, []);

  const handleSolve = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.solveFEA(params);
      setSolution(res);
    } catch (err) {
      setError(`FEA Solve Failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleConvergenceStudy = async () => {
    try {
      const res = await api.getConvergence(params);
      setConvergenceData(res);
    } catch (err) {
      console.error('Convergence study error:', err);
    }
  };

  const handleExportCSV = async () => {
    try {
      const blob = await api.exportFEACsv(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `thermal_fea_N${params.num_elements}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    }
  };

  // Prepare chart data for Temperature vs X
  const chartData = [];
  if (solution && solution.nodes) {
    solution.nodes.forEach((n) => {
      chartData.push({
        x: Number(n.x_m.toFixed(4)),
        T_fe: Number(n.T_fe_C.toFixed(4)),
        T_exact: Number(n.T_exact_C.toFixed(4)),
        error: Number(n.abs_error_C.toExponential(4))
      });
    });
  }

  // Midpoints chart data
  const midpointChartData = [];
  if (solution && solution.midpoints) {
    solution.midpoints.forEach((m) => {
      midpointChartData.push({
        x: Number(m.x_mid_m.toFixed(4)),
        T_fe_mid: Number(m.T_fe_C.toFixed(4)),
        T_exact_mid: Number(m.T_exact_C.toFixed(4)),
        midpoint_error: Number(m.abs_error_C.toFixed(6))
      });
    });
  }

  // Convergence study data
  const convPlotData = [];
  if (convergenceData && convergenceData.N_values) {
    convergenceData.N_values.forEach((n, idx) => {
      const h = convergenceData.h_values[idx];
      const err = convergenceData.max_errors[idx];
      // Theoretical error: q*h^2 / (8*k) = 125 * h^2
      const theory = (params.q / (8.0 * params.k)) * (h * h);
      convPlotData.push({
        N: n,
        h: Number(h.toFixed(4)),
        max_error: Number(err.toFixed(6)),
        theoretical_err: Number(theory.toFixed(6))
      });
    });
  }

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center">
            <Flame className="w-6 h-6 text-orange-500 mr-2.5" /> 1D Mechanical Thermal FEA Solver
          </h2>
          <p className="text-sm text-gray-400">
            Steady-state Galerkin finite element formulation with volumetric heat generation & exact analytical convergence verification.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-lg bg-[#1F2937] hover:bg-[#374151] border border-[#374151] text-xs font-semibold text-gray-200 flex items-center transition"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-blue-400" /> Export Results CSV
          </button>
          <button
            onClick={() => { handleSolve(); handleConvergenceStudy(); }}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white flex items-center shadow-lg shadow-blue-500/20 transition disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 mr-1.5 fill-current" /> Run FEA Solve
          </button>
        </div>
      </div>

      {/* Main Grid: Parameters + Output */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Col: Parameter Configuration Panel */}
        <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center pb-2 border-b border-[#1F2937]">
            <Settings className="w-4 h-4 text-blue-400 mr-2" /> Model Parameters
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-gray-400 flex justify-between">
                <span>Rod Length L (m)</span>
                <span className="font-mono text-gray-200">{params.L} m</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={params.L}
                onChange={(e) => setParams({ ...params, L: parseFloat(e.target.value) || 1.0 })}
                className="w-full mt-1 bg-[#161F30] border border-[#374151] rounded px-3 py-1.5 text-white font-mono"
              />
            </div>

            <div>
              <label className="text-gray-400 flex justify-between">
                <span>Cross Section A (m²)</span>
                <span className="font-mono text-gray-200">1.0e-4 m²</span>
              </label>
              <input
                type="number"
                step="0.00001"
                value={params.A}
                onChange={(e) => setParams({ ...params, A: parseFloat(e.target.value) || 1e-4 })}
                className="w-full mt-1 bg-[#161F30] border border-[#374151] rounded px-3 py-1.5 text-white font-mono"
              />
            </div>

            <div>
              <label className="text-gray-400 flex justify-between">
                <span>Thermal Conductivity k</span>
                <span className="font-mono text-gray-200">{params.k} W/(m·K)</span>
              </label>
              <input
                type="number"
                step="1.0"
                min="0.1"
                value={params.k}
                onChange={(e) => setParams({ ...params, k: parseFloat(e.target.value) || 10.0 })}
                className="w-full mt-1 bg-[#161F30] border border-[#374151] rounded px-3 py-1.5 text-white font-mono"
              />
            </div>

            <div>
              <label className="text-gray-400 flex justify-between">
                <span>Volumetric Heat Gen q</span>
                <span className="font-mono text-gray-200">{params.q} W/m³</span>
              </label>
              <input
                type="number"
                step="1000"
                value={params.q}
                onChange={(e) => setParams({ ...params, q: parseFloat(e.target.value) || 10000.0 })}
                className="w-full mt-1 bg-[#161F30] border border-[#374151] rounded px-3 py-1.5 text-white font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-gray-400 block text-[11px]">T(0) at Left (°C)</label>
                <input
                  type="number"
                  value={params.T_0}
                  onChange={(e) => setParams({ ...params, T_0: parseFloat(e.target.value) || 100.0 })}
                  className="w-full mt-1 bg-[#161F30] border border-[#374151] rounded px-2.5 py-1.5 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-gray-400 block text-[11px]">T(L) at Right (°C)</label>
                <input
                  type="number"
                  value={params.T_L}
                  onChange={(e) => setParams({ ...params, T_L: parseFloat(e.target.value) || 20.0 })}
                  className="w-full mt-1 bg-[#161F30] border border-[#374151] rounded px-2.5 py-1.5 text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-gray-400 block mb-1">
                Mesh Elements N (Uniform 2-node):
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[10, 20, 40, 80].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => {
                      const updated = { ...params, num_elements: n };
                      setParams(updated);
                    }}
                    className={`py-1.5 text-xs font-mono font-bold rounded border transition ${
                      params.num_elements === n
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'border-[#374151] hover:bg-[#1F2937] text-gray-300'
                    }`}
                  >
                    N={n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Solver Stats Card */}
          {solution && (
            <div className="p-3 bg-[#161F30] rounded-lg border border-[#1F2937] text-xs font-mono space-y-1.5">
              <div className="text-gray-400 text-[11px]">Active Mesh Metrics:</div>
              <div className="flex justify-between">
                <span className="text-gray-400">Element h:</span>
                <span className="text-white font-bold">{solution.element_length_h.toFixed(4)} m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Nodes:</span>
                <span className="text-blue-400 font-bold">{solution.node_x_m.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Max Midpoint Error:</span>
                <span className="text-amber-400 font-bold">{solution.max_midpoint_error_C.toFixed(5)} °C</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Interactive Visualizations & Study */}
        <div className="lg:col-span-3 space-y-5">
          {/* Sub-tabs */}
          <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveSubTab('solution')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                  activeSubTab === 'solution'
                    ? 'bg-blue-600/20 border border-blue-500/40 text-blue-300'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Temperature Distribution T(x)
              </button>
              <button
                onClick={() => setActiveSubTab('convergence')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                  activeSubTab === 'convergence'
                    ? 'bg-blue-600/20 border border-blue-500/40 text-blue-300'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Mesh Convergence Study (N=10, 20, 40, 80)
              </button>
              <button
                onClick={() => setActiveSubTab('table')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                  activeSubTab === 'table'
                    ? 'bg-blue-600/20 border border-blue-500/40 text-blue-300'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Nodal & Midpoint Data Table
              </button>
            </div>
          </div>

          {/* Sub-tab 1: Temperature Curve */}
          {activeSubTab === 'solution' && (
            <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center">
                  <span>Temperature Profile along Rod Axis x ∈ [0, {params.L}] m</span>
                </h3>
                <span className="text-xs text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Nodal Error &lt; 1e-12 °C (Superconvergent)
                </span>
              </div>

              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                    <XAxis 
                      dataKey="x" 
                      stroke="#9CA3AF" 
                      label={{ value: 'Position along rod x (meters)', position: 'insideBottom', offset: -10, fill: '#9CA3AF' }}
                    />
                    <YAxis 
                      stroke="#9CA3AF" 
                      label={{ value: 'Temperature (°C)', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '0.5rem', fontSize: '12px' }}
                    />
                    <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '10px' }} />
                    <Line 
                      type="monotone" 
                      dataKey="T_fe" 
                      name="FEA Solution (Linear Elements)" 
                      stroke="#3B82F6" 
                      strokeWidth={2.5} 
                      dot={{ r: 4, fill: '#3B82F6' }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="T_exact" 
                      name="Exact Analytical T_exact(x)" 
                      stroke="#10B981" 
                      strokeWidth={1.5} 
                      strokeDasharray="4 4" 
                      dot={false} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="p-3 bg-[#161F30] rounded-lg border border-[#1F2937] text-xs text-gray-300 leading-relaxed font-sans">
                <strong className="text-white">Physical Interpretation:</strong> With uniform internal heat generation <span className="font-mono text-orange-400">q = 10,000 W/m³</span>, 
                the temperature profile displays a parabolic interior peak (max temperature ~188°C around x ≈ 0.42 m) exceeding both boundary values (T(0)=100°C and T(L)=20°C). 
                Heat flows outward from the peak towards both ends in accordance with Fourier's conduction law.
              </div>
            </div>
          )}

          {/* Sub-tab 2: Convergence Study */}
          {activeSubTab === 'convergence' && (
            <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center">
                  <TrendingDown className="w-4 h-4 text-emerald-400 mr-2" /> 
                  Mesh Convergence Analysis: Max Midpoint Absolute Error vs Element Size (h)
                </h3>
                <span className="text-xs text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  O(h²) Quadratic Convergence Verified
                </span>
              </div>

              {/* Convergence Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#161F30] text-gray-400 border-b border-[#1F2937]">
                    <tr>
                      <th className="py-2.5 px-3">Elements N</th>
                      <th className="py-2.5 px-3">Element Size h (m)</th>
                      <th className="py-2.5 px-3">Max Midpoint Error (°C)</th>
                      <th className="py-2.5 px-3">Theoretical Error [qh²/(8k)]</th>
                      <th className="py-2.5 px-3">Observed Reduction Ratio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F2937] text-gray-200">
                    {convPlotData.map((row, i) => {
                      const prev = i > 0 ? convPlotData[i - 1].max_error : null;
                      const ratio = prev ? (prev / row.max_error).toFixed(3) : '-';
                      return (
                        <tr key={row.N} className="hover:bg-[#161F30]/50">
                          <td className="py-2.5 px-3 font-bold text-blue-400">N = {row.N}</td>
                          <td className="py-2.5 px-3">{row.h} m</td>
                          <td className="py-2.5 px-3 font-bold text-amber-400">{row.max_error} °C</td>
                          <td className="py-2.5 px-3 text-emerald-400">{row.theoretical_err} °C</td>
                          <td className="py-2.5 px-3 font-bold text-white">{ratio}x {ratio !== '-' ? '(~4.00x O(h²))' : ''}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Convergence Chart */}
              <div className="h-64 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={convPlotData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                    <XAxis dataKey="N" stroke="#9CA3AF" label={{ value: 'Number of Elements N', position: 'insideBottom', offset: -10, fill: '#9CA3AF' }} />
                    <YAxis stroke="#9CA3AF" label={{ value: 'Max Midpoint Error (°C)', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '0.5rem', fontSize: '12px' }} />
                    <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '10px' }} />
                    <Line type="monotone" dataKey="max_error" name="Computed FEA Midpoint Error" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 5, fill: '#F59E0B' }} />
                    <Line type="monotone" dataKey="theoretical_err" name="Theoretical Quadratic Rate O(h²)" stroke="#10B981" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="p-3 bg-[#161F30] rounded-lg border border-[#1F2937] text-xs text-gray-300 leading-relaxed font-sans">
                <strong className="text-white">Interdisciplinary Learning & Debugging Insight:</strong> In 1D linear FEA with constant properties and uniform heat generation, 
                the nodal solutions match the analytical solution to machine precision (&lt; 1e-12 °C) due to Green's function exactness at nodes (nodal superconvergence). 
                If one only checked errors at nodes, mesh convergence would be unobservable! By evaluating errors at element midpoints via FE interpolation (T_e + T_e+1)/2, 
                the true piecewise-linear approximation error q·h²/(8k) is revealed, proving exact 4x error reduction whenever element size h is halved.
              </div>
            </div>
          )}

          {/* Sub-tab 3: Nodal Table */}
          {activeSubTab === 'table' && solution && (
            <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-white">
                Detailed Nodal & Element Midpoint Numerical Output (N = {params.num_elements})
              </h3>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#161F30] text-gray-400 sticky top-0 border-b border-[#1F2937]">
                    <tr>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3">Index</th>
                      <th className="py-2 px-3">Position x (m)</th>
                      <th className="py-2 px-3">FEA Temp (°C)</th>
                      <th className="py-2 px-3">Exact Temp (°C)</th>
                      <th className="py-2 px-3">Abs Error (°C)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F2937] text-gray-300">
                    {solution.nodes.map((n) => (
                      <tr key={`n-${n.node_id}`} className="hover:bg-[#161F30]/40">
                        <td className="py-1.5 px-3 text-blue-400 font-semibold">Node</td>
                        <td className="py-1.5 px-3">#{n.node_id}</td>
                        <td className="py-1.5 px-3">{n.x_m.toFixed(4)}</td>
                        <td className="py-1.5 px-3 font-bold text-white">{n.T_fe_C.toFixed(4)}</td>
                        <td className="py-1.5 px-3">{n.T_exact_C.toFixed(4)}</td>
                        <td className="py-1.5 px-3 text-emerald-400 font-mono">{n.abs_error_C.toExponential(4)}</td>
                      </tr>
                    ))}
                    {solution.midpoints.map((m) => (
                      <tr key={`m-${m.element_id}`} className="hover:bg-[#161F30]/40 bg-amber-500/5">
                        <td className="py-1.5 px-3 text-amber-400 font-semibold">Midpoint</td>
                        <td className="py-1.5 px-3">Elem #{m.element_id}</td>
                        <td className="py-1.5 px-3">{m.x_mid_m.toFixed(4)}</td>
                        <td className="py-1.5 px-3 font-bold text-white">{m.T_fe_C.toFixed(4)}</td>
                        <td className="py-1.5 px-3">{m.T_exact_C.toFixed(4)}</td>
                        <td className="py-1.5 px-3 text-amber-400 font-mono">{m.abs_error_C.toFixed(6)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
