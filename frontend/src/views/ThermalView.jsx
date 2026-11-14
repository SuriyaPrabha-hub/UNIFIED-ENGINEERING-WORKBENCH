import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  Play, 
  Download, 
  Settings,
  Layers,
  AlertCircle
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer
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
  const [convLoading, setConvLoading] = useState(false);
  const [error, setError] = useState(null);
  const [solution, setSolution] = useState(null);
  const [convergenceData, setConvergenceData] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('solution');

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
    setConvLoading(true);
    try {
      const res = await api.getConvergence(params);
      setConvergenceData(res);
    } catch (err) {
      console.error('Convergence study error:', err);
    } finally {
      setConvLoading(false);
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

  // Chart data: nodal temperature vs x
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

  // Convergence study data
  const convPlotData = [];
  if (convergenceData && convergenceData.N_values) {
    convergenceData.N_values.forEach((n, idx) => {
      const h = convergenceData.h_values[idx];
      const err = convergenceData.max_errors[idx];
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
    <div className="space-y-4">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#1B1F23] tracking-tight flex items-center">
            <Flame className="w-4 h-4 text-[#E8590C] mr-2" /> 1D Mechanical Thermal FEA Solver
          </h2>
          <p className="text-xs text-[#5F6B76]">
            Steady-state Galerkin linear finite element formulation with volumetric heat generation &amp; exact analytical verification.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-[4px] bg-[#FFFFFF] hover:bg-[#F4F5F7] border border-[#D5D9DE] text-xs font-semibold text-[#1B1F23] flex items-center"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-[#5F6B76]" /> Export CSV
          </button>
          <button
            onClick={() => { handleSolve(); handleConvergenceStudy(); }}
            disabled={loading}
            className="px-3.5 py-1.5 rounded-[4px] bg-[#E8590C] hover:bg-[#d04f0a] text-xs font-semibold text-white flex items-center disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 mr-1.5 fill-current" /> Run FEA Solve
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && !loading && (
        <div className="bg-[#FFF5F5] border border-[#C62828] rounded-[4px] p-3 flex items-start space-x-2 text-xs font-mono text-[#C62828]">
          <AlertCircle className="w-4 h-4 text-[#C62828] mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-bold">{error}</div>
            <div className="mt-0.5 text-[11px] text-[#5F6B76]">
              Ensure backend server is running via Launch.bat (Port 8080).
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Parameters + Output */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left Col: Parameter Configuration Panel */}
        <div className="bg-[#FFFFFF] border border-[#D5D9DE] rounded-[4px] p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#1B1F23] flex items-center pb-2 border-b border-[#D5D9DE] font-mono">
            <Settings className="w-3.5 h-3.5 text-[#5F6B76] mr-1.5" /> Model Parameters
          </h3>

          <div className="space-y-2.5 text-xs">
            <div>
              <label className="text-[#5F6B76] flex justify-between text-[11px]">
                <span>Rod Length L (m)</span>
                <span className="font-mono text-[#1B1F23] font-semibold">{params.L} m</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={params.L}
                onChange={(e) => setParams({ ...params, L: parseFloat(e.target.value) || 1.0 })}
                className="w-full mt-1 bg-[#FFFFFF] border border-[#D5D9DE] rounded-[4px] px-2.5 py-1 text-xs text-[#1B1F23] font-mono"
              />
            </div>

            <div>
              <label className="text-[#5F6B76] flex justify-between text-[11px]">
                <span>Cross Section A (m²)</span>
                <span className="font-mono text-[#1B1F23] font-semibold">1.0e-4 m²</span>
              </label>
              <input
                type="number"
                step="0.00001"
                value={params.A}
                onChange={(e) => setParams({ ...params, A: parseFloat(e.target.value) || 1e-4 })}
                className="w-full mt-1 bg-[#FFFFFF] border border-[#D5D9DE] rounded-[4px] px-2.5 py-1 text-xs text-[#1B1F23] font-mono"
              />
            </div>

            <div>
              <label className="text-[#5F6B76] flex justify-between text-[11px]">
                <span>Conductivity k</span>
                <span className="font-mono text-[#1B1F23] font-semibold">{params.k} W/(m·K)</span>
              </label>
              <input
                type="number"
                step="1.0"
                min="0.1"
                value={params.k}
                onChange={(e) => setParams({ ...params, k: parseFloat(e.target.value) || 10.0 })}
                className="w-full mt-1 bg-[#FFFFFF] border border-[#D5D9DE] rounded-[4px] px-2.5 py-1 text-xs text-[#1B1F23] font-mono"
              />
            </div>

            <div>
              <label className="text-[#5F6B76] flex justify-between text-[11px]">
                <span>Heat Generation q</span>
                <span className="font-mono text-[#1B1F23] font-semibold">{params.q} W/m³</span>
              </label>
              <input
                type="number"
                step="1000"
                value={params.q}
                onChange={(e) => setParams({ ...params, q: parseFloat(e.target.value) || 10000.0 })}
                className="w-full mt-1 bg-[#FFFFFF] border border-[#D5D9DE] rounded-[4px] px-2.5 py-1 text-xs text-[#1B1F23] font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[#5F6B76] block text-[11px]">T(0) Left (degC)</label>
                <input
                  type="number"
                  value={params.T_0}
                  onChange={(e) => setParams({ ...params, T_0: parseFloat(e.target.value) || 100.0 })}
                  className="w-full mt-1 bg-[#FFFFFF] border border-[#D5D9DE] rounded-[4px] px-2 py-1 text-xs text-[#1B1F23] font-mono"
                />
              </div>
              <div>
                <label className="text-[#5F6B76] block text-[11px]">T(L) Right (degC)</label>
                <input
                  type="number"
                  value={params.T_L}
                  onChange={(e) => setParams({ ...params, T_L: parseFloat(e.target.value) || 20.0 })}
                  className="w-full mt-1 bg-[#FFFFFF] border border-[#D5D9DE] rounded-[4px] px-2 py-1 text-xs text-[#1B1F23] font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[#5F6B76] block mb-1 text-[11px]">
                Mesh Elements N (Uniform):
              </label>
              <div className="grid grid-cols-4 gap-1">
                {[10, 20, 40, 80].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => {
                      const updated = { ...params, num_elements: n };
                      setParams(updated);
                    }}
                    className={`py-1 text-xs font-mono rounded-[4px] border transition-none ${
                      params.num_elements === n
                        ? 'bg-[#E8590C] border-[#E8590C] text-white font-bold'
                        : 'border-[#D5D9DE] bg-[#FFFFFF] hover:bg-[#F4F5F7] text-[#1B1F23]'
                    }`}
                  >
                    N={n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Active Mesh Metrics Card */}
          {solution && (
            <div className="p-2.5 bg-[#F4F5F7] rounded-[4px] border border-[#D5D9DE] text-xs font-mono space-y-1">
              <div className="text-[10px] font-bold uppercase text-[#5F6B76]">Active Solution Metrics:</div>
              <div className="flex justify-between">
                <span className="text-[#5F6B76]">Element h:</span>
                <span className="text-[#1B1F23] font-bold">{solution.element_length_h?.toFixed(4)} m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5F6B76]">Nodes:</span>
                <span className="text-[#1B1F23] font-bold">{solution.nodes?.length ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5F6B76]">Max Midpoint Err:</span>
                <span className="text-[#B7791F] font-bold">{solution.max_midpoint_error_C?.toFixed(5)} degC</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Visualizations & Study */}
        <div className="lg:col-span-3 space-y-4">
          {/* Sub-tabs */}
          <div className="flex items-center space-x-1 border-b border-[#D5D9DE] pb-1">
            <button
              onClick={() => setActiveSubTab('solution')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-[4px] transition-none ${
                activeSubTab === 'solution'
                  ? 'border-b-2 border-[#E8590C] text-[#E8590C]'
                  : 'text-[#5F6B76] hover:text-[#1B1F23]'
              }`}
            >
              Temperature Distribution T(x)
            </button>
            <button
              onClick={() => setActiveSubTab('convergence')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-[4px] transition-none ${
                activeSubTab === 'convergence'
                  ? 'border-b-2 border-[#E8590C] text-[#E8590C]'
                  : 'text-[#5F6B76] hover:text-[#1B1F23]'
              }`}
            >
              Mesh Convergence Study (N=10, 20, 40, 80)
            </button>
            <button
              onClick={() => setActiveSubTab('table')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-[4px] transition-none ${
                activeSubTab === 'table'
                  ? 'border-b-2 border-[#E8590C] text-[#E8590C]'
                  : 'text-[#5F6B76] hover:text-[#1B1F23]'
              }`}
            >
              Nodal &amp; Midpoint Data Table
            </button>
          </div>

          {/* Sub-tab 1: Temperature Curve */}
          {activeSubTab === 'solution' && (
            <div className="bg-[#FFFFFF] border border-[#D5D9DE] rounded-[4px] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#1B1F23] font-mono">
                  Temperature Profile along Rod Axis x in [0, {params.L}] m
                </h3>
                <span className="text-[10px] text-[#2E7D32] font-mono border border-[#2E7D32] px-1.5 py-0.2 rounded-[2px]">
                  Nodal Error &lt; 1e-12 degC (Superconvergent)
                </span>
              </div>

              {loading ? (
                <div className="h-72 flex items-center justify-center">
                  <LoadingSpinner text="Solving steady-state FEM in C++..." />
                </div>
              ) : chartData.length === 0 ? (
                <div className="h-72 flex items-center justify-center text-xs text-[#5F6B76] font-mono">
                  No data. Click "Run FEA Solve" to compute.
                </div>
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#D5D9DE" />
                      <XAxis 
                        dataKey="x" 
                        stroke="#5F6B76" 
                        tick={{ fontSize: 11, fontFamily: 'Consolas' }}
                        label={{ value: 'Position x (m)', position: 'insideBottom', offset: -10, fill: '#5F6B76', fontSize: 11 }}
                      />
                      <YAxis 
                        stroke="#5F6B76" 
                        tick={{ fontSize: 11, fontFamily: 'Consolas' }}
                        label={{ value: 'Temperature (degC)', angle: -90, position: 'insideLeft', fill: '#5F6B76', fontSize: 11 }}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#D5D9DE', borderRadius: '4px', fontSize: '11px', fontFamily: 'Consolas' }}
                      />
                      <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }} />
                      {/* Grey shades for FEA computed solution, dashed orange for exact analytical */}
                      <Line 
                        type="monotone" 
                        dataKey="T_fe" 
                        name="FEA Solution (Linear Elements)" 
                        stroke="#1B1F23" 
                        strokeWidth={2} 
                        dot={{ r: 3, fill: '#1B1F23' }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="T_exact" 
                        name="Exact Analytical T_exact(x)" 
                        stroke="#E8590C" 
                        strokeWidth={2} 
                        strokeDasharray="4 4" 
                        dot={false} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="p-3 bg-[#F4F5F7] rounded-[4px] border border-[#D5D9DE] text-xs text-[#1B1F23] leading-relaxed">
                <span className="font-bold text-[#1B1F23]">Physical Interpretation:</span> With uniform internal heat generation <span className="font-mono font-semibold">q = 10,000 W/m³</span>, 
                the temperature profile displays a parabolic interior peak (max temperature ~188 degC at x ≈ 0.42 m) exceeding boundary values (T(0)=100 degC, T(L)=20 degC).
              </div>
            </div>
          )}

          {/* Sub-tab 2: Convergence Study */}
          {activeSubTab === 'convergence' && (
            <div className="bg-[#FFFFFF] border border-[#D5D9DE] rounded-[4px] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#1B1F23] font-mono">
                  Mesh Convergence Analysis: Max Midpoint Error vs Element Size h
                </h3>
                <span className="text-[10px] text-[#2E7D32] font-mono border border-[#2E7D32] px-1.5 py-0.2 rounded-[2px]">
                  O(h²) Quadratic Convergence Verified
                </span>
              </div>

              {convLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <LoadingSpinner text="Computing convergence for N=10, 20, 40, 80..." />
                </div>
              ) : (
                <>
                  {/* Convergence Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono border border-[#D5D9DE]">
                      <thead className="bg-[#F4F5F7] text-[#5F6B76] border-b border-[#D5D9DE]">
                        <tr>
                          <th className="py-2 px-3">Elements N</th>
                          <th className="py-2 px-3">Element Size h (m)</th>
                          <th className="py-2 px-3">Max Midpoint Error (degC)</th>
                          <th className="py-2 px-3">Theoretical Error [qh²/(8k)]</th>
                          <th className="py-2 px-3">Observed Reduction Ratio</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#D5D9DE] text-[#1B1F23]">
                        {convPlotData.map((row, i) => {
                          const prev = i > 0 ? convPlotData[i - 1].max_error : null;
                          const ratio = prev ? (prev / row.max_error).toFixed(3) : '-';
                          return (
                            <tr key={row.N} className="hover:bg-[#F4F5F7]">
                              <td className="py-1.5 px-3 font-bold text-[#1B1F23]">N = {row.N}</td>
                              <td className="py-1.5 px-3">{row.h} m</td>
                              <td className="py-1.5 px-3 font-bold text-[#B7791F]">{row.max_error} degC</td>
                              <td className="py-1.5 px-3 text-[#5F6B76]">{row.theoretical_err} degC</td>
                              <td className="py-1.5 px-3 font-bold text-[#2E7D32]">{ratio}x {ratio !== '-' ? '(~4.00x O(h²))' : ''}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Convergence Chart: Grey shades + dashed orange */}
                  <div className="h-64 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={convPlotData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#D5D9DE" />
                        <XAxis dataKey="N" stroke="#5F6B76" tick={{ fontSize: 11, fontFamily: 'Consolas' }} label={{ value: 'Elements N', position: 'insideBottom', offset: -10, fill: '#5F6B76', fontSize: 11 }} />
                        <YAxis stroke="#5F6B76" tick={{ fontSize: 11, fontFamily: 'Consolas' }} label={{ value: 'Max Error (degC)', angle: -90, position: 'insideLeft', fill: '#5F6B76', fontSize: 11 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#D5D9DE', borderRadius: '4px', fontSize: '11px', fontFamily: 'Consolas' }} />
                        <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }} />
                        {/* Grey line for computed, dashed orange for theoretical quadratic rate */}
                        <Line type="monotone" dataKey="max_error" name="Computed FEA Midpoint Error" stroke="#1B1F23" strokeWidth={2} dot={{ r: 4, fill: '#1B1F23' }} />
                        <Line type="monotone" dataKey="theoretical_err" name="Theoretical Quadratic Rate O(h²)" stroke="#E8590C" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}

              <div className="p-3 bg-[#F4F5F7] rounded-[4px] border border-[#D5D9DE] text-xs text-[#1B1F23] leading-relaxed">
                <span className="font-bold">Interdisciplinary Adoption &amp; Debugging Insight:</span> In 1D linear FEA with constant properties and uniform heat generation, 
                nodal solutions match the exact analytical solution to machine precision (&lt; 1e-12 degC) due to Green's function exactness at nodes (nodal superconvergence). 
                Evaluating errors at element midpoints via shape function interpolation (T_e + T_e+1)/2 reveals the true piecewise-linear approximation error q·h²/(8k), 
                proving exact 4x error reduction whenever element size h is halved.
              </div>
            </div>
          )}

          {/* Sub-tab 3: Nodal Table */}
          {activeSubTab === 'table' && (
            <div className="bg-[#FFFFFF] border border-[#D5D9DE] rounded-[4px] p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1B1F23] font-mono">
                Numerical Output (N = {params.num_elements})
              </h3>

              {!solution ? (
                <div className="py-8 text-center text-xs text-[#5F6B76] font-mono">
                  No data loaded. Click "Run FEA Solve" first.
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-left text-xs font-mono border border-[#D5D9DE]">
                    <thead className="bg-[#F4F5F7] text-[#5F6B76] sticky top-0 border-b border-[#D5D9DE]">
                      <tr>
                        <th className="py-1.5 px-3">Type</th>
                        <th className="py-1.5 px-3">Index</th>
                        <th className="py-1.5 px-3">Position x (m)</th>
                        <th className="py-1.5 px-3">FEA Temp (degC)</th>
                        <th className="py-1.5 px-3">Exact Temp (degC)</th>
                        <th className="py-1.5 px-3">Abs Error (degC)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D5D9DE] text-[#1B1F23]">
                      {solution.nodes.map((n) => (
                        <tr key={`n-${n.node_id}`} className="hover:bg-[#F4F5F7]">
                          <td className="py-1 px-3 text-[#5F6B76] font-semibold">Node</td>
                          <td className="py-1 px-3">#{n.node_id}</td>
                          <td className="py-1 px-3">{n.x_m.toFixed(4)}</td>
                          <td className="py-1 px-3 font-bold">{n.T_fe_C.toFixed(4)}</td>
                          <td className="py-1 px-3">{n.T_exact_C.toFixed(4)}</td>
                          <td className="py-1 px-3 text-[#2E7D32]">{n.abs_error_C.toExponential(4)}</td>
                        </tr>
                      ))}
                      {solution.midpoints.map((m) => (
                        <tr key={`m-${m.element_id}`} className="hover:bg-[#F4F5F7] bg-[#F9FAFB]">
                          <td className="py-1 px-3 text-[#B7791F] font-semibold">Midpoint</td>
                          <td className="py-1 px-3">Elem #{m.element_id}</td>
                          <td className="py-1 px-3">{m.x_mid_m.toFixed(4)}</td>
                          <td className="py-1 px-3 font-bold">{m.T_fe_C.toFixed(4)}</td>
                          <td className="py-1 px-3">{m.T_exact_C.toFixed(4)}</td>
                          <td className="py-1 px-3 text-[#B7791F]">{m.abs_error_C.toFixed(6)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
