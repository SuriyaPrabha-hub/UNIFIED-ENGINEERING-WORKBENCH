#pragma once
#include <vector>
#include <string>
#include <cmath>
#include "json.hpp"

namespace workbench {

struct ThermalFEAParams {
    double L = 1.0;            // Length of rod in meters (1.0 m)
    double A = 1.0e-4;         // Cross-sectional area in m^2 (1e-4 m^2)
    double k = 10.0;           // Thermal conductivity in W/(m*K)
    double q = 10000.0;        // Volumetric heat generation in W/m^3
    double T_0 = 100.0;        // Boundary temperature at x = 0 (deg C)
    double T_L = 20.0;         // Boundary temperature at x = L (deg C)
    int num_elements = 10;     // Number of uniform elements (N = 10, 20, 40, 80)
};

struct ElementMidpointResult {
    int element_id;
    double x_mid_m;
    double T_fe_C;
    double T_exact_C;
    double abs_error_C;
    double rel_error_pct;
};

struct ThermalFESolution {
    ThermalFEAParams params;
    std::vector<double> node_x_m;
    std::vector<double> node_T_fe_C;
    std::vector<double> node_T_exact_C;
    std::vector<double> node_abs_error_C;
    std::vector<ElementMidpointResult> midpoints;
    double max_midpoint_error_C = 0.0;
    double max_nodal_error_C = 0.0;
    double element_length_h = 0.0;

    nlohmann::json toJson() const;
    std::string toCsv() const;
};

struct ConvergenceResult {
    std::vector<int> N_values;
    std::vector<double> h_values;
    std::vector<double> max_errors;
    std::vector<ThermalFESolution> solutions;

    nlohmann::json toJson() const;
};

class ThermalSolver {
public:
    static double exactTemperature(double x, const ThermalFEAParams& p);
    
    // Solves the 1D FEA problem for given parameters
    static ThermalFESolution solve(const ThermalFEAParams& params);

    // Runs standard convergence study for N = 10, 20, 40, 80
    static ConvergenceResult runConvergenceStudy(const ThermalFEAParams& base_params = ThermalFEAParams{});
    
private:
    // Gaussian elimination with partial pivoting for Ax = b
    static std::vector<double> solveLinearSystem(std::vector<std::vector<double>>& A, std::vector<double>& b);
};

} // namespace workbench
