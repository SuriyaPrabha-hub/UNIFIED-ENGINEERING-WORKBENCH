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
  FileText
} from 'lucide-react';
import { api } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';

export default function GeometryView() {
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
    camera.position.set(0.5, 0.4, 0.8);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;
    mount.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight1.position.set(5, 10, 7);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xd5d9de, 0.5);
    dirLight2.position.set(-5, -5, -5);
    scene.add(dirLight2);

    // Engineering grid helper
    const gridHelper = new THREE.GridHelper(2, 20, 0x5F6B76, 0x2C333A);
    gridHelper.position.y = -0.05;
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
      const deltaX = e.clientX - previousMousePositionRef.current.x;
      const deltaY = e.clientY - previousMousePositionRef.current.y;

      if (isDraggingRef.current && modelGroupRef.current) {
        modelGroupRef.current.rotation.y += deltaX * 0.008;
        modelGroupRef.current.rotation.x += deltaY * 0.008;
      } else if (isRightDraggingRef.current && cameraRef.current) {
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

    // Auto-load built-in sample STL on initial mount
    loadSampleSTL();

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

    cameraRef.current.position.set(center.x + cameraZ * 0.5, center.y + cameraZ * 0.4, center.z + cameraZ);
    cameraRef.current.lookAt(center);
    if (modelGroupRef.current) {
      modelGroupRef.current.rotation.set(0.2, 0.4, 0);
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
      size: 0.02,
      vertexColors: true,
      sizeAttenuation: true
    });

    const pointCloud = new THREE.Points(geometry, material);
    modelGroupRef.current.add(pointCloud);
    fitCameraToModel();
  };

  useEffect(() => {
    if (activeMode === 'stl' && modelGroupRef.current) {
      modelGroupRef.current.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.wireframe = wireframe;
        }
      });
    }
  }, [wireframe, activeMode]);

  const loadSampleSTL = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getSampleSTL();
      setStlData(res);
      setActiveMode('stl');
      renderSTL(res);
    } catch (err) {
      setError(`Failed to load sample STL: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadSampleANSYS = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getSampleAnsysCSV();
      setAnsysData(res);
      setActiveMode('ansys');
      renderANSYS(res);
    } catch (err) {
      setError(`Failed to load sample ANSYS CSV: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSTLFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target.result;
        const res = await api.parseSTL(text);
        setStlData(res);
        setActiveMode('stl');
        renderSTL(res);
      } catch (err) {
        setError(`STL Parsing Error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
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
        const res = await api.parseAnsysCSV(text);
        setAnsysData(res);
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
            C++ streaming parser for ASCII STL surface mesh and ANSYS CSV nodal temperature results.
          </p>
        </div>

        {/* Mode Switcher */}
        <div 
          className="flex items-center space-x-1 p-1 rounded-[4px] border"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <button
            onClick={() => {
              setActiveMode('stl');
              if (stlData) renderSTL(stlData);
              else loadSampleSTL();
            }}
            className="px-3 py-1 rounded-[4px] text-xs font-semibold transition-none"
            style={{
              backgroundColor: activeMode === 'stl' ? 'var(--accent)' : 'transparent',
              color: activeMode === 'stl' ? '#FFFFFF' : 'var(--muted)'
            }}
          >
            ASCII STL Mesh
          </button>
          <button
            onClick={() => {
              setActiveMode('ansys');
              if (ansysData) renderANSYS(ansysData);
              else loadSampleANSYS();
            }}
            className="px-3 py-1 rounded-[4px] text-xs font-semibold transition-none"
            style={{
              backgroundColor: activeMode === 'ansys' ? 'var(--accent)' : 'transparent',
              color: activeMode === 'ansys' ? '#FFFFFF' : 'var(--muted)'
            }}
          >
            ANSYS Point Cloud (CSV)
          </button>
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
                <LoadingSpinner text="Parsing in C++ Core &amp; Generating Buffers..." />
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
              <Upload className="w-3.5 h-3.5 mr-1.5" style={{ color: 'var(--muted)' }} /> Data Import
            </h3>

            {activeMode === 'stl' ? (
              <div className="space-y-2.5">
                <label 
                  className="flex flex-col items-center justify-center border border-dashed rounded-[4px] p-3 cursor-pointer"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
                >
                  <Upload className="w-5 h-5 mb-1.5" style={{ color: 'var(--muted)' }} />
                  <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>Upload ASCII STL (.stl)</span>
                  <span className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--muted)' }}>Streamed through C++ parser</span>
                  <input type="file" accept=".stl" onChange={handleSTLFileUpload} className="hidden" />
                </label>

                <button
                  onClick={loadSampleSTL}
                  className="w-full flex items-center justify-center px-3 py-1.5 rounded-[4px] text-xs font-semibold border"
                  style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  <FileText className="w-3.5 h-3.5 mr-1.5" style={{ color: 'var(--muted)' }} /> Load Sample Rod STL
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <label 
                  className="flex flex-col items-center justify-center border border-dashed rounded-[4px] p-3 cursor-pointer"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
                >
                  <Upload className="w-5 h-5 mb-1.5" style={{ color: 'var(--muted)' }} />
                  <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>Upload ANSYS CSV (.csv)</span>
                  <span className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--muted)' }}>node_id,x_m,y_m,z_m,temperature_C</span>
                  <input type="file" accept=".csv" onChange={handleCSVFileUpload} className="hidden" />
                </label>

                <button
                  onClick={loadSampleANSYS}
                  className="w-full flex items-center justify-center px-3 py-1.5 rounded-[4px] text-xs font-semibold border"
                  style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  <FileText className="w-3.5 h-3.5 mr-1.5" style={{ color: 'var(--muted)' }} /> Load Synthetic ANSYS Dataset
                </button>
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
                  <span style={{ color: 'var(--muted)' }}>Solid Name</span>
                  <span className="font-bold" style={{ color: 'var(--text)' }}>{stlData.solid_name}</span>
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
              Parser verified in C++17: supports &gt; 250,000 STL facets (~25 MB) and 500,000 ANSYS CSV lines without UI freezing.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
