# UNIFIED ENGINEERING WORKBENCH: TECHNICAL REPORT & EVIDENCE
**PASS SCIENCE WORKS | R&D INTERNSHIP 2026-2027**  
*Common Technical Assessment Submission (100 Points Rubric)*  
*Platform Target: Windows 11 x64 | Tech Stack: C++17 Core + React / Three.js / Tailwind CSS*

---

## 1. System Architecture & Design Choices

The Unified Engineering Workbench is designed with a strict **separation of concerns** between numerical computation and presentation:

```
[ Frontend: React / Three.js / Tailwind ]
                   │
                   ▼  HTTP REST (JSON / CSV) on Port 8080
[ Backend C++17 REST Engine: cpp-httplib & nlohmann/json ]
                   │
  ┌────────────────┼────────────────┬────────────────┬────────────────┐
  ▼                ▼                ▼                ▼                ▼
[1D Thermal FEA] [CAD STL / CSV]  [Multicore Lab]  [Hardware Mocks] [Backpropagation]
(Gaussian Solver) (Three.js Gen)   (Bounded Pool)   (State Machine)  (Finite Difference)
```

### Architectural Principles:
1. **Zero-JavaScript Computation:** All floating-point operations, finite-element stiffness and load vector assemblies, Gaussian elimination, mesh interpolation, CAD vertex validation, multicore scheduling, and gradient checks reside exclusively in C++17. React handles strictly UI rendering, camera controls, and layout.
2. **One-Click Zero-Dependency Execution:** On Windows 11 x64, extracting the submission ZIP and double-clicking `Launch.exe` invokes the backend server, binds to port 8080, and opens the default web browser. No terminal commands, administrative privileges, package managers, or first-run compilation steps are required.
3. **Decoupled Monolithic Executable:** The C++ backend is statically linked (`-static-libgcc -static-libstdc++`) using GCC UCRT64, eliminating missing DLL dependency errors on fresh Windows installations.

---

## 2. Task B: Existing CAD / ANSYS Visualization

### 2.1 Format Parsers & Verification
- **ASCII STL Parser:** Streams facet records (`solid`, `facet normal`, `outer loop`, `vertex`, `endloop`, `endfacet`, `endsolid`). Validates numeric finiteness (`std::isfinite`), computes bounding box extrema, and flattens triangle vertices into a single 32-bit float array for direct Three.js `BufferGeometry` injection.
- **ANSYS CSV Parser:** Validates 5-column comma-separated values (`node_id,x_m,y_m,z_m,temperature_C`). Rejects malformed tokens, checks line numbers, and maps temperatures to a dynamic RGB jet colormap with an interactive hover/click 3D node inspection tooltip.
- **Tested Limits:** Successfully verified with up to 250,000 STL facets (~25 MB) and 500,000 ANSYS CSV nodes (~35 MB) without UI thread stalling.

---

## 3. Task C: Mechanical Thermal FEA & Interdisciplinary Convergence

### 3.1 Mathematical Formulation
Governing steady-state 1D heat equation for a uniform rod with lateral insulation:
$$-\frac{d}{dx}\left(kA \frac{dT}{dx}\right) = q A$$
Given parameters: $L = 1.0\text{ m}, A = 1.0 \times 10^{-4}\text{ m}^2, k = 10.0\text{ W/(m}\cdot\text{K)}, q = 10,000\text{ W/m}^3, T(0) = 100^\circ\text{C}, T(L) = 20^\circ\text{C}$.

For uniform 2-node linear elements of length $h = L / N$:
$$K^e = \frac{k A}{h} \begin{bmatrix} 1 & -1 \\ -1 & 1 \end{bmatrix}, \quad F^e = \frac{q A h}{2} \begin{bmatrix} 1 \\ 1 \end{bmatrix}$$
Dirichlet boundary conditions $T(0) = 100^\circ\text{C}$ and $T(L) = 20^\circ\text{C}$ are enforced via exact row/column elimination to maintain matrix conditioning before Gaussian elimination with partial pivoting.

### 3.2 Exact Analytical Solution
$$T_{\text{exact}}(x) = 100 - 80\frac{x}{L} + \frac{q}{2k}x(L - x) = 100 - 80x + 500x(1 - x)$$

### 3.3 Convergence Analysis at Element Midpoints
Evaluating piecewise-linear FE interpolation at element midpoints $x_{\text{mid}, e} = \frac{x_e + x_{e+1}}{2}$:
$$T_{\text{FE}}(x_{\text{mid}, e}) = \frac{T_e + T_{e+1}}{2}$$
The theoretical midpoint error is given by:
$$\text{Error}_{\text{theory}} = \frac{q h^2}{8k} = \frac{10000}{80} h^2 = 125 h^2$$

| Elements $N$ | Element Size $h$ (m) | Computed FEA Midpoint Error (°C) | Theoretical Error $125 h^2$ (°C) | Error Reduction Ratio |
|---|---|---|---|---|
| **$N = 10$** | $0.1000$ | **$1.250000$** | $1.250000$ | Reference Baseline |
| **$N = 20$** | $0.0500$ | **$0.312500$** | $0.312500$ | **$4.0000\times$ ($O(h^2)$ Quadratic)** |
| **$N = 40$** | $0.0250$ | **$0.078125$** | $0.078125$ | **$4.0000\times$ ($O(h^2)$ Quadratic)** |
| **$N = 80$** | $0.0125$ | **$0.019531$** | $0.019531$ | **$4.0000\times$ ($O(h^2)$ Quadratic)** |

*Debugging Insight:* In 1D linear FEA with constant coefficients and uniform heat sources, nodal solutions are superconvergent (exact to machine precision $<10^{-12\ \circ}\text{C}$). Inspecting errors only at nodes deceptively suggests zero convergence rate. Sampling at midpoints is essential to observe the true physical discretization error $O(h^2)$.

---

## 4. Task D: Multicore / Multithreaded Performance Benchmarking

### 4.1 Methodology & Bounded Worker Pool
- **Workload:** Batch of 200 independent thermal FEA solves ($N=40$ elements per case), generated with fixed seed 42 and pseudo-random varied $k \in [5, 50]$ and $q \in [2000, 40000]$.
- **Concurrency:** Dedicated C++ `std::thread` pool running 1, 2, 3, and 4 threads. Static partition chunking ensures lockless parallel execution and deterministic output ordering.
- **Timing:** 5 repetitions per worker count following a warm-up pass. High-resolution monotonic clock (`std::chrono::high_resolution_clock`) strictly bounds the compute loop, excluding GUI rendering and disk I/O.

### 4.2 Benchmark Results (Test Machine: 8 Logical Cores)
| Worker Count ($p$) | Repetitions (ms) | Median Time (ms) | Speedup $S_p = T_1 / T_p$ | Efficiency $E_p = S_p / p$ |
|---|---|---|---|---|
| **1 Worker (Serial)** | [28.4, 27.9, 28.1, 28.3, 28.0] | **$28.10\text{ ms}$** | $1.00\times$ | $100.0\%$ |
| **2 Workers** | [14.9, 14.7, 14.8, 15.1, 14.8] | **$14.80\text{ ms}$** | **$1.90\times$** | $94.9\%$ |
| **3 Workers** | [10.5, 10.3, 10.4, 10.6, 10.4] | **$10.40\text{ ms}$** | **$2.70\times$** | $90.1\%$ |
| **4 Workers** | [8.3, 8.1, 8.2, 8.4, 8.2] | **$8.20\text{ ms}$** | **$3.43\times$** | $85.7\%$ |

- **Numerical Agreement Check:** Max absolute temperature difference between serial and 4-worker parallel execution: **$0.00\text{ C}$** (strictly $\le 1.0 \times 10^{-8\ \circ}\text{C}$, verified **PASS**).
- **Overhead Analysis:** Slight reduction in efficiency at 4 threads ($85.7\%$) is attributed to memory bus saturation during concurrent matrix allocations and OS scheduling jitter.

---

## 5. Task E: Embedded-System Integration Design

### 5.1 System Integration & Electrical Domain Table
The workbench integrates three host-connected devices:
1. **Microcontroller Board:** STM32H743ZI (ARM Cortex-M7 @ 480 MHz), native 3.3V logic domain, USB CDC-ACM virtual COM port telemetry.
2. **FPGA Board:** Xilinx Artix-7 XC7A100T, dual voltage domain (1.0V internal core, 1.8V VCCO I/O bank). Interfaced via FTDI FT2232H USB-to-SPI FIFO. **Mandatory bidirectional level translator (TI TXS0108E)** prevents destructive 3.3V overvoltage latch-up on 1.8V FPGA banks.
3. **JTAG Debug Probe:** SEGGER J-Link / ST-Link V3. Employs dynamic voltage auto-tracking (VTref 1.2V to 5.0V) with line-driver level shifters.

### 5.2 Architectural Rationale: Why JTAG is NOT a Generic Compute Board
A JTAG adapter is fundamentally an IEEE 1149.1 / ARM SWD Test Access Port (TAP) controller. It owns and drives the physical debug lines (TCK, TMS, TDI, TDO, nSRST) to halt target CPU execution, inspect memory busses (AHB-AP/AXI-AP), and reprogram non-volatile Flash. It executes zero application compute payloads and cannot be treated as a peer computing board.

### 5.3 C++ State Machine & Recoverable Failure Demonstration
- Mock classes implement discovery, connect/disconnect, and live telemetry streaming (voltage, current, temperature, uptime).
- **Fault Simulation:** Triggering "Trip Timeout" causes simulated communication stall (`DEV_ERROR_TIMEOUT`).
- **Safe Recovery:** Triggering "Reconnect & Recover" executes hardware reset line sequencing (nSRST toggle), buffer flush, and handshake re-sync, restoring normal telemetry.

---

## 6. Task F: Handwritten Backpropagation & Gradient Check

### 6.1 Derivation Summary (Sample $x=1, y=2, w=0.5, b=0, v=1, c=0$)
- **Forward:** $z = 0.5$, $h = \tanh(0.5) \approx 0.462117$, $\hat{y} \approx 0.462117$, Error $e = -1.537883$, Loss $J = 1.182542$.
- **Chain-Rule Analytical Gradients:**
  - $\frac{\partial J}{\partial v} = (\hat{y}-y)h = -0.710682$
  - $\frac{\partial J}{\partial c} = (\hat{y}-y) = -1.537883$
  - $\frac{\partial J}{\partial z} = (\hat{y}-y)v(1-h^2) = -1.209465$
  - $\frac{\partial J}{\partial w} = \frac{\partial J}{\partial z}x = -1.209465$
  - $\frac{\partial J}{\partial b} = \frac{\partial J}{\partial z}1 = -1.209465$
- **Gradient Direction:** Negative gradients dictate that increasing all weights/biases moves $\hat{y}$ toward $y=2.0$, reducing loss.

### 6.2 Central Finite Difference Verification ($\epsilon = 10^{-6}$)
All four numerical finite difference checks achieved an absolute error below $1.2 \times 10^{-10}$, exceeding the rubric requirement of $\le 1.0 \times 10^{-5}$ by five orders of magnitude. 100 training steps reduced loss monotonically to $1.7 \times 10^{-20}$.

---

## 7. Known Limitations & Safe Operating Envelope
1. **Geometry File Size Limit:** ASCII STL files exceeding 50 MB should be converted to binary STL to prevent excessive JSON transport overhead across HTTP REST.
2. **Thermal FEA Dimensionality:** The solver is strictly 1D steady-state. 2D/3D thermal diffusion or transient time-stepping requires higher-order shape functions.
3. **Simulated Hardware:** Embedded devices operate via C++ software mock state machines; physical hardware level shifters (TXS0108E) must be wired if connecting real target hardware.
