# Benchmark Datasets: Provenance, Units & Schemas

## 1. ASCII STL Geometry File: `sample_rod.stl`
- **File Name:** `sample_rod.stl`
- **Provenance:** Self-created parametric geometry matching the physical uniform rod defined in Task C.
- **Physical Dimensions:** Length $L = 1.0\text{ m}$, Width $W = 0.01\text{ m}$, Height $H = 0.01\text{ m}$ (Cross-sectional area $A = 1.0 \times 10^{-4}\text{ m}^2$).
- **Units:** Coordinates in meters ($\text{m}$).
- **Topology:** 10 longitudinal segments with top, bottom, front, back, and end-cap facets (total 84 triangles).
- **Format:** Standard ASCII STL (`solid ... facet normal ... vertex ... endfacet ... endsolid`).
- **Tested File-Size Limits:** Tested up to 25 MB ASCII STL (~250,000 triangles) in the C++ streaming parser.

---

## 2. ANSYS Nodal Temperature CSV: `synthetic_ansys_results.csv`
- **File Name:** `synthetic_ansys_results.csv`
- **Provenance:** **SYNTHETIC DATASET** generated from the exact 1D steady-state heat equation with uniform volumetric generation:
  $$T_{\text{exact}}(x) = 100 - 80\frac{x}{L} + \frac{q}{2k}x(L - x)$$
  with parameters $L = 1.0\text{ m}, k = 10\text{ W/(m}\cdot\text{K)}, q = 10,000\text{ W/m}^3, T(0)=100^\circ\text{C}, T(L)=20^\circ\text{C}$.
  *Labelled explicitly as synthetic, not represented as an actual proprietary ANSYS export.*
- **Schema:**
  ```csv
  node_id,x_m,y_m,z_m,temperature_C
  ```
  - `node_id`: Integer, unique node identifier.
  - `x_m`: Float, X-coordinate along rod axis in meters ($\text{m}$).
  - `y_m`: Float, Y-coordinate transverse in meters ($\text{m}$).
  - `z_m`: Float, Z-coordinate vertical in meters ($\text{m}$).
  - `temperature_C`: Float, temperature in degrees Celsius ($^\circ\text{C}$).
- **Tested File-Size Limits:** Validated for up to 500,000 nodes (~35 MB CSV). Empty files and malformed lines (missing columns, NaN/Inf) are detected and rejected with line-numbered actionable errors.

---

## 3. Formula-E Hypercar Powertrain STL: `formula_e_hypercar_power_unit.stl`
- **File Name:** `formula_e_hypercar_power_unit.stl`
- **Provenance:** Electric Hypercar Powertrain CAD assembly developed for PASS Science Works R&D internship engineering showcase.
- **Components:**
  - Dual Silicon Carbide (SiC) Inverter Enclosure (CNC 6061-T6 Aluminum housing: $0.44\text{ m} \times 0.28\text{ m} \times 0.12\text{ m}$)
  - Top Cover Longitudinal Convective Heat Dissipation Fins (5 fin arrays)
  - 800V High-Voltage DC Busbar Terminal Studs & Dielectric Barrier
  - Embedded Gate Driver & Real-Time Controller Bay (STM32H7 / FPGA low-voltage housing matching Task E)
  - Direct-Contact Pin-Fin Liquid Cold Plate with Coolant Inlet ($32^\circ\text{C}$) and Outlet ($42^\circ\text{C}$) Quick-Disconnect Ports
  - 3-Phase High-Current AC Busbars ($U, V, W$ motor feeds)
  - YASA-Style Axial-Flux High-Torque Traction Motor Stator Casing ($0.40\text{ m}$ diameter) with 8 radial concentrated electromagnetic copper winding coils
  - Central Drive Spline Shaft & High-Speed Bearing Cartridge (gearbox coupling)
  - 4 Structural Subframe Mounting Flanges (Chassis Ground Brackets)
- **Format:** Universal 3D STL (432 triangles, clean manifold watertight geometry).
- **Bounding Box:** $0.84\text{ m}$ diagonal span ($X: [-0.28, 0.27]\text{ m}, Y: [-0.23, 0.23]\text{ m}, Z: [-0.18, 0.25]\text{ m}$).

---

## 4. Formula-E Launch Mode ANSYS FEA Cloud: `formula_e_inverter_ansys_results.csv`
- **File Name:** `formula_e_inverter_ansys_results.csv`
- **Provenance:** **SYNTHETIC DATASET** mimicking ANSYS Mechanical 2026 R1 Electro-Thermal Multiphysics simulation of 250 kW full-throttle standing-start launch acceleration ($0-200\text{ km/h}$ in 4.8s).
- **Thermal Mapping:**
  - SiC MOSFET Half-Bridge Junctions: Peak launch hotspots ($118.0^\circ\text{C} - 124.8^\circ\text{C}$)
  - Axial-Flux Stator Copper Windings: $I^2 R$ launch torque dissipation ($86.5^\circ\text{C} - 96.5^\circ\text{C}$)
  - 3-Phase AC Output & DC-Link Busbars: High-current conduction ($72.0^\circ\text{C} - 79.5^\circ\text{C}$)
  - DC-Link High-Frequency Film Capacitor Bank: Ripple current heating ($58.0^\circ\text{C} - 64.5^\circ\text{C}$)
  - Embedded Gate Driver & STM32 / FPGA Controller Board: Signal logic heating ($48.0^\circ\text{C} - 54.5^\circ\text{C}$)
  - Pin-Fin Liquid Cold Plate & Internal Water-Glycol Flow: Forced convective cooling ($32.0^\circ\text{C} - 42.0^\circ\text{C}$)
  - Aluminum Chassis Shell & Grounding Brackets: Ambient equilibrium ($24.0^\circ\text{C} - 28.5^\circ\text{C}$)
- **Node Count:** 522 nodes.

---

## 5. Universal Parser Capabilities
- **Binary & ASCII STL Support:** Automatic detection using IEEE 754 float layout and header inspection. Compatible with standard exports from SolidWorks, Fusion 360, Blender, Thingiverse, and high-polygon research models (e.g. Stanford Dragon).
- **High-Poly Decimation:** Meshes exceeding 150,000 triangles are intelligently stride-subsampled for real-time 60 FPS WebGL rendering without memory exhaustion, while computing exact bounding box from 100% of triangles.
- **Universal Delimiter & Unit Detection:** ANSYS CSVs with commas (`,`), semicolons (`;`), tabs (`\t`), or spaces are auto-detected. Headers with millimeters (`[mm]`) or coordinates $> 500$ are automatically scaled to SI meters ($\text{m}$). Corrupt/comment rows are safely ignored without crashing the pipeline.
