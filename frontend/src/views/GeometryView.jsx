import React, { useState, useEffect, useRef } from 'react';
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
  Activity
} from 'lucide-react';
import { api } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';

export default function GeometryView() {
  const [activePreset, setActivePreset] = useState('lion'); // 'lion', 'rod', 'custom'
  const [activeMode, setActiveMode] = useState('stl'); // 'stl' or 'ansys'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Data states
  const [stlData, setStlData] = useState(null);
  const [ansysData, setAnsysData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [wireframe, setWireframe] = useState(false);

  // Three.js refs
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const modelGroupRef = useRef(null);

  // Interaction tracking (Orbit Controls fallback)
  const isDraggingRef = useRef(false);
  const isRightDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });

  // Initialize Three.js Scene
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 800;
    const height = mount.clientHeight || 500;

    // Scene with engineering CAD dark background (matches sidebar)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1F2429);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.001, 1000);
    camera.position.set(0.6, 0.5, 1.0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;
    mount.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight1.position.set(5, 10, 7);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xd5d9de, 0.5);
    dirLight2.position.set(-5, -5, -5);
    scene.add(dirLight2);

    // Engineering grid helper
    const gridHelper = new THREE.GridHelper(2.5, 25, 0x5F6B76, 0x2C333A);
    gridHelper.position.y = -0.06;
    scene.add(gridHelper);

    // Group for dynamic models
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);
    modelGroupRef.current = modelGroup;

    // Animation Loop
    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Mouse Controls (Rotate & Pan)
    const handleMouseDown = (e) => {
      if (e.button === 0) isDraggingRef.current = true;
      if (e.button === 2) isRightDraggingRef.current = true;
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e) => {
      if (!isDraggingRef.current && !isRightDraggingRef.current) return;
      if (!cameraRef.current || !modelGroupRef.current) return;

      const deltaX = e.clientX - previousMousePositionRef.current.x;
      const deltaY = e.clientY - previousMousePositionRef.current.y;

      if (isDraggingRef.current) {
        // Orbit rotation
        modelGroupRef.current.rotation.y += deltaX * 0.01;
        modelGroupRef.current.rotation.x += deltaY * 0.01;
      } else if (isRightDraggingRef.current) {
        // Pan
        cameraRef.current.position.x -= deltaX * 0.002;
        cameraRef.current.position.y += deltaY * 0.002;
      }

      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      isRightDraggingRef.current = false;
    };

    const handleWheel = (e) => {
      e.preventDefault();
      if (!cameraRef.current) return;
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
      cameraRef.current.position.multiplyScalar(zoomFactor);
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', handleMouseDown);
    dom.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    dom.addEventListener('wheel', handleWheel, { passive: false });

    const handleResize = () => {
      if (!mount || !rendererRef.current || !cameraRef.current) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Initial load: Project LION Biomimetic Robot flagship showcase
    loadLionSTL();

    return () => {
      cancelAnimationFrame(animationFrameId);
      dom.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      dom.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', handleResize);
      if (mount && renderer.domElement) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  const fitCameraToModel = () => {
    if (!cameraRef.current || !modelGroupRef.current) return;
    const box = new THREE.Box3().setFromObject(modelGroupRef.current);
    if (box.isEmpty()) return;

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = cameraRef.current.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.8;
    cameraZ = Math.max(cameraZ, 0.4);

    cameraRef.current.position.set(center.x + cameraZ * 0.6, center.y + cameraZ * 0.5, center.z + cameraZ * 0.9);
    cameraRef.current.lookAt(center);
    if (modelGroupRef.current) {
      modelGroupRef.current.rotation.set(0.15, 0.45, 0);
    }
  };

  const renderSTL = (data) => {
    if (!modelGroupRef.current) return;
    while (modelGroupRef.current.children.length > 0) {
      const obj = modelGroupRef.current.children[0];
      modelGroupRef.current.remove(obj);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(data.positions), 3));
    if (data.normals && data.normals.length > 0) {
      geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(data.normals), 3));
    } else {
      geometry.computeVertexNormals();
    }

    // Engineering solid grey CAD material
    const material = new THREE.MeshStandardMaterial({
      color: 0x8C96A0,
      metalness: 0.1,
      roughness: 0.6,
      wireframe: wireframe,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    modelGroupRef.current.add(mesh);
    fitCameraToModel();
  };

  const renderANSYS = (data) => {
    if (!modelGroupRef.current) return;
    while (modelGroupRef.current.children.length > 0) {
      const obj = modelGroupRef.current.children[0];
      modelGroupRef.current.remove(obj);
    }

    const nodes = data.nodes || [];
    const count = nodes.length;
    if (count === 0) return;

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const minT = data.min_temp_C;
    const maxT = data.max_temp_C;
    const rangeT = maxT - minT || 1.0;

    // Classic ANSYS Blue -> Cyan -> Green -> Yellow -> Red colormap
    for (let i = 0; i < count; ++i) {
      const n = nodes[i];
      positions[i * 3 + 0] = n.x;
      positions[i * 3 + 1] = n.y;
      positions[i * 3 + 2] = n.z;

      const val = Math.max(0, Math.min(1, (n.temp - minT) / rangeT));
      const color = new THREE.Color();
      color.setHSL((1.0 - val) * 0.666, 1.0, 0.5);

      colors[i * 3 + 0] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.025,
      vertexColors: true,
      sizeAttenuation: true
    });

    const points = new THREE.Points(geometry, material);
    modelGroupRef.current.add(points);
    fitCameraToModel();
  };

  // Wireframe toggle effect
  useEffect(() => {
    if (activeMode === 'stl' && modelGroupRef.current) {
      modelGroupRef.current.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.wireframe = wireframe;
        }
      });
    }
  }, [wireframe, activeMode]);

  // Project LION Loaders
  const loadLionSTL = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getSampleLionSTL();
      setStlData(res);
      setActivePreset('lion');
      setActiveMode('stl');
      renderSTL(res);
    } catch (err) {
      setError(`Failed to load Project LION STL: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadLionANSYS = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getSampleLionAnsysCSV();
      setAnsysData(res);
      setActivePreset('lion');
      setActiveMode('ansys');
      renderANSYS(res);
    } catch (err) {
      setError(`Failed to load Project LION ANSYS CSV: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Task C Benchmark Rod Loaders
  const loadRodSTL = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getSampleSTL();
      setStlData(res);
      setActivePreset('rod');
      setActiveMode('stl');
      renderSTL(res);
    } catch (err) {
      setError(`Failed to load benchmark Rod STL: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadRodANSYS = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getSampleAnsysCSV();
      setAnsysData(res);
      setActivePreset('rod');
      setActiveMode('ansys');
      renderANSYS(res);
    } catch (err) {
      setError(`Failed to load benchmark ANSYS CSV: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Universal File Upload Handlers
  const handleSTLFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const buffer = evt.target.result;
        // Universal parser accepts binary ArrayBuffer directly without UTF-8 corruption
        const res = await api.parseSTL(buffer);
        setStlData(res);
        setActivePreset('custom');
        setActiveMode('stl');
        renderSTL(res);
      } catch (err) {
        setError(`STL Parsing Error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleCSVFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target.result;
        // Universal CSV parser handles commas, semicolons, tabs, mm/m auto-scaling
        const res = await api.parseAnsysCSV(text);
        setAnsysData(res);
        setActivePreset('custom');
        setActiveMode('ansys');
        renderANSYS(res);
      } catch (err) {
        setError(`ANSYS CSV Parsing Error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 
            className="text-base font-bold tracking-tight flex items-center"
            style={{ color: 'var(--text)' }}
          >
            <Box className="w-4 h-4 mr-2" style={{ color: 'var(--muted)' }} /> 3D CAD &amp; ANSYS Data Visualization
          </h2>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Universal C++ streaming parser: auto-detects Binary &amp; ASCII STL meshes and any ANSYS CSV format.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div 
          className="flex items-center space-x-1 p-1 rounded-[4px] border"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <button
            onClick={() => {
              setActiveMode('stl');
              if (activePreset === 'lion') loadLionSTL();
              else if (activePreset === 'rod') loadRodSTL();
              else if (stlData) renderSTL(stlData);
            }}
            className="px-3 py-1 rounded-[4px] text-xs font-semibold transition-none"
            style={{
              backgroundColor: activeMode === 'stl' ? 'var(--accent)' : 'transparent',
              color: activeMode === 'stl' ? '#FFFFFF' : 'var(--muted)'
            }}
          >
            CAD STL Mesh
          </button>
          <button
            onClick={() => {
              setActiveMode('ansys');
              if (activePreset === 'lion') loadLionANSYS();
              else if (activePreset === 'rod') loadRodANSYS();
              else if (ansysData) renderANSYS(ansysData);
            }}
            className="px-3 py-1 rounded-[4px] text-xs font-semibold transition-none"
            style={{
              backgroundColor: activeMode === 'ansys' ? 'var(--accent)' : 'transparent',
              color: activeMode === 'ansys' ? '#FFFFFF' : 'var(--muted)'
            }}
          >
            ANSYS Nodal Cloud (CSV)
          </button>
        </div>
      </div>

      {/* Preset Model Selector Bar */}
      <div 
        className="rounded-[4px] border p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center space-x-2">
          <span className="font-mono text-[11px] uppercase tracking-wider font-bold" style={{ color: 'var(--muted)' }}>
            Active Showcase:
          </span>
          <button
            onClick={() => {
              if (activeMode === 'stl') loadLionSTL();
              else loadLionANSYS();
            }}
            className="px-2.5 py-1 rounded-[4px] border font-semibold flex items-center"
            style={{
              backgroundColor: activePreset === 'lion' ? 'var(--sidebar)' : 'var(--bg)',
              color: activePreset === 'lion' ? '#FFFFFF' : 'var(--text)',
              borderColor: activePreset === 'lion' ? 'var(--sidebar)' : 'var(--border)'
            }}
          >
            <Cpu className="w-3.5 h-3.5 mr-1.5" /> Project LION (Biomimetic Robot)
          </button>
          <button
            onClick={() => {
              if (activeMode === 'stl') loadRodSTL();
              else loadRodANSYS();
            }}
            className="px-2.5 py-1 rounded-[4px] border font-semibold flex items-center"
            style={{
              backgroundColor: activePreset === 'rod' ? 'var(--sidebar)' : 'var(--bg)',
              color: activePreset === 'rod' ? '#FFFFFF' : 'var(--text)',
              borderColor: activePreset === 'rod' ? 'var(--sidebar)' : 'var(--border)'
            }}
          >
            <Activity className="w-3.5 h-3.5 mr-1.5" /> Benchmark Rod (Task C Reference)
          </button>
        </div>

        <div className="flex items-center space-x-2 text-[11px] font-mono">
          <span 
            className="border px-1.5 py-0.5 rounded-[2px] font-bold"
            style={{
              borderColor: activePreset === 'custom' ? 'var(--ok)' : 'var(--warn)',
              color: activePreset === 'custom' ? 'var(--ok)' : 'var(--warn)'
            }}
          >
            {activePreset === 'lion' ? 'PROJECT LION (R&D SHOWCASE)' : activePreset === 'rod' ? 'SYNTHETIC BENCHMARK' : 'CUSTOM USER DATASET'}
          </span>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div 
          className="rounded-[4px] border p-3 flex items-start space-x-2 text-xs font-mono"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--err)', color: 'var(--err)' }}
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--err)' }} />
          <div className="flex-1">
            <div className="font-bold">Validation Error</div>
            <div className="mt-0.5">{error}</div>
          </div>
        </div>
      )}

      {/* Warning Alert (e.g. Decimation or Auto-scaling) */}
      {((activeMode === 'stl' && stlData?.warnings) || (activeMode === 'ansys' && ansysData?.warnings)) && (
        <div 
          className="rounded-[4px] border p-2.5 flex items-center space-x-2 text-xs font-mono"
          style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--warn)', color: 'var(--warn)' }}
        >
          <Info className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--warn)' }} />
          <div>{activeMode === 'stl' ? stlData?.warnings : ansysData?.warnings}</div>
        </div>
      )}

      {/* Main 3D Canvas Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div 
          className="lg:col-span-3 rounded-[4px] border overflow-hidden flex flex-col"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
        >
          {/* Canvas Toolbar */}
          <div 
            className="px-3 py-2 border-b flex items-center justify-between text-xs"
            style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--muted)' }}
          >
            <div className="flex items-center space-x-3">
              <span 
                className="font-mono font-medium flex items-center text-xs"
                style={{ color: 'var(--text)' }}
              >
                <span 
                  className="w-2 h-2 rounded-[1px] mr-1.5"
                  style={{ backgroundColor: 'var(--ok)' }}
                ></span>
                {activeMode === 'stl' ? (stlData?.solid_name || 'STL Mesh') : 'ANSYS Nodal Cloud'}
              </span>
              <span style={{ color: 'var(--border)' }}>|</span>
              <span className="text-[11px] font-mono" style={{ color: 'var(--muted)' }}>
                Rotate: Left-drag • Pan: Right-drag • Zoom: Scroll
              </span>
            </div>

            <div className="flex items-center space-x-1.5">
              {activeMode === 'stl' && (
                <button
                  onClick={() => setWireframe(!wireframe)}
                  className="px-2 py-0.5 rounded-[4px] border text-xs font-mono flex items-center"
                  style={{
                    backgroundColor: wireframe ? 'var(--sidebar)' : 'var(--card)',
                    color: wireframe ? '#FFFFFF' : 'var(--text)',
                    borderColor: wireframe ? 'var(--sidebar)' : 'var(--border)'
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

          {/* Three.js Viewport */}
          <div className="relative flex-1 min-h-[460px]" ref={mountRef}>
            {loading && (
              <div 
                className="absolute inset-0 flex items-center justify-center z-20"
                style={{ backgroundColor: 'var(--bg)' }}
              >
                <LoadingSpinner text="Streaming into C++ Universal Core &amp; Building Buffers..." />
              </div>
            )}

            {/* ANSYS Classic Temperature Legend Overlay with explicit degC units */}
            {activeMode === 'ansys' && ansysData && (
              <div 
                className="absolute top-3 right-3 rounded-[4px] border p-2.5 text-xs z-10 w-48"
                style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                <div className="font-bold text-[11px] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span className="flex items-center">
                    <Thermometer className="w-3.5 h-3.5 mr-1" style={{ color: 'var(--muted)' }} /> Temperature
                  </span>
                  <span 
                    className="text-[10px] font-mono border px-1 py-0.2 rounded-[2px]"
                    style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}
                  >
                    SYNTHETIC
                  </span>
                </div>
                {/* Classic ANSYS Blue -> Cyan -> Green -> Yellow -> Red Spectrum */}
                <div 
                  className="h-3.5 rounded-[2px] border mb-1" 
                  style={{
                    borderColor: 'var(--border)',
                    background: 'linear-gradient(to right, #0000FF, #00FFFF, #00FF00, #FFFF00, #FF0000)'
                  }}
                ></div>
                <div 
                  className="flex justify-between font-mono text-[10px]"
                  style={{ color: 'var(--text)' }}
                >
                  <span>{ansysData.min_temp_C.toFixed(1)} degC</span>
                  <span>{((ansysData.min_temp_C + ansysData.max_temp_C) / 2).toFixed(1)} degC</span>
                  <span>{ansysData.max_temp_C.toFixed(1)} degC</span>
                </div>
                <div 
                  className="text-[10px] mt-1 text-center font-mono"
                  style={{ color: 'var(--muted)' }}
                >
                  Scale: Blue (cold) to Red (hot)
                </div>
              </div>
            )}

            {/* Selected Node Tooltip */}
            {activeMode === 'ansys' && selectedNode && (
              <div 
                className="absolute bottom-3 left-3 rounded-[4px] border p-2.5 text-xs z-10 font-mono"
                style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                <div className="font-bold text-xs mb-1">Node #{selectedNode.id}</div>
                <div>X: {selectedNode.x.toFixed(4)} m</div>
                <div>Y: {selectedNode.y.toFixed(4)} m</div>
                <div>Z: {selectedNode.z.toFixed(4)} m</div>
                <div className="font-bold mt-1" style={{ color: 'var(--accent)' }}>
                  Temperature: {selectedNode.temp.toFixed(2)} degC
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Controls & Metadata */}
        <div className="space-y-4">
          {/* File Upload Actions Card */}
          <div 
            className="rounded-[4px] border p-4"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
          >
            <h3 
              className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center font-mono"
              style={{ color: 'var(--text)' }}
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" style={{ color: 'var(--muted)' }} /> Universal Data Import
            </h3>

            {activeMode === 'stl' ? (
              <div className="space-y-2.5">
                <label 
                  className="flex flex-col items-center justify-center border border-dashed rounded-[4px] p-3 cursor-pointer transition-none"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
                >
                  <Upload className="w-5 h-5 mb-1.5" style={{ color: 'var(--muted)' }} />
                  <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>Upload Any STL (.stl)</span>
                  <span className="text-[10px] font-mono mt-0.5 text-center" style={{ color: 'var(--muted)' }}>
                    Binary &amp; ASCII • High-Poly &amp; CAD Auto-Detect
                  </span>
                  <input type="file" accept=".stl" onChange={handleSTLFileUpload} className="hidden" />
                </label>

                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    onClick={loadLionSTL}
                    className="flex items-center justify-center px-2 py-1.5 rounded-[4px] text-xs font-semibold border"
                    style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  >
                    <Cpu className="w-3.5 h-3.5 mr-1" style={{ color: 'var(--muted)' }} /> Lion STL
                  </button>
                  <button
                    onClick={loadRodSTL}
                    className="flex items-center justify-center px-2 py-1.5 rounded-[4px] text-xs font-semibold border"
                    style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  >
                    <FileText className="w-3.5 h-3.5 mr-1" style={{ color: 'var(--muted)' }} /> Rod STL
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <label 
                  className="flex flex-col items-center justify-center border border-dashed rounded-[4px] p-3 cursor-pointer transition-none"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
                >
                  <Upload className="w-5 h-5 mb-1.5" style={{ color: 'var(--muted)' }} />
                  <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>Upload Any CSV (.csv)</span>
                  <span className="text-[10px] font-mono mt-0.5 text-center" style={{ color: 'var(--muted)' }}>
                    Auto-detects delimiters (comma, semicolon, tab) &amp; mm/m units
                  </span>
                  <input type="file" accept=".csv" onChange={handleCSVFileUpload} className="hidden" />
                </label>

                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    onClick={loadLionANSYS}
                    className="flex items-center justify-center px-2 py-1.5 rounded-[4px] text-xs font-semibold border"
                    style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  >
                    <Cpu className="w-3.5 h-3.5 mr-1" style={{ color: 'var(--muted)' }} /> Lion FEA
                  </button>
                  <button
                    onClick={loadRodANSYS}
                    className="flex items-center justify-center px-2 py-1.5 rounded-[4px] text-xs font-semibold border"
                    style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  >
                    <FileText className="w-3.5 h-3.5 mr-1" style={{ color: 'var(--muted)' }} /> Rod FEA
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Model Inspection & Metadata Card */}
          <div 
            className="rounded-[4px] border p-4 text-xs space-y-2.5"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
          >
            <h3 
              className="text-xs font-bold uppercase tracking-wider flex items-center font-mono"
              style={{ color: 'var(--text)' }}
            >
              <Info className="w-3.5 h-3.5 mr-1.5" style={{ color: 'var(--muted)' }} /> Inspection Metrics
            </h3>

            {activeMode === 'stl' && stlData ? (
              <div className="space-y-1.5 font-mono text-xs">
                <div className="flex justify-between py-1 border-b" style={{ borderColor: 'var(--border)' }}>
                  <span style={{ color: 'var(--muted)' }}>Model Name</span>
                  <span className="font-bold truncate max-w-[150px]" style={{ color: 'var(--text)' }}>{stlData.solid_name}</span>
                </div>
                <div className="flex justify-between py-1 border-b" style={{ borderColor: 'var(--border)' }}>
                  <span style={{ color: 'var(--muted)' }}>Triangles</span>
                  <span className="font-bold" style={{ color: 'var(--text)' }}>{stlData.triangle_count}</span>
                </div>
                <div className="flex justify-between py-1 border-b" style={{ borderColor: 'var(--border)' }}>
                  <span style={{ color: 'var(--muted)' }}>Bounding Diag</span>
                  <span style={{ color: 'var(--text)' }}>{stlData.bbox?.diag_size?.toFixed(3)} m</span>
                </div>
                <div className="flex justify-between py-1 border-b" style={{ borderColor: 'var(--border)' }}>
                  <span style={{ color: 'var(--muted)' }}>Validation</span>
                  <span className="font-bold" style={{ color: 'var(--ok)' }}>{stlData.validation_status}</span>
                </div>
              </div>
            ) : activeMode === 'ansys' && ansysData ? (
              <div className="space-y-1.5 font-mono text-xs">
                <div className="flex justify-between py-1 border-b" style={{ borderColor: 'var(--border)' }}>
                  <span style={{ color: 'var(--muted)' }}>Nodal Count</span>
                  <span className="font-bold" style={{ color: 'var(--text)' }}>{ansysData.node_count} nodes</span>
                </div>
                <div className="flex justify-between py-1 border-b" style={{ borderColor: 'var(--border)' }}>
                  <span style={{ color: 'var(--muted)' }}>Min Temp</span>
                  <span className="font-bold" style={{ color: 'var(--text)' }}>{ansysData.min_temp_C?.toFixed(2)} degC</span>
                </div>
                <div className="flex justify-between py-1 border-b" style={{ borderColor: 'var(--border)' }}>
                  <span style={{ color: 'var(--muted)' }}>Max Temp</span>
                  <span className="font-bold" style={{ color: 'var(--text)' }}>{ansysData.max_temp_C?.toFixed(2)} degC</span>
                </div>
                <div className="flex justify-between py-1 border-b" style={{ borderColor: 'var(--border)' }}>
                  <span style={{ color: 'var(--muted)' }}>Avg Temp</span>
                  <span className="font-bold" style={{ color: 'var(--text)' }}>{ansysData.avg_temp_C?.toFixed(2)} degC</span>
                </div>
                <div className="flex justify-between py-1 border-b" style={{ borderColor: 'var(--border)' }}>
                  <span style={{ color: 'var(--muted)' }}>Provenance</span>
                  <span 
                    className="border px-1 py-0.2 rounded-[2px] text-[10px] font-bold"
                    style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}
                  >
                    SYNTHETIC
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs font-mono" style={{ color: 'var(--muted)' }}>No model loaded yet.</p>
            )}

            <div 
              className="pt-2 text-[10px] leading-relaxed border-t font-mono"
              style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
            >
              C++ Universal Engine: Supports all binary &amp; ASCII STLs (including high-poly Stanford Dragon) and any CSV layout without freezing.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}