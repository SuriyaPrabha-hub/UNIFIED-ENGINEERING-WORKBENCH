#include <iostream>
#include <cassert>
#include <cmath>
#include <vector>
#include <string>
#include "thermal_fea.hpp"
#include "geometry_parser.hpp"
#include "performance_benchmark.hpp"
#include "hardware_mock.hpp"
#include "neural_net.hpp"

using namespace workbench;

void testThermalFEA() {
    std::cout << "[TEST] 1. Thermal FEA Solver & Convergence..." << std::endl;
    ThermalFEAParams p;
    p.L = 1.0;
    p.A = 1.0e-4;
    p.k = 10.0;
    p.q = 10000.0;
    p.T_0 = 100.0;
    p.T_L = 20.0;

    // Test N = 10, 20, 40, 80
    auto convergence = ThermalSolver::runConvergenceStudy(p);
    assert(convergence.solutions.size() == 4);
    assert(convergence.N_values == std::vector<int>({10, 20, 40, 80}));

    // Expected midpoint errors: q*h^2 / (8*k) = 10000 * h^2 / 80 = 125 * h^2
    // N=10: h=0.100 -> error = 1.250000 C
    // N=20: h=0.050 -> error = 0.312500 C
    // N=40: h=0.025 -> error = 0.078125 C
    // N=80: h=0.0125-> error = 0.019531 C
    double expected_errs[] = {1.25, 0.3125, 0.078125, 0.01953125};

    for (size_t i = 0; i < 4; ++i) {
        const auto& sol = convergence.solutions[i];
        
        // Check boundary conditions
        assert(std::abs(sol.node_T_fe_C.front() - 100.0) < 1e-10);
        assert(std::abs(sol.node_T_fe_C.back() - 20.0) < 1e-10);

        // Check nodal superconvergence (nodal values are exact)
        assert(sol.max_nodal_error_C < 1e-10);

        // Check midpoint error matches theoretical quadratic convergence
        double diff_err = std::abs(sol.max_midpoint_error_C - expected_errs[i]);
        assert(diff_err < 1e-4);
        std::cout << "  N=" << convergence.N_values[i] << " (h=" << sol.element_length_h 
                  << " m): Max Midpoint Error = " << sol.max_midpoint_error_C 
                  << " C (Expected: " << expected_errs[i] << " C) -> PASSED" << std::endl;
    }

    // Negative tests: Invalid inputs
    bool caught_invalid_k = false;
    try {
        ThermalFEAParams bad_p = p;
        bad_p.k = -5.0;
        ThermalSolver::solve(bad_p);
    } catch (const std::invalid_argument&) {
        caught_invalid_k = true;
    }
    assert(caught_invalid_k);
    std::cout << "  Negative input rejection (k <= 0) -> PASSED" << std::endl;
}

void testGeometryParsers() {
    std::cout << "\n[TEST] 2. CAD STL & ANSYS CSV Parsers..." << std::endl;

    // Test 2.1: ASCII STL parsing (Benchmark Rod)
    std::string sample_stl = GeometryParser::generateSyntheticSampleSTL();
    STLGeometry geom = GeometryParser::parseSTL(sample_stl);
    assert(geom.triangle_count > 0);
    assert(geom.positions.size() == static_cast<size_t>(geom.triangle_count * 9));
    assert(geom.bbox.diag_size > 0.0);
    std::cout << "  ASCII STL Parser: " << geom.triangle_count << " triangles parsed, BBox valid -> PASSED" << std::endl;

    // Test 2.2: Binary STL parsing
    // Build a minimal binary STL buffer: 80 bytes header + 4 bytes count (1 triangle) + 50 bytes triangle
    std::vector<char> bin_stl(84 + 50, 0);
    std::string header_text = "Binary STL Unit Test";
    std::memcpy(bin_stl.data(), header_text.c_str(), header_text.size());
    uint32_t one_tri = 1;
    std::memcpy(bin_stl.data() + 80, &one_tri, 4);
    // Triangle at offset 84: Normal(0,0,1), v1(0,0,0), v2(1,0,0), v3(0,1,0), attr(0)
    float tri_data[12] = {0.0f, 0.0f, 1.0f, 0.0f, 0.0f, 0.0f, 1.0f, 0.0f, 0.0f, 0.0f, 1.0f, 0.0f};
    std::memcpy(bin_stl.data() + 84, tri_data, 48);
    std::string bin_stl_str(bin_stl.data(), bin_stl.size());
    STLGeometry bin_geom = GeometryParser::parseSTL(bin_stl_str);
    assert(bin_geom.triangle_count == 1);
    assert(bin_geom.validation_status == "VALID_BINARY_STL");
    std::cout << "  Binary STL Parser: Successfully decoded IEEE 754 binary triangles -> PASSED" << std::endl;

    // Test 2.3: Formula-E Electric Hypercar Power Unit STL (SiC Inverter + Axial-Flux Motor)
    std::string pe_stl = GeometryParser::generateFormulaEPowerUnitSTL();
    STLGeometry pe_geom = GeometryParser::parseSTL(pe_stl);
    assert(pe_geom.triangle_count > 200);
    assert(pe_geom.bbox.diag_size > 0.5); // Powertrain package dimensions
    std::cout << "  Formula-E Hypercar Power Unit STL: " << pe_geom.triangle_count 
              << " triangles, BBox Diag: " << pe_geom.bbox.diag_size << " m -> PASSED" << std::endl;

    // Test 2.4: Standard ANSYS CSV parsing
    std::string sample_csv = GeometryParser::generateSyntheticSampleAnsysCSV();
    AnsysPointCloud cloud = GeometryParser::parseAnsysCSV(sample_csv);
    assert(cloud.node_count > 0);
    assert(cloud.min_temp_C > 0.0 && cloud.max_temp_C > cloud.min_temp_C);
    std::cout << "  ANSYS CSV Parser: " << cloud.node_count << " nodes parsed (Temp: " 
              << cloud.min_temp_C << " C to " << cloud.max_temp_C << " C) -> PASSED" << std::endl;

    // Test 2.5: Universal CSV parsing (Semicolon delimiter + mm coordinates + custom headers)
    std::string custom_csv = 
        "# Semicolon-delimited export from CAD/FEA\n"
        "Point_ID;X [mm];Y [mm];Z [mm];Temperature (C)\n"
        "101;0.0;0.0;0.0;85.5\n"
        "102;100.0;50.0;20.0;65.2\n"
        "103;200.0;100.0;40.0;45.0\n";
    AnsysPointCloud custom_cloud = GeometryParser::parseAnsysCSV(custom_csv);
    assert(custom_cloud.node_count == 3);
    assert(std::abs(custom_cloud.nodes[1].x_m - 0.1) < 1e-4); // 100 mm auto-scaled to 0.1 m
    std::cout << "  Universal CSV (Semicolon + mm auto-scaling): 3 nodes converted to SI meters -> PASSED" << std::endl;

    // Test 2.6: Formula-E Launch Mode ANSYS FEA Cloud (SiC Junctions + Stator Windings)
    std::string pe_csv = GeometryParser::generateFormulaEAnsysCSV();
    AnsysPointCloud pe_cloud = GeometryParser::parseAnsysCSV(pe_csv);
    assert(pe_cloud.node_count > 100);
    assert(pe_cloud.max_temp_C > 115.0); // Extreme SiC MOSFET launch junction hotspot
    assert(pe_cloud.min_temp_C < 28.0);  // Ambient chassis mounts
    std::cout << "  Formula-E Inverter/Motor FEA Cloud: " << pe_cloud.node_count << " nodes (Range: " 
              << pe_cloud.min_temp_C << " C to " << pe_cloud.max_temp_C << " C) -> PASSED" << std::endl;

    // Negative tests: Empty file rejection
    bool caught_empty_stl = false;
    try {
        GeometryParser::parseAsciiSTL("   \n\t  ");
    } catch (const std::invalid_argument&) {
        caught_empty_stl = true;
    }
    assert(caught_empty_stl);

    bool caught_malformed_csv = false;
    try {
        GeometryParser::parseAnsysCSV("node_id,x_m,y_m,z_m,temperature_C\n1,0.0,0.0,not_a_number,100.0\n");
    } catch (const std::exception&) {
        caught_malformed_csv = true;
    }
    assert(caught_malformed_csv);
    std::cout << "  Empty and malformed data rejection -> PASSED" << std::endl;
}

void testPerformanceBenchmark() {
    std::cout << "\n[TEST] 3. Multicore Performance Benchmark & Agreement..." << std::endl;
    auto cases = PerformanceBenchmark::generateBatch(30, 20, 12345);
    assert(cases.size() == 30);

    // Run serial (1 thread)
    auto serial_sol = PerformanceBenchmark::runBatch(cases, 1);
    assert(serial_sol.size() == 30);

    // Run parallel (2 threads)
    auto parallel_sol = PerformanceBenchmark::runBatch(cases, 2);
    assert(parallel_sol.size() == 30);

    // Check numerical agreement <= 1e-8 C across all nodes and cases
    double max_diff = 0.0;
    for (size_t c = 0; c < cases.size(); ++c) {
        for (size_t n = 0; n < serial_sol[c].node_T_fe_C.size(); ++n) {
            double d = std::abs(serial_sol[c].node_T_fe_C[n] - parallel_sol[c].node_T_fe_C[n]);
            if (d > max_diff) max_diff = d;
        }
    }
    std::cout << "  Serial vs Parallel max temperature difference: " << max_diff << " C" << std::endl;
    assert(max_diff <= 1.0e-8);
    std::cout << "  Numerical agreement check (<= 1e-8 C) -> PASSED" << std::endl;
}

void testHardwareMock() {
    std::cout << "\n[TEST] 4. Embedded Hardware Simulation & Error Recovery..." << std::endl;
    HardwareMockManager mgr;
    auto devs = mgr.discoverDevices();
    assert(devs.size() == 3);

    // Test MCU connect
    bool ok_conn = mgr.connectDevice("dev_mcu_01");
    assert(ok_conn);
    auto telem = mgr.pollTelemetry("dev_mcu_01");
    assert(telem.supply_voltage_V > 3.0);
    std::cout << "  Device connection and telemetry poll -> PASSED" << std::endl;

    // Test timeout injection and recovery
    mgr.injectFailure("dev_mcu_01", "TIMEOUT");
    auto devs_after_fail = mgr.discoverDevices();
    assert(devs_after_fail[0].status == DeviceStatus::DEV_ERROR_TIMEOUT);
    std::cout << "  Timeout failure injection -> PASSED" << std::endl;

    bool ok_rec = mgr.recoverDevice("dev_mcu_01");
    assert(ok_rec);
    auto devs_after_rec = mgr.discoverDevices();
    assert(devs_after_rec[0].status == DeviceStatus::DEV_CONNECTED);
    std::cout << "  Device failure recovery -> PASSED" << std::endl;
}

void testBackpropagation() {
    std::cout << "\n[TEST] 5. Backpropagation Math & Finite Difference Gradient Check..." << std::endl;
    auto sim = NeuralNetEngine::runSimulation(0.1, 100);

    // Initial forward pass checks
    assert(std::abs(sim.initial_forward.z - 0.5) < 1e-10);
    assert(std::abs(sim.initial_forward.h - std::tanh(0.5)) < 1e-10);
    assert(std::abs(sim.initial_forward.y_hat - std::tanh(0.5)) < 1e-10);
    assert(std::abs(sim.initial_forward.loss_J - 1.1825418) < 1e-4);
    std::cout << "  Initial forward pass (Loss = " << sim.initial_forward.loss_J << ") -> PASSED" << std::endl;

    // Check analytical gradients match handwritten derivation
    assert(std::abs(sim.initial_analytical_grads.dJ_dv - (-0.710682)) < 1e-4);
    assert(std::abs(sim.initial_analytical_grads.dJ_dc - (-1.537883)) < 1e-4);
    assert(std::abs(sim.initial_analytical_grads.dJ_dw - (-1.209465)) < 1e-4);
    assert(std::abs(sim.initial_analytical_grads.dJ_db - (-1.209465)) < 1e-4);
    std::cout << "  Analytical chain-rule gradients verified against handwritten derivation -> PASSED" << std::endl;

    // Gradient check: Finite difference vs analytical <= 1e-5
    assert(sim.all_grad_checks_passed);
    for (const auto& chk : sim.gradient_checks) {
        std::cout << "    Param " << chk.param_name << ": Analytical=" << chk.analytical_grad 
                  << ", Numerical=" << chk.numerical_grad << ", Abs Error=" << chk.abs_error 
                  << " (<= 1e-5) -> PASSED" << std::endl;
    }

    // 100 training steps loss reduction
    assert(sim.final_loss < sim.initial_forward.loss_J);
    assert(sim.final_loss < 0.01); // Converges close to 0
    std::cout << "  100 Training steps: Initial Loss=" << sim.initial_forward.loss_J 
              << " -> Final Loss=" << sim.final_loss << " (Prediction=" << sim.final_prediction 
              << ", Target=2.0) -> PASSED" << std::endl;
}

int main() {
    std::cout << "========================================================\n";
    std::cout << "  UNIFIED ENGINEERING WORKBENCH - C++ VERIFICATION SUITE \n";
    std::cout << "========================================================\n\n";

    try {
        testThermalFEA();
        testGeometryParsers();
        testPerformanceBenchmark();
        testHardwareMock();
        testBackpropagation();

        std::cout << "\n========================================================\n";
        std::cout << "  ALL C++ NUMERICAL & SYSTEM TESTS PASSED SUCCESSFULLY!  \n";
        std::cout << "========================================================\n";
        return 0;
    } catch (const std::exception& e) {
        std::cerr << "\n[FATAL TEST FAILURE]: " << e.what() << std::endl;
        return 1;
    }
}
