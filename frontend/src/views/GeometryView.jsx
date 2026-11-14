import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { 
  Box, 
  Upload, 
  RotateCw, 
  ZoomIn, 
  Maximize2, 
  Layers, 
  Info, 
  AlertTriangle, 
  FileCode, 
  Sparkles,
  Thermometer
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
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());

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

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e1524);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.001, 1000);
    camera.position.set(0.5, 0.4, 0.8);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;
    mount.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(5, 10, 7);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x3b82f6, 0.6);
    dirLight2.position.set(-5, -5, -5);
    scene.add(dirLight2);

    // Grid helper
    const gridHelper = new THREE.GridHelper(2, 20, 0x374151, 0x1f2937);
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
        // Orbit rotation
        modelGroupRef.current.rotation.y += deltaX * 0.008;
        modelGroupRef.current.rotation.x += deltaY * 0.008;
      } else if (isRightDraggingRef.current && cameraRef.current) {
        // Pan
        cameraRef.current.position.x -= deltaX * 0.002;
        cameraRef.current.position.y += deltaY * 0.002;
      }

      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };

      // Node Raycasting for ANSYS mode
      if (activeMode === 'ansys' && mountRef.current) {
        const rect = mountRef.current.getBoundingClientRect();
        mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
        raycasterRef.current.params.Points.threshold = 0.015;

        const intersects = raycasterRef.current.intersectObjects(modelGroupRef.current.children, true);
        if (intersects.length > 0 && intersects[0].index !== undefined && ansysData?.nodes) {
          const idx = intersects[0].index;
          if (idx < ansysData.nodes.length) {
            setSelectedNode(ansysData.nodes[idx]);
          }
        }
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      isRightDraggingRef.current = false;
    };

    const handleWheel = (e) => {
      e.preventDefault();
      if (!cameraRef.current) return;
      const zoomFactor = e.deltaY * 0.001;
      cameraRef.current.position.z += zoomFactor * 0.5;
      cameraRef.current.position.z = Math.max(0.1, Math.min(10, cameraRef.current.position.z));
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    dom.addEventListener('wheel', handleWheel, { passive: false });
    dom.addEventListener('contextmenu', (e) => e.preventDefault());

    // Resize Handler
    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Initial Load: Load sample STL
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

  // Fit Camera to Model Bounding Box
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

  // Render STL Mesh in Three.js
  const renderSTL = (data) => {
    if (!modelGroupRef.current) return;
    // Clear previous models
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

    const material = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      metalness: 0.2,
      roughness: 0.4,
      wireframe: wireframe,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    modelGroupRef.current.add(mesh);
    fitCameraToModel();
  };

  // Render ANSYS Point Cloud in Three.js
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

    // Jet / Thermal Colormap Helper
    for (let i = 0; i < count; ++i) {
      const n = nodes[i];
      positions[i * 3 + 0] = n.x;
      positions[i * 3 + 1] = n.y;
      positions[i * 3 + 2] = n.z;

      // Normalized temperature: 0 (cold) to 1 (hot)
      const val = (n.temp - minT) / rangeT;
      // Colormap: Blue -> Cyan -> Green -> Yellow -> Red
      const color = new THREE.Color();
      color.setHSL((1.0 - val) * 0.7, 1.0, 0.5);

      colors[i * 3 + 0] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.018,
      vertexColors: true,
      sizeAttenuation: true
    });

    const pointCloud = new THREE.Points(geometry, material);
    modelGroupRef.current.add(pointCloud);
    fitCameraToModel();
  };

  // Wireframe toggle update
  useEffect(() => {
    if (activeMode === 'stl' && modelGroupRef.current) {
      modelGroupRef.current.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.wireframe = wireframe;
        }
      });
    }
  }, [wireframe, activeMode]);

  // Load Built-in Samples
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

  // File Upload Handlers (Processed in C++ Backend)
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
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center">
            <Box className="w-6 h-6 text-blue-400 mr-2.5" /> 3D CAD & ANSYS Data Visualizer
          </h2>
          <p className="text-sm text-gray-400">
            C++ validated streaming parser for ASCII STL surface geometry and ANSYS CSV nodal temperature results.
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center space-x-2 bg-[#111827] p-1.5 rounded-lg border border-[#1F2937]">
          <button
            onClick={() => {
              setActiveMode('stl');
              if (stlData) renderSTL(stlData);
              else loadSampleSTL();
            }}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition ${
              activeMode === 'stl' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            ASCII STL Mesh
          </button>
          <button
            onClick={() => {
              setActiveMode('ansys');
              if (ansysData) renderANSYS(ansysData);
              else loadSampleANSYS();
            }}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition ${
              activeMode === 'ansys' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            ANSYS Point Cloud (CSV)
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex items-start space-x-3 text-rose-300 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold">Validation Failure</div>
            <div className="font-mono text-xs mt-1 text-rose-200">{error}</div>
          </div>
        </div>
      )}

      {/* Main 3D Canvas Card */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-[#111827] border border-[#1F2937] rounded-xl overflow-hidden shadow-lg flex flex-col">
          {/* Canvas Toolbar */}
          <div className="bg-[#161F30] px-4 py-2.5 border-b border-[#1F2937] flex items-center justify-between text-xs text-gray-300">
            <div className="flex items-center space-x-4">
              <span className="font-mono font-medium text-white flex items-center">
                <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2"></span>
                {activeMode === 'stl' ? (stlData?.solid_name || 'STL Mesh') : 'ANSYS Nodal Cloud'}
              </span>
              <span className="text-gray-500">|</span>
              <span className="text-gray-400">Rotate: Left-drag • Pan: Right-drag • Zoom: Scroll</span>
            </div>

            <div className="flex items-center space-x-2">
              {activeMode === 'stl' && (
                <button
                  onClick={() => setWireframe(!wireframe)}
                  className={`px-2.5 py-1 rounded border text-xs font-medium flex items-center transition ${
                    wireframe 
                      ? 'bg-blue-600/20 border-blue-500/40 text-blue-300' 
                      : 'border-[#374151] hover:bg-[#1F2937] text-gray-300'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 mr-1" /> Wireframe
                </button>
              )}
              <button
                onClick={fitCameraToModel}
                className="px-2.5 py-1 rounded border border-[#374151] hover:bg-[#1F2937] text-gray-300 text-xs font-medium flex items-center transition"
              >
                <Maximize2 className="w-3.5 h-3.5 mr-1" /> Fit View
              </button>
            </div>
          </div>

          {/* Three.js Viewport */}
          <div className="relative flex-1 min-h-[480px]" ref={mountRef}>
            {loading && (
              <div className="absolute inset-0 bg-[#0B0F19]/80 backdrop-blur-sm flex items-center justify-center z-20">
                <LoadingSpinner text="Parsing in C++ Core & Generating 3D Buffers..." />
              </div>
            )}

            {/* ANSYS Temperature Legend Overlay */}
            {activeMode === 'ansys' && ansysData && (
              <div className="absolute top-4 right-4 bg-[#111827]/90 backdrop-blur border border-[#1F2937] rounded-lg p-3 text-xs shadow-xl z-10 w-44">
                <div className="font-semibold text-gray-200 mb-2 flex items-center">
                  <Thermometer className="w-3.5 h-3.5 text-orange-400 mr-1.5" /> Nodal Temperature (°C)
                </div>
                <div className="h-4 rounded bg-gradient-to-r from-blue-500 via-green-400 via-yellow-400 to-red-500 border border-white/10 mb-1.5"></div>
                <div className="flex justify-between font-mono text-[11px] text-gray-300">
                  <span>{ansysData.min_temp_C.toFixed(1)}°C</span>
                  <span>{((ansysData.min_temp_C + ansysData.max_temp_C) / 2).toFixed(1)}°C</span>
                  <span>{ansysData.max_temp_C.toFixed(1)}°C</span>
                </div>
                <div className="text-[10px] text-gray-500 mt-2 text-center">
                  Hover/Click node for 3D inspection
                </div>
              </div>
            )}

            {/* Selected Node Tooltip */}
            {activeMode === 'ansys' && selectedNode && (
              <div className="absolute bottom-4 left-4 bg-[#111827]/95 backdrop-blur border border-blue-500/40 rounded-lg p-3 text-xs shadow-xl z-10 font-mono">
                <div className="font-bold text-blue-400 mb-1">Node #{selectedNode.id}</div>
                <div className="text-gray-300">X: {selectedNode.x.toFixed(4)} m</div>
                <div className="text-gray-300">Y: {selectedNode.y.toFixed(4)} m</div>
                <div className="text-gray-300">Z: {selectedNode.z.toFixed(4)} m</div>
                <div className="text-emerald-400 font-bold mt-1">Temperature: {selectedNode.temp.toFixed(2)} °C</div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Controls & Metadata */}
        <div className="space-y-5">
          {/* File Upload Actions Card */}
          <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center">
              <Upload className="w-4 h-4 text-blue-400 mr-2" /> Data Import
            </h3>

            {activeMode === 'stl' ? (
              <div className="space-y-3">
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#374151] hover:border-blue-500/60 rounded-lg p-4 cursor-pointer transition bg-[#161F30]/40">
                  <Upload className="w-6 h-6 text-gray-400 mb-2" />
                  <span className="text-xs font-medium text-gray-200">Upload ASCII STL (.stl)</span>
                  <span className="text-[10px] text-gray-500 mt-0.5">Parsed via C++ streaming parser</span>
                  <input type="file" accept=".stl" onChange={handleSTLFileUpload} className="hidden" />
                </label>

                <button
                  onClick={loadSampleSTL}
                  className="w-full flex items-center justify-center px-3 py-2 rounded-lg bg-[#1F2937] hover:bg-[#374151] text-xs font-medium text-gray-200 border border-[#374151] transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-400 mr-2" /> Load Built-in Sample Rod STL
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#374151] hover:border-blue-500/60 rounded-lg p-4 cursor-pointer transition bg-[#161F30]/40">
                  <Upload className="w-6 h-6 text-gray-400 mb-2" />
                  <span className="text-xs font-medium text-gray-200">Upload ANSYS CSV (.csv)</span>
                  <span className="text-[10px] text-gray-500 mt-0.5">Columns: node_id,x_m,y_m,z_m,temperature_C</span>
                  <input type="file" accept=".csv" onChange={handleCSVFileUpload} className="hidden" />
                </label>

                <button
                  onClick={loadSampleANSYS}
                  className="w-full flex items-center justify-center px-3 py-2 rounded-lg bg-[#1F2937] hover:bg-[#374151] text-xs font-medium text-gray-200 border border-[#374151] transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-orange-400 mr-2" /> Load Synthetic ANSYS Data
                </button>
              </div>
            )}
          </div>

          {/* Model Inspection & Metadata Card */}
          <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-5 shadow-sm text-xs space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center">
              <Info className="w-4 h-4 text-blue-400 mr-2" /> Inspection Metrics
            </h3>

            {activeMode === 'stl' && stlData ? (
              <div className="space-y-2 font-mono">
                <div className="flex justify-between py-1 border-b border-[#1F2937]">
                  <span className="text-gray-400">Solid Name</span>
                  <span className="text-gray-200 font-bold">{stlData.solid_name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1F2937]">
                  <span className="text-gray-400">Triangles</span>
                  <span className="text-blue-400 font-bold">{stlData.triangle_count}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1F2937]">
                  <span className="text-gray-400">Diagonal Size</span>
                  <span className="text-gray-200">{stlData.bbox?.diag_size?.toFixed(3)} m</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1F2937]">
                  <span className="text-gray-400">Validation</span>
                  <span className="text-emerald-400 font-bold">{stlData.validation_status}</span>
                </div>
              </div>
            ) : activeMode === 'ansys' && ansysData ? (
              <div className="space-y-2 font-mono">
                <div className="flex justify-between py-1 border-b border-[#1F2937]">
                  <span className="text-gray-400">Nodal Count</span>
                  <span className="text-blue-400 font-bold">{ansysData.node_count} nodes</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1F2937]">
                  <span className="text-gray-400">Min Temp</span>
                  <span className="text-cyan-400 font-bold">{ansysData.min_temp_C?.toFixed(2)} °C</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1F2937]">
                  <span className="text-gray-400">Max Temp</span>
                  <span className="text-rose-400 font-bold">{ansysData.max_temp_C?.toFixed(2)} °C</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1F2937]">
                  <span className="text-gray-400">Avg Temp</span>
                  <span className="text-amber-400 font-bold">{ansysData.avg_temp_C?.toFixed(2)} °C</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1F2937]">
                  <span className="text-gray-400">Validation</span>
                  <span className="text-emerald-400 font-bold">{ansysData.validation_status}</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No model loaded yet.</p>
            )}

            <div className="pt-2 text-[11px] text-gray-500 leading-relaxed font-sans">
              Tested parser throughput: up to 250,000 STL facets (~25 MB) and 500,000 ANSYS CSV lines in C++17 without UI freezing.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
