import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import {
  Box,
  Upload,
  Maximize2,
  Layers,
  Info,
  AlertTriangle,
  Thermometer,
  FileText,
  Cpu,
  Activity,
  ChevronRight,
  Zap,
  Eye,
  BarChart3,
  X
} from 'lucide-react';
import { api } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';

// ─── Drag-and-drop zone component ────────────────────────────────────────────
function DropZone({ accept, label, sublabel, icon: Icon, onFile, dragActive, setDragActive }) {
  const inputRef = useRef(null);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, [setDragActive]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  }, [setDragActive, onFile]);

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    e.target.value = '';
  };

  return (
    <div
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className="flex flex-col items-center justify-center border-2 border-dashed rounded-[6px] p-4 cursor-pointer select-none"
      style={{
        borderColor: dragActive ? 'var(--accent)' : 'var(--border)',
        backgroundColor: dragActive ? 'rgba(232,89,12,0.07)' : 'var(--bg)',
        transition: 'border-color 0.15s, background-color 0.15s'
      }}
    >
      <Icon className="w-6 h-6 mb-2" style={{ color: dragActive ? 'var(--accent)' : 'var(--muted)' }} />
      <span className="text-xs font-semibold text-center" style={{ color: dragActive ? 'var(--accent)' : 'var(--text)' }}>
        {label}
      </span>
      <span className="text-[10px] font-mono mt-1 text-center" style={{ color: 'var(--muted)' }}>
        {sublabel}
      </span>
      <input ref={inputRef} type="file" accept={accept} onChange={handleChange} className="hidden" />
    </div>
  );
}

// ─── Preset Button (Formula-E / Rod) ──────────────────────────────────────────
function PresetButton({ active, onClick, icon: Icon, title, subtitle, badge, badgeColor }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center w-full px-3 py-2.5 rounded-[6px] border text-left"
      style={{
        backgroundColor: active ? 'var(--sidebar)' : 'var(--card)',
        borderColor: active ? 'var(--accent)' : 'var(--border)',
        borderLeftWidth: active ? '3px' : '1px',
        color: active ? '#FFFFFF' : 'var(--text)',
        transition: 'none'
      }}
    >
      <Icon
        className="w-5 h-5 mr-2.5 flex-shrink-0"
        style={{ color: active ? 'var(--accent)' : 'var(--muted)' }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold truncate">{title}</div>
        <div className="text-[10px] font-mono truncate mt-0.5" style={{ color: active ? '#C9CED4' : 'var(--muted)' }}>
          {subtitle}
        </div>
      </div>
      {badge && (
        <span
          className="ml-2 text-[9px] font-mono font-bold border px-1.5 py-0.5 rounded-[3px] flex-shrink-0"
          style={{ borderColor: badgeColor, color: badgeColor }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GeometryView() {
  const [activePreset, setActivePreset] = useState('powerunit');  // 'powerunit' | 'rod' | 'custom'
  const [activeMode, setActiveMode] = useState('stl');            // 'stl' | 'ansys'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [stlData, setStlData] = useState(null);
  const [ansysData, setAnsysData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [wireframe, setWireframe] = useState(false);

  // Drag-active state per zone
  const [stlDragActive, setStlDragActive] = useState(false);
  const [csvDragActive, setCsvDragActive] = useState(false);

  // Three.js refs
  const mountRef       = useRef(null);
  const sceneRef       = useRef(null);
  const cameraRef      = useRef(null);
  const rendererRef    = useRef(null);
  const modelGroupRef  = useRef(null);
  const isDraggingRef         = useRef(false);
  const isRightDraggingRef    = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });

  // ── Three.js Init ────────────────────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width  = mount.clientWidth  || 800;
    const height = mount.clientHeight || 500;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1A1E23);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.001, 1000);
    camera.position.set(0.6, 0.5, 1.0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;
    mount.appendChild(renderer.domElement);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.95));
    const dl1 = new THREE.DirectionalLight(0xffffff, 1.0);
    dl1.position.set(5, 10, 7);
    scene.add(dl1);
    const dl2 = new THREE.DirectionalLight(0xd5d9de, 0.5);
    dl2.position.set(-5, -5, -5);
    scene.add(dl2);

    // Grid
    const grid = new THREE.GridHelper(2.5, 25, 0x3A444C, 0x252D35);
    grid.position.y = -0.06;
    scene.add(grid);

    // Model group
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);
    modelGroupRef.current = modelGroup;

    // Render loop
    let raf;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Interaction
    const dom = renderer.domElement;

    const onMouseDown = (e) => {
      if (e.button === 0) isDraggingRef.current = true;
      if (e.button === 2) isRightDraggingRef.current = true;
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseMove = (e) => {
      if (!isDraggingRef.current && !isRightDraggingRef.current) return;
      const dx = e.clientX - previousMousePositionRef.current.x;
      const dy = e.clientY - previousMousePositionRef.current.y;
      if (isDraggingRef.current) {
        modelGroupRef.current.rotation.y += dx * 0.01;
        modelGroupRef.current.rotation.x += dy * 0.01;
      } else {
        cameraRef.current.position.x -= dx * 0.002;
        cameraRef.current.position.y += dy * 0.002;
      }
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseUp = () => {
      isDraggingRef.current = false;
      isRightDraggingRef.current = false;
    };
    const onWheel = (e) => {
      e.preventDefault();
      const f = e.deltaY > 0 ? 1.1 : 0.9;
      cameraRef.current.position.multiplyScalar(f);
    };

    dom.addEventListener('mousedown', onMouseDown);
    dom.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    const onResize = () => {
      if (!mount || !rendererRef.current || !cameraRef.current) return;
      const w = mount.clientWidth, h = mount.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // Load initial model after scene is ready
    setTimeout(() => loadPowerUnitSTLDirect(), 100);

    return () => {
      cancelAnimationFrame(raf);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
      if (mount && renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []); // eslint-disable-line

  // ── Camera Fit ───────────────────────────────────────────────────────────
  const fitCameraToModel = () => {
    if (!cameraRef.current || !modelGroupRef.current) return;
    const box = new THREE.Box3().setFromObject(modelGroupRef.current);
    if (box.isEmpty()) return;
    const center = box.getCenter(new THREE.Vector3());
    const size   = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov    = cameraRef.current.fov * (Math.PI / 180);
    const dist   = Math.max(Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.8, 0.4);
    cameraRef.current.position.set(center.x + dist * 0.6, center.y + dist * 0.5, center.z + dist * 0.9);
    cameraRef.current.lookAt(center);
    if (modelGroupRef.current) modelGroupRef.current.rotation.set(0.15, 0.45, 0);
  };

  // ── Clear scene ──────────────────────────────────────────────────────────
  const clearScene = () => {
    if (!modelGroupRef.current) return;
    while (modelGroupRef.current.children.length > 0) {
      const obj = modelGroupRef.current.children[0];
      modelGroupRef.current.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    }
  };

  // ── Render STL ───────────────────────────────────────────────────────────
  const renderSTL = (data) => {
    clearScene();
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(data.positions), 3));
    if (data.normals && data.normals.length > 0) {
      geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(data.normals), 3));
    } else {
      geometry.computeVertexNormals();
    }
    const material = new THREE.MeshStandardMaterial({
      color: 0x8C96A0,
      metalness: 0.15,
      roughness: 0.55,
      wireframe,
      side: THREE.DoubleSide
    });
    modelGroupRef.current.add(new THREE.Mesh(geometry, material));
    fitCameraToModel();
  };

  // ── Render ANSYS ─────────────────────────────────────────────────────────
  const renderANSYS = (data) => {
    clearScene();
    const nodes  = data.nodes || [];
    if (nodes.length === 0) return;

    const positions = new Float32Array(nodes.length * 3);
    const colors    = new Float32Array(nodes.length * 3);
    const minT = data.min_temp_C, rangeT = (data.max_temp_C - minT) || 1;

    nodes.forEach((n, i) => {
      positions[i * 3]     = n.x;
      positions[i * 3 + 1] = n.y;
      positions[i * 3 + 2] = n.z;
      const val = Math.max(0, Math.min(1, (n.temp - minT) / rangeT));
      const c   = new THREE.Color();
      c.setHSL((1 - val) * 0.666, 1.0, 0.5);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
    modelGroupRef.current.add(new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.025, vertexColors: true, sizeAttenuation: true
    })));
    fitCameraToModel();
  };

  // ── Wireframe toggle ─────────────────────────────────────────────────────
  useEffect(() => {
    if (activeMode === 'stl' && modelGroupRef.current) {
      modelGroupRef.current.traverse((child) => {
        if (child.isMesh && child.material) child.material.wireframe = wireframe;
      });
    }
  }, [wireframe, activeMode]);

  // ─────────────────────────────────────────────────────────────────────────
  // Data Loaders
  // ─────────────────────────────────────────────────────────────────────────

  // Direct loader called from useEffect (avoids stale closure on wireframe)
  const loadPowerUnitSTLDirect = async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.getSamplePowerUnitSTL();
      setStlData(res); setActivePreset('powerunit'); setActiveMode('stl');
      // renderSTL inline with wireframe=false (initial state)
      clearScene();
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(res.positions), 3));
      if (res.normals && res.normals.length > 0) {
        geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(res.normals), 3));
      } else {
        geometry.computeVertexNormals();
      }
      modelGroupRef.current.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
        color: 0x8C96A0, metalness: 0.25, roughness: 0.45, wireframe: false, side: THREE.DoubleSide
      })));
      fitCameraToModel();
    } catch (err) { setError(`Failed to load Formula-E Power Unit STL: ${err.message}`); }
    finally { setLoading(false); }
  };

  const loadPowerUnitSTL = async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.getSamplePowerUnitSTL();
      setStlData(res); setActivePreset('powerunit'); setActiveMode('stl');
      renderSTL(res);
    } catch (err) { setError(`Failed to load Formula-E Power Unit STL: ${err.message}`); }
    finally { setLoading(false); }
  };

  const loadPowerUnitANSYS = async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.getSamplePowerUnitAnsysCSV();
      setAnsysData(res); setActivePreset('powerunit'); setActiveMode('ansys');
      renderANSYS(res);
    } catch (err) { setError(`Failed to load Formula-E Inverter/Motor CSV: ${err.message}`); }
    finally { setLoading(false); }
  };

  const loadRodSTL = async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.getSampleSTL();
      setStlData(res); setActivePreset('rod'); setActiveMode('stl');
      renderSTL(res);
    } catch (err) { setError(`Failed to load Benchmark Rod STL: ${err.message}`); }
    finally { setLoading(false); }
  };

  const loadRodANSYS = async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.getSampleAnsysCSV();
      setAnsysData(res); setActivePreset('rod'); setActiveMode('ansys');
      renderANSYS(res);
    } catch (err) { setError(`Failed to load Benchmark ANSYS CSV: ${err.message}`); }
    finally { setLoading(false); }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Upload Handlers (file object directly — from drop or input)
  // ─────────────────────────────────────────────────────────────────────────
  const handleSTLFile = useCallback((file) => {
    setLoading(true); setError(null);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const res = await api.parseSTL(evt.target.result);
        setStlData(res); setActivePreset('custom'); setActiveMode('stl');
        renderSTL(res);
      } catch (err) { setError(`STL Parsing Error: ${err.message}`); }
      finally { setLoading(false); }
    };
    reader.readAsArrayBuffer(file);
  }, []); // eslint-disable-line

  const handleCSVFile = useCallback((file) => {
    setLoading(true); setError(null);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const res = await api.parseAnsysCSV(evt.target.result);
        setAnsysData(res); setActivePreset('custom'); setActiveMode('ansys');
        renderANSYS(res);
      } catch (err) { setError(`ANSYS CSV Parsing Error: ${err.message}`); }
      finally { setLoading(false); }
    };
    reader.readAsText(file);
  }, []); // eslint-disable-line

  // ── Helpers ───────────────────────────────────────────────────────────────
  const presetLabel = activePreset === 'powerunit' ? 'FORMULA-E POWER UNIT' : activePreset === 'rod' ? 'BENCHMARK ROD' : 'CUSTOM UPLOAD';
  const presetColor = activePreset === 'custom' ? 'var(--ok)' : activePreset === 'powerunit' ? 'var(--accent)' : 'var(--warn)';

  // ─────────────────────────────────────────────────────────────────────────
  // JSX
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
        <div>
          <h2
            className="text-base font-bold tracking-tight flex items-center"
            style={{ color: 'var(--text)' }}
          >
            <Box className="w-4 h-4 mr-2" style={{ color: 'var(--muted)' }} />
            3D CAD &amp; ANSYS Data Visualization
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            Universal C++ streaming parser · Binary &amp; ASCII STL · Any ANSYS CSV layout · High-poly Stanford Dragon support
          </p>
        </div>

        {/* STL ↔ ANSYS mode toggler */}
        <div
          className="flex items-center space-x-1 p-1 rounded-[4px] border self-start"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
        >
          {[
            { mode: 'stl',   label: 'CAD STL Mesh',         icon: Box },
            { mode: 'ansys', label: 'ANSYS Nodal Cloud',     icon: Thermometer },
          ].map(({ mode, label, icon: Icon }) => (
            <button
              key={mode}
              onClick={() => {
                setActiveMode(mode);
                if (mode === 'stl') {
                  if (activePreset === 'powerunit' && !stlData) loadPowerUnitSTL();
                  else if (activePreset === 'rod'  && !stlData) loadRodSTL();
                  else if (stlData) renderSTL(stlData);
                } else {
                  if (activePreset === 'powerunit' && !ansysData) loadPowerUnitANSYS();
                  else if (activePreset === 'rod'  && !ansysData) loadRodANSYS();
                  else if (ansysData) renderANSYS(ansysData);
                }
              }}
              className="px-3 py-1 rounded-[4px] text-xs font-semibold flex items-center space-x-1.5"
              style={{
                backgroundColor: activeMode === mode ? 'var(--accent)' : 'transparent',
                color: activeMode === mode ? '#FFFFFF' : 'var(--muted)'
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Status bar ── */}
      <div
        className="rounded-[4px] border px-3 py-2 flex items-center justify-between text-xs font-mono"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center space-x-3">
          <span className="uppercase tracking-wider text-[10px] font-bold" style={{ color: 'var(--muted)' }}>
            Active Dataset:
          </span>
          <span
            className="border px-2 py-0.5 rounded-[3px] font-bold text-[10px]"
            style={{ borderColor: presetColor, color: presetColor }}
          >
            {presetLabel}
          </span>
          <span style={{ color: 'var(--border)' }}>·</span>
          <span style={{ color: 'var(--muted)' }}>
            {activeMode === 'stl' ? 'CAD STL Mesh' : 'ANSYS Nodal Heat Cloud (CSV)'}
          </span>
        </div>
        <div className="flex items-center space-x-2 text-[10px]" style={{ color: 'var(--muted)' }}>
          <span>Rotate: LMB</span>
          <span style={{ color: 'var(--border)' }}>·</span>
          <span>Pan: RMB</span>
          <span style={{ color: 'var(--border)' }}>·</span>
          <span>Zoom: Scroll</span>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div
          className="rounded-[4px] border p-3 flex items-start space-x-2 text-xs font-mono"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--err)', color: 'var(--err)' }}
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold">Validation Error</div>
            <div className="mt-0.5">{error}</div>
          </div>
          <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* ── Warning ── */}
      {((activeMode === 'stl' && stlData?.warnings) || (activeMode === 'ansys' && ansysData?.warnings)) && (
        <div
          className="rounded-[4px] border p-2.5 flex items-center space-x-2 text-xs font-mono"
          style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--warn)', color: 'var(--warn)' }}
        >
          <Info className="w-4 h-4 flex-shrink-0" />
          <div>{activeMode === 'stl' ? stlData?.warnings : ansysData?.warnings}</div>
        </div>
      )}

      {/* ── Main 3-col grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* LEFT panel: Presets + Upload */}
        <div className="lg:col-span-3 space-y-3">

          {/* ── Formula-E Power Unit card ── */}
          <div
            className="rounded-[6px] border p-3 space-y-2"
            style={{ backgroundColor: 'var(--card)', borderColor: activePreset === 'powerunit' ? 'var(--accent)' : 'var(--border)' }}
          >
            <div className="flex items-center space-x-2 mb-1">
              <Zap className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <span className="text-xs font-bold tracking-wide" style={{ color: 'var(--text)' }}>Formula-E Power Unit</span>
              <span className="text-[9px] border font-mono font-bold px-1.5 py-0.5 rounded-[3px] ml-auto" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
                EV HYPERCAR
              </span>
            </div>
            <p className="text-[10px] font-mono leading-relaxed" style={{ color: 'var(--muted)' }}>
              SiC Inverter + Axial-Flux Motor · 432 tri · 522 FEA nodes · 250 kW launch thermal FEA
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={loadPowerUnitSTL}
                className="flex items-center justify-center px-2 py-2 rounded-[5px] border text-xs font-semibold"
                style={{
                  backgroundColor: activePreset === 'powerunit' && activeMode === 'stl' ? 'var(--accent)' : 'var(--bg)',
                  borderColor:     activePreset === 'powerunit' && activeMode === 'stl' ? 'var(--accent)' : 'var(--border)',
                  color:           activePreset === 'powerunit' && activeMode === 'stl' ? '#FFF' : 'var(--text)'
                }}
              >
                <Box className="w-3.5 h-3.5 mr-1.5" />
                3D CAD Model
              </button>
              <button
                onClick={loadPowerUnitANSYS}
                className="flex items-center justify-center px-2 py-2 rounded-[5px] border text-xs font-semibold"
                style={{
                  backgroundColor: activePreset === 'powerunit' && activeMode === 'ansys' ? 'var(--accent)' : 'var(--bg)',
                  borderColor:     activePreset === 'powerunit' && activeMode === 'ansys' ? 'var(--accent)' : 'var(--border)',
                  color:           activePreset === 'powerunit' && activeMode === 'ansys' ? '#FFF' : 'var(--text)'
                }}
              >
                <Thermometer className="w-3.5 h-3.5 mr-1.5" />
                Heat Cloud
              </button>
            </div>
          </div>

          {/* ── Benchmark Rod card ── */}
          <div
            className="rounded-[6px] border p-3 space-y-2"
            style={{ backgroundColor: 'var(--card)', borderColor: activePreset === 'rod' ? 'var(--warn)' : 'var(--border)' }}
          >
            <div className="flex items-center space-x-2 mb-1">
              <Activity className="w-4 h-4" style={{ color: 'var(--warn)' }} />
              <span className="text-xs font-bold tracking-wide" style={{ color: 'var(--text)' }}>Benchmark Rod</span>
              <span className="text-[9px] border font-mono font-bold px-1.5 py-0.5 rounded-[3px] ml-auto" style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}>
                TASK C REF
              </span>
            </div>
            <p className="text-[10px] font-mono leading-relaxed" style={{ color: 'var(--muted)' }}>
              Uniform steel rod · L=1.0 m · A=1×10⁻⁴ m² · 1D steady-state heat eq · 84 triangles
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={loadRodSTL}
                className="flex items-center justify-center px-2 py-2 rounded-[5px] border text-xs font-semibold"
                style={{
                  backgroundColor: activePreset === 'rod' && activeMode === 'stl' ? '#B7791F' : 'var(--bg)',
                  borderColor:     activePreset === 'rod' && activeMode === 'stl' ? '#B7791F' : 'var(--border)',
                  color:           activePreset === 'rod' && activeMode === 'stl' ? '#FFF' : 'var(--text)'
                }}
              >
                <Box className="w-3.5 h-3.5 mr-1.5" />
                Rod STL
              </button>
              <button
                onClick={loadRodANSYS}
                className="flex items-center justify-center px-2 py-2 rounded-[5px] border text-xs font-semibold"
                style={{
                  backgroundColor: activePreset === 'rod' && activeMode === 'ansys' ? '#B7791F' : 'var(--bg)',
                  borderColor:     activePreset === 'rod' && activeMode === 'ansys' ? '#B7791F' : 'var(--border)',
                  color:           activePreset === 'rod' && activeMode === 'ansys' ? '#FFF' : 'var(--text)'
                }}
              >
                <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
                Rod FEA
              </button>
            </div>
          </div>

          {/* ── Custom Upload card ── */}
          <div
            className="rounded-[6px] border p-3 space-y-2"
            style={{ backgroundColor: 'var(--card)', borderColor: activePreset === 'custom' ? 'var(--ok)' : 'var(--border)' }}
          >
            <div className="flex items-center space-x-2 mb-1">
              <Upload className="w-4 h-4" style={{ color: 'var(--ok)' }} />
              <span className="text-xs font-bold tracking-wide" style={{ color: 'var(--text)' }}>Upload Any File</span>
              <span className="text-[9px] border font-mono font-bold px-1.5 py-0.5 rounded-[3px] ml-auto" style={{ borderColor: 'var(--ok)', color: 'var(--ok)' }}>
                UNIVERSAL
              </span>
            </div>
            <p className="text-[10px] font-mono leading-relaxed" style={{ color: 'var(--muted)' }}>
              Binary &amp; ASCII STL · Stanford Dragon · Any ANSYS CSV · Drag &amp; Drop or Click
            </p>

            {/* STL drop zone */}
            <DropZone
              accept=".stl"
              label="Drop STL here or click to browse"
              sublabel="Binary & ASCII · High-poly auto-decimation · SolidWorks / Blender / Thingiverse"
              icon={Box}
              onFile={handleSTLFile}
              dragActive={stlDragActive}
              setDragActive={setStlDragActive}
            />

            {/* CSV drop zone */}
            <DropZone
              accept=".csv"
              label="Drop ANSYS CSV here or click to browse"
              sublabel="Auto-detects comma / semicolon / tab · mm→m scaling"
              icon={Thermometer}
              onFile={handleCSVFile}
              dragActive={csvDragActive}
              setDragActive={setCsvDragActive}
            />
          </div>
        </div>

        {/* CENTER: 3D Viewport */}
        <div
          className="lg:col-span-6 rounded-[6px] border overflow-hidden flex flex-col"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
        >
          {/* Canvas toolbar */}
          <div
            className="px-3 py-2 border-b flex items-center justify-between text-xs"
            style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--muted)' }}
          >
            <span
              className="font-mono font-semibold flex items-center text-xs"
              style={{ color: 'var(--text)' }}
            >
              <span
                className="w-2 h-2 rounded-[1px] mr-1.5 inline-block"
                style={{ backgroundColor: loading ? 'var(--warn)' : 'var(--ok)' }}
              />
              {activeMode === 'stl'
                ? (stlData?.solid_name || 'STL Mesh Viewport')
                : 'ANSYS Nodal Heat Cloud Viewport'}
            </span>
            <div className="flex items-center space-x-1.5">
              {activeMode === 'stl' && (
                <button
                  onClick={() => setWireframe(!wireframe)}
                  className="px-2 py-0.5 rounded-[4px] border text-xs font-mono flex items-center"
                  style={{
                    backgroundColor: wireframe ? 'var(--sidebar)' : 'var(--card)',
                    color:           wireframe ? '#FFFFFF' : 'var(--text)',
                    borderColor:     wireframe ? 'var(--sidebar)' : 'var(--border)'
                  }}
                >
                  <Layers className="w-3 h-3 mr-1" /> Wireframe
                </button>
              )}
              <button
                onClick={fitCameraToModel}
                className="px-2 py-0.5 rounded-[4px] border text-xs font-mono flex items-center"
                style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                <Maximize2 className="w-3 h-3 mr-1" /> Fit View
              </button>
            </div>
          </div>

          {/* Three.js Canvas */}
          <div className="relative flex-1 min-h-[500px]" ref={mountRef}>
            {loading && (
              <div
                className="absolute inset-0 flex items-center justify-center z-20"
                style={{ backgroundColor: 'rgba(26,30,35,0.85)' }}
              >
                <LoadingSpinner text="Streaming into C++ Universal Core &amp; Building Buffers..." />
              </div>
            )}

            {/* ANSYS Temperature Legend */}
            {activeMode === 'ansys' && ansysData && (
              <div
                className="absolute top-3 right-3 rounded-[5px] border p-2.5 text-xs z-10 w-52"
                style={{ backgroundColor: 'rgba(26,30,35,0.92)', borderColor: 'var(--border)', color: '#fff' }}
              >
                <div className="font-bold text-[11px] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span className="flex items-center">
                    <Thermometer className="w-3.5 h-3.5 mr-1" style={{ color: '#FF6B35' }} />
                    Temperature
                  </span>
                  <span
                    className="text-[9px] font-mono border px-1 rounded-[3px]"
                    style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}
                  >
                    SYNTHETIC
                  </span>
                </div>
                {/* ANSYS colorbar */}
                <div
                  className="h-4 rounded-[3px] border mb-1.5"
                  style={{
                    borderColor: '#3A444C',
                    background: 'linear-gradient(to right, #0000FF, #00FFFF, #00FF00, #FFFF00, #FF0000)'
                  }}
                />
                <div className="flex justify-between font-mono text-[10px]" style={{ color: '#C9CED4' }}>
                  <span>{ansysData.min_temp_C.toFixed(1)} °C</span>
                  <span>{((ansysData.min_temp_C + ansysData.max_temp_C) / 2).toFixed(1)} °C</span>
                  <span>{ansysData.max_temp_C.toFixed(1)} °C</span>
                </div>
                <div className="text-[9px] mt-1.5 text-center font-mono" style={{ color: '#5F6B76' }}>
                  Blue (cold) → Cyan → Green → Yellow → Red (hot)
                </div>
              </div>
            )}

            {/* Selected node tooltip */}
            {activeMode === 'ansys' && selectedNode && (
              <div
                className="absolute bottom-3 left-3 rounded-[5px] border p-2.5 text-xs z-10 font-mono"
                style={{ backgroundColor: 'rgba(26,30,35,0.92)', borderColor: 'var(--border)', color: '#fff' }}
              >
                <div className="font-bold text-xs mb-1">Node #{selectedNode.id}</div>
                <div>X: {selectedNode.x.toFixed(4)} m</div>
                <div>Y: {selectedNode.y.toFixed(4)} m</div>
                <div>Z: {selectedNode.z.toFixed(4)} m</div>
                <div className="font-bold mt-1" style={{ color: '#FF6B35' }}>
                  T: {selectedNode.temp.toFixed(2)} °C
                </div>
              </div>
            )}

            {/* Drag-over global overlay hint */}
            {(stlDragActive || csvDragActive) && (
              <div
                className="absolute inset-0 z-30 flex items-center justify-center rounded-[6px] border-2"
                style={{
                  borderColor: 'var(--accent)',
                  backgroundColor: 'rgba(232,89,12,0.12)'
                }}
              >
                <div className="text-center">
                  <Upload className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--accent)' }} />
                  <p className="font-bold text-sm" style={{ color: 'var(--accent)' }}>Drop to load</p>
                  <p className="text-xs font-mono mt-1" style={{ color: '#C9CED4' }}>
                    {stlDragActive ? 'Binary/ASCII STL · CAD Mesh' : 'ANSYS CSV · Nodal Temperature Cloud'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT panel: Inspection metrics */}
        <div className="lg:col-span-3 space-y-3">
          {/* Inspection Card */}
          <div
            className="rounded-[6px] border p-3 text-xs space-y-2.5"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
          >
            <h3
              className="text-xs font-bold uppercase tracking-wider flex items-center font-mono"
              style={{ color: 'var(--text)' }}
            >
              <Info className="w-3.5 h-3.5 mr-1.5" style={{ color: 'var(--muted)' }} />
              Inspection Metrics
            </h3>

            {activeMode === 'stl' && stlData ? (
              <div className="space-y-1.5 font-mono text-xs">
                {[
                  { label: 'Model Name',    value: stlData.solid_name, bold: true },
                  { label: 'Triangles',     value: stlData.triangle_count?.toLocaleString(), bold: true },
                  { label: 'Bounding Diag', value: `${stlData.bbox?.diag_size?.toFixed(3)} m` },
                  { label: 'Format',        value: stlData.format || 'STL' },
                  { label: 'Validation',    value: stlData.validation_status, okColor: true },
                ].map(({ label, value, bold, okColor }) => (
                  <div key={label} className="flex justify-between py-1 border-b" style={{ borderColor: 'var(--border)' }}>
                    <span style={{ color: 'var(--muted)' }}>{label}</span>
                    <span
                      className={`${bold ? 'font-bold' : ''} truncate max-w-[140px] text-right`}
                      style={{ color: okColor ? 'var(--ok)' : 'var(--text)' }}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            ) : activeMode === 'ansys' && ansysData ? (
              <div className="space-y-1.5 font-mono text-xs">
                {[
                  { label: 'Nodal Count', value: `${ansysData.node_count} nodes`, bold: true },
                  { label: 'Min Temp',    value: `${ansysData.min_temp_C?.toFixed(2)} °C` },
                  { label: 'Max Temp',    value: `${ansysData.max_temp_C?.toFixed(2)} °C` },
                  { label: 'Avg Temp',    value: `${ansysData.avg_temp_C?.toFixed(2)} °C` },
                ].map(({ label, value, bold }) => (
                  <div key={label} className="flex justify-between py-1 border-b" style={{ borderColor: 'var(--border)' }}>
                    <span style={{ color: 'var(--muted)' }}>{label}</span>
                    <span className={`${bold ? 'font-bold' : ''}`} style={{ color: 'var(--text)' }}>{value}</span>
                  </div>
                ))}
                <div className="flex justify-between py-1 border-b" style={{ borderColor: 'var(--border)' }}>
                  <span style={{ color: 'var(--muted)' }}>Provenance</span>
                  <span
                    className="border px-1.5 py-0.5 rounded-[3px] text-[9px] font-bold"
                    style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}
                  >
                    SYNTHETIC
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs font-mono" style={{ color: 'var(--muted)' }}>No model loaded yet. Click a preset or upload a file.</p>
            )}
          </div>

          {/* Parser capabilities card */}
          <div
            className="rounded-[6px] border p-3 space-y-2 text-[10px] font-mono leading-relaxed"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--muted)' }}
          >
            <h3
              className="text-xs font-bold uppercase tracking-wider flex items-center"
              style={{ color: 'var(--text)' }}
            >
              <Zap className="w-3.5 h-3.5 mr-1.5" style={{ color: 'var(--accent)' }} />
              Parser Capabilities
            </h3>
            {[
              '✓ Auto-detect Binary & ASCII STL',
              '✓ High-poly decimation (>150K tri → 60 FPS WebGL)',
              '✓ Stanford Dragon compatible',
              '✓ CSV: comma / semicolon / tab / space',
              '✓ mm → m auto-scaling (ANSYS headers)',
              '✓ Corrupt/NaN rows safely skipped',
              '✓ Up to 25 MB STL / 500K nodes CSV',
            ].map((cap) => (
              <div key={cap} style={{ color: 'var(--muted)' }}>{cap}</div>
            ))}
          </div>

          {/* Quick-switch card */}
          <div
            className="rounded-[6px] border p-3 space-y-1.5"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
          >
            <h3
              className="text-xs font-bold uppercase tracking-wider flex items-center font-mono mb-2"
              style={{ color: 'var(--text)' }}
            >
              <Eye className="w-3.5 h-3.5 mr-1.5" style={{ color: 'var(--muted)' }} />
              Quick View
            </h3>
            {[
              { label: 'Formula-E 3D CAD',    fn: loadPowerUnitSTL,   preset: 'powerunit', mode: 'stl'   },
              { label: 'Formula-E Heat Cloud',fn: loadPowerUnitANSYS, preset: 'powerunit', mode: 'ansys' },
              { label: 'Benchmark Rod STL',        fn: loadRodSTL,     preset: 'rod',       mode: 'stl'   },
              { label: 'Benchmark Rod FEA Cloud',  fn: loadRodANSYS,   preset: 'rod',       mode: 'ansys' },
            ].map(({ label, fn, preset, mode }) => {
              const isActive = activePreset === preset && activeMode === mode;
              return (
                <button
                  key={label}
                  onClick={fn}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-[4px] border text-xs font-mono"
                  style={{
                    backgroundColor: isActive ? 'var(--sidebar)' : 'var(--bg)',
                    borderColor:     isActive ? 'var(--accent)' : 'var(--border)',
                    color:           isActive ? '#FFF' : 'var(--text)'
                  }}
                >
                  <span>{label}</span>
                  <ChevronRight className="w-3 h-3" style={{ color: isActive ? 'var(--accent)' : 'var(--muted)' }} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
