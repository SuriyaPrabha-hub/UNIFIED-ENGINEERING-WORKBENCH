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
