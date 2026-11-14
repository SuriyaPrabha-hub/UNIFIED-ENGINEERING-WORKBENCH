# UNIFIED ENGINEERING WORKBENCH
**PASS SCIENCE WORKS | R&D INTERNSHIP 2026-2027**  
*Common Technical Assessment Submission (100 Points Rubric)*

A unified, multi-domain desktop engineering workbench integrating **C++17 numerical computation**, **React / Three.js 3D visualization**, **multicore multithreaded benchmarking**, **embedded hardware simulation**, and **analytical backpropagation verification**.

---

## 🚀 One-Click Execution (Windows 11 x64)

No command prompt, administrator rights, Node.js, or package installation is required.

1. **Extract** the submission ZIP archive (`CandidateID_Workbench.zip`).
2. **Double-click** `Launch.exe` (or `Launch.bat`).
3. The native C++ server launches in the background and opens the interactive workbench in your default web browser at `http://127.0.0.1:8080`.

---

## 🏗️ System Architecture & Modularity

The application consists of two cleanly decoupled subsystems:

```
PASS SCIENCE INTERN/
├── Launch.exe                  # Standalone Windows 11 launcher (One-click)
├── Launch.bat                  # Alternate batch launcher
├── CMakeLists.txt              # Top-level CMake source build definition
├── backend/                    # C++17 Numerical Engine & HTTP REST API
│   ├── include/                # Header files (thermal_fea, geometry_parser, etc.)
│   ├── src/                    # C++ implementations & server_main.cpp
│   ├── tests/                  # Automated numerical & system unit test suite
│   ├── workbench_server.exe    # Compiled statically linked C++ server
│   └── CMakeLists.txt          # Backend CMake configuration
├── frontend/                   # React.js + Three.js + Tailwind CSS UI
│   ├── src/                    # Views, Components, Three.js Viewports
│   ├── dist/                   # Production distribution assets (packaged)
│   ├── package.json            # Frontend dependency specifications
│   └── vite.config.js          # Vite build & proxy configuration
├── data/                       # Verified benchmark datasets
│   ├── sample_rod.stl          # Synthetic ASCII STL rod matching Task C
│   ├── synthetic_ansys_results.csv # Synthetic ANSYS nodal temperature export
│   └── README.md               # Provenance, units & schema documentation
├── results/                    # Generated raw engineering results & CSV exports
│   ├── thermal_fea_results.csv # Convergence results across N=10, 20, 40, 80
│   ├── performance_benchmark_results.csv # Multicore speedup repetition data
│   └── neural_backpropagation_training.csv # 100-step training history
├── docs/                       # Technical documentation & evidence
│   ├── technical_report.md     # 6-page comprehensive technical report
│   ├── handwritten_backprop_derivation.md # 2-page handwritten math reference
│   └── embedded_block_diagram.svg # Hardware block diagram & wiring layout
└── .vscode/                    # Editor run configuration
    └── launch.json             # One-click VS Code debug & run target
```

---

## 🔬 Core Capabilities

### 1. Thermal Finite Element Analysis (Task C)
- Solves 1D steady-state heat equation with uniform volumetric generation:
  $$-\frac{d}{dx}\left(kA \frac{dT}{dx}\right) = q A$$
  with $L = 1.0\text{ m}, A = 1.0 \times 10^{-4}\text{ m}^2, k = 10.0\text{ W/(m}\cdot\text{K)}, q = 10,000\text{ W/m}^3, T(0) = 100^\circ\text{C}, T(L) = 20^\circ\text{C}$.
- 2-node linear elements assembled into global stiffness matrix $[K]$ and load vector $\{F\}$.
- Dirichlet boundary conditions enforced via exact elimination before Gaussian elimination with partial pivoting.
- Verified against analytical solution $T_{\text{exact}}(x) = 100 - 80x + 500x(1 - x)$.
- Evaluates maximum absolute error at element midpoints, proving exact $O(h^2)$ quadratic mesh convergence for $N \in \{10, 20, 40, 80\}$ (Errors: 1.25°C, 0.3125°C, 0.078125°C, 0.019531°C).

### 2. 3D CAD & ANSYS Visualization (Task B)
- **ASCII STL Viewer:** Three.js rendering with Rotate, Pan, Zoom, and Fit-to-view.
- **ANSYS Point Cloud:** 3D colored nodes with temperature legend, gradient colormap, and real-time hover/click inspection tooltips showing Node ID, $(x, y, z)$, and temperature in °C.
- **C++ Validation:** Streaming parser validates numeric finiteness (`std::isfinite`), line numbers, and rejects malformed/empty files.

### 3. Multicore Performance Lab (Task D)
- Bounded C++ worker pool (`std::thread`) running 1, 2, 3, and 4 threads on 200 independent cases.
- Deterministic batch generator (fixed seed 42) with varied $k$ and $q$.
- 5 repetitions per worker count, reporting median times, speedup $T_1 / T_p$, and efficiency.
- Numerical agreement verified between serial and parallel runs with max temperature difference $\le 1.0 \times 10^{-8\ \circ}\text{C}$.

### 4. Embedded Hardware Simulation (Task E)
- Architecture design for STM32 MCU (3.3V), Xilinx Artix-7 FPGA (1.8V bank / 1.0V core with TI TXS0108E bidirectional level shifting), and SEGGER J-Link / ST-Link JTAG probe.
- Clear rationale for why JTAG is a dedicated Test Access Port (TAP) controller, not an interchangeable compute board.
- C++ state machines simulate device discovery, connection, telemetry streaming, fault injection (timeout), and hardware reset recovery.

### 5. Handwritten Backpropagation & Gradient Check (Task F)
- Single regression sample $x=1, y=2$, architecture $h = \tanh(w x + b), \hat{y} = v h + c, J = \frac{1}{2}(\hat{y} - y)^2$.
- Manual chain-rule analytical gradients verified against central finite differences ($\epsilon = 1.0 \times 10^{-6}$):
  - $\frac{\partial J}{\partial v} = -0.710682$, $\frac{\partial J}{\partial c} = -1.537883$, $\frac{\partial J}{\partial w} = -1.209465$, $\frac{\partial J}{\partial b} = -1.209465$.
  - Absolute numerical difference $< 1.2 \times 10^{-10}$ (exceeds tolerance $\le 10^{-5}$).
- 100-step simultaneous gradient descent training decreases loss monotonically from $1.1825$ to $1.7 \times 10^{-20}$.

---

## 🛠️ Source Build & Test Instructions (Alternative to One-Click)

### C++ Backend Compilation (GCC UCRT64 / MinGW):
```powershell
g++ -std=c++17 -O3 -static-libgcc -static-libstdc++ -Ibackend/include `
    backend/src/thermal_fea.cpp backend/src/geometry_parser.cpp `
    backend/src/performance_benchmark.cpp backend/src/hardware_mock.cpp `
    backend/src/neural_net.cpp backend/src/server_main.cpp `
    -o backend/workbench_server.exe -lws2_32 -pthread
```

### Running C++ Automated Test Suite:
```powershell
g++ -std=c++17 -O3 -Ibackend/include `
    backend/src/thermal_fea.cpp backend/src/geometry_parser.cpp `
    backend/src/performance_benchmark.cpp backend/src/hardware_mock.cpp `
    backend/src/neural_net.cpp backend/tests/unit_tests.cpp `
    -o backend/tests/run_tests.exe -pthread

./backend/tests/run_tests.exe
```

### CMake Build (Standard):
```bash
cmake -B build
cmake --build build --config Release
ctest --test-dir build --output-on-failure
```

### Frontend Build:
```bash
cd frontend
npm install
npm run build
```

---

## 🤖 AI-Use Log & Independent Engineering Judgement

In accordance with Section 8 of the assessment brief, AI assistance was leveraged for technical design exploration and boilerplate acceleration. The following log records representative interactions and critical engineering interventions:

1. **Header Macro Collision in Win32:** An AI model suggested including `<windows.h>` directly in `server_main.cpp`. Doing so caused a severe compiler error because `windows.h` defines a macro `#define ERROR_TIMEOUT 1460L`, which collided with the C++ `enum class DeviceStatus { ERROR_TIMEOUT }`. **Engineer Action:** Rejected the suggestion, namespaced enum entries with `DEV_ERROR_TIMEOUT`, and isolated platform includes with `#undef ERROR_TIMEOUT`.
2. **Nodal Superconvergence in 1D FEA:** Initial AI prompts suggested evaluating FEA mesh convergence using nodal errors $|T_{\text{FE}}(x_i) - T_{\text{exact}}(x_i)|$. However, for a 1D uniform rod Poisson equation with linear elements, nodal values are exact ($<10^{-12\ \circ}\text{C}$), falsely implying zero convergence rate. **Engineer Action:** Reformulated error evaluation using linear FE shape function interpolation at element midpoints $x_{\text{mid}} = \frac{x_e + x_{e+1}}{2}$, proving the true physical $O(h^2)$ quadratic rate.

---

## 📜 Ownership Statement & Third-Party Licences

- **Original Work:** Numerical FEA matrix assembly, Gaussian elimination, midpoint convergence evaluation, CAD STL & ANSYS CSV streaming validation parsers, bounded thread pool benchmarking, embedded state machine mocks, and handwritten backpropagation derivations are original engineering implementations.
- **Open-Source Reused Headers:**
  - `cpp-httplib` (MIT License) - Yuji Hirose (Single-header C++ HTTP server).
  - `nlohmann/json` (MIT License) - Niels Lohmann (Single-header C++ JSON serialization).
- **Frontend Open-Source Libraries:**
  - React (MIT License), Three.js (MIT License), Recharts (MIT License), Tailwind CSS (MIT License), Lucide React (ISC License).
- **Synthetic Data:** All geometries and ANSYS CSV data are self-created synthetic datasets under open CC0/MIT licensing.
