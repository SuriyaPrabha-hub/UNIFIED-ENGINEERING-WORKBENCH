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

## 3. Project LION Biomimetic Model: `project_lion_quadruped.stl`
- **File Name:** `project_lion_quadruped.stl`
- **Provenance:** Biomimetic Quadruped Exploration Robot developed for PASS Science Works R&D internship showcase.
- **Components:**
  - Carbon-fiber central monocoque torso and aerodynamic chest cowl ($L \approx 0.65\text{ m}, W \approx 0.24\text{ m}, H \approx 0.16\text{ m}$)
  - Top longitudinal cooling spine heat exchanger (airflow-assisted dissipation)
  - Biomimetic cranium and vision/LiDAR snout with antenna pods
  - 4 articulated running legs in dynamic galloping posture (hip & knee actuators, titanium struts, shock-absorbing paws)
  - Dynamic inertial stabilizer tail boom
- **Format:** Universal 3D STL (384 triangles, clean manifold geometry).
- **Bounding Box:** $1.33\text{ m}$ diagonal span ($X: [-0.58, 0.60]\text{ m}, Y: [-0.18, 0.18]\text{ m}, Z: [-0.06, 0.44]\text{ m}$).

---

## 4. Project LION ANSYS FEA Cloud: `project_lion_ansys_results.csv`
- **File Name:** `project_lion_ansys_results.csv`
- **Provenance:** **SYNTHETIC DATASET** mimicking ANSYS Mechanical 2026 R1 Thermal-Electric simulation of 5.2 m/s gallop under continuous BLDC motor torque dissipation and forced convective boundary layer.
- **Thermal Mapping:**
  - BLDC Actuator Motors (Hip/Knee joints): Hot red zones ($81.5^\circ\text{C} - 89.2^\circ\text{C}$)
  - Central Battery Pack & Motor Controllers: Warm orange ($62.0^\circ\text{C} - 68.5^\circ\text{C}$)
  - Onboard Compute Brain (FPGA / MCU Spine): Amber ($52.0^\circ\text{C} - 58.0^\circ\text{C}$)
  - Spine Heat Sink Fins: Dissipation yellow ($42.0^\circ\text{C} - 48.0^\circ\text{C}$)
  - Titanium Upper Leg Struts: Conductive teal ($38.0^\circ\text{C} - 46.0^\circ\text{C}$)
  - Structural Carbon Skin & Paws: Cool ANSYS blue ($24.0^\circ\text{C} - 27.5^\circ\text{C}$)
- **Node Count:** 293 nodes.

---

## 5. Universal Parser Capabilities
- **Binary & ASCII STL Support:** Automatic detection using IEEE 754 float layout and header inspection. Compatible with standard exports from SolidWorks, Fusion 360, Blender, Thingiverse, and high-polygon research models (e.g. Stanford Dragon).
- **High-Poly Decimation:** Meshes exceeding 150,000 triangles are intelligently stride-subsampled for real-time 60 FPS WebGL rendering without memory exhaustion, while computing exact bounding box from 100% of triangles.
- **Universal Delimiter & Unit Detection:** ANSYS CSVs with commas (`,`), semicolons (`;`), tabs (`\t`), or spaces are auto-detected. Headers with millimeters (`[mm]`) or coordinates $> 500$ are automatically scaled to SI meters ($\text{m}$). Corrupt/comment rows are safely ignored without crashing the pipeline.
