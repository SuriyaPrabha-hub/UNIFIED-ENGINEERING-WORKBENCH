#include "thermal_fea.hpp"
#include <sstream>
#include <iomanip>
#include <algorithm>
#include <stdexcept>

namespace workbench {

double ThermalSolver::exactTemperature(double x, const ThermalFEAParams& p) {
    // T_exact(x) = T_0 - (T_0 - T_L)*x/L + [q / (2k)] * x * (L - x)
    double linear_part = p.T_0 - (p.T_0 - p.T_L) * (x / p.L);
    double quadratic_part = (p.q / (2.0 * p.k)) * x * (p.L - x);
    return linear_part + quadratic_part;
}

std::vector<double> ThermalSolver::solveLinearSystem(std::vector<std::vector<double>>& A, std::vector<double>& b) {
    int n = static_cast<int>(b.size());
    
    // Gaussian Elimination with Partial Pivoting
    for (int i = 0; i < n; ++i) {
        // Find pivot
        int max_row = i;
        double max_val = std::abs(A[i][i]);
        for (int k = i + 1; k < n; ++k) {
            if (std::abs(A[k][i]) > max_val) {
                max_val = std::abs(A[k][i]);
                max_row = k;
            }
        }
        
        if (max_val < 1.0e-14) {
            throw std::runtime_error("Singular matrix encountered in Gaussian elimination.");
        }
        
        // Swap rows in A and b
        if (max_row != i) {
            std::swap(A[i], A[max_row]);
            std::swap(b[i], b[max_row]);
        }
        
        // Eliminate column entries below pivot
        for (int k = i + 1; k < n; ++k) {
            double factor = A[k][i] / A[i][i];
            b[k] -= factor * b[i];
            for (int j = i; j < n; ++j) {
                A[k][j] -= factor * A[i][j];
            }
        }
    }
    
    // Back substitution
    std::vector<double> x(n, 0.0);
    for (int i = n - 1; i >= 0; --i) {
        double sum = b[i];
        for (int j = i + 1; j < n; ++j) {
            sum -= A[i][j] * x[j];
        }
        x[i] = sum / A[i][i];
    }
    
    return x;
}

ThermalFESolution ThermalSolver::solve(const ThermalFEAParams& p) {
    if (p.num_elements < 1) {
        throw std::invalid_argument("Number of elements must be >= 1");
    }
    if (p.k <= 0.0) {
        throw std::invalid_argument("Thermal conductivity k must be positive");
    }
    if (p.L <= 0.0) {
        throw std::invalid_argument("Length L must be positive");
    }
    if (p.A <= 0.0) {
        throw std::invalid_argument("Cross-sectional area A must be positive");
    }

    int N = p.num_elements;
    int num_nodes = N + 1;
    double h = p.L / static_cast<double>(N);

    // Global stiffness matrix K and load vector F
    std::vector<std::vector<double>> K(num_nodes, std::vector<double>(num_nodes, 0.0));
    std::vector<double> F(num_nodes, 0.0);

    // Assemble element contributions
    // Element stiffness: ke = (k*A/h) * [ 1, -1; -1, 1 ]
    // Element load: fe = (q*A*h/2) * [ 1; 1 ]
    double ke_val = (p.k * p.A) / h;
    double fe_val = (p.q * p.A * h) / 2.0;

    for (int e = 0; e < N; ++e) {
        int n1 = e;
        int n2 = e + 1;

        K[n1][n1] += ke_val;
        K[n1][n2] -= ke_val;
        K[n2][n1] -= ke_val;
        K[n2][n2] += ke_val;

        F[n1] += fe_val;
        F[n2] += fe_val;
    }

    // Apply Dirichlet Boundary Conditions: T(0) = T_0, T(L) = T_L
    // Node 0
    for (int i = 1; i < num_nodes; ++i) {
        F[i] -= K[i][0] * p.T_0;
        K[i][0] = 0.0;
        K[0][i] = 0.0;
    }
    K[0][0] = 1.0;
    F[0] = p.T_0;

    // Node N (last node)
    int last = num_nodes - 1;
    for (int i = 0; i < last; ++i) {
        F[i] -= K[i][last] * p.T_L;
        K[i][last] = 0.0;
        K[last][i] = 0.0;
    }
    K[last][last] = 1.0;
    F[last] = p.T_L;

    // Solve system
    std::vector<double> T_fe = solveLinearSystem(K, F);

    // Prepare solution output
    ThermalFESolution sol;
    sol.params = p;
    sol.element_length_h = h;
    sol.node_x_m.resize(num_nodes);
    sol.node_T_fe_C = T_fe;
    sol.node_T_exact_C.resize(num_nodes);
    sol.node_abs_error_C.resize(num_nodes);

    sol.max_nodal_error_C = 0.0;
    for (int i = 0; i < num_nodes; ++i) {
        double x = i * h;
        sol.node_x_m[i] = x;
        double exact = exactTemperature(x, p);
        sol.node_T_exact_C[i] = exact;
        double err = std::abs(T_fe[i] - exact);
        sol.node_abs_error_C[i] = err;
        if (err > sol.max_nodal_error_C) {
            sol.max_nodal_error_C = err;
        }
    }

    // Evaluate midpoint values using linear FE interpolation
    sol.midpoints.resize(N);
    sol.max_midpoint_error_C = 0.0;
    for (int e = 0; e < N; ++e) {
        double x_mid = (sol.node_x_m[e] + sol.node_x_m[e + 1]) / 2.0;
        double T_fe_mid = (sol.node_T_fe_C[e] + sol.node_T_fe_C[e + 1]) / 2.0;
        double T_exact_mid = exactTemperature(x_mid, p);
        double err = std::abs(T_fe_mid - T_exact_mid);

        ElementMidpointResult mid;
        mid.element_id = e + 1;
        mid.x_mid_m = x_mid;
        mid.T_fe_C = T_fe_mid;
        mid.T_exact_C = T_exact_mid;
        mid.abs_error_C = err;
        mid.rel_error_pct = (T_exact_mid != 0.0) ? (err / std::abs(T_exact_mid)) * 100.0 : 0.0;

        sol.midpoints[e] = mid;
        if (err > sol.max_midpoint_error_C) {
            sol.max_midpoint_error_C = err;
        }
    }

    return sol;
}

ConvergenceResult ThermalSolver::runConvergenceStudy(const ThermalFEAParams& base_params) {
    ConvergenceResult res;
    res.N_values = {10, 20, 40, 80};
    for (int N : res.N_values) {
        ThermalFEAParams p = base_params;
        p.num_elements = N;
        ThermalFESolution sol = solve(p);
        res.h_values.push_back(sol.element_length_h);
        res.max_errors.push_back(sol.max_midpoint_error_C);
        res.solutions.push_back(sol);
    }
    return res;
}

nlohmann::json ThermalFESolution::toJson() const {
    nlohmann::json j;
    j["params"] = {
        {"L", params.L},
        {"A", params.A},
        {"k", params.k},
        {"q", params.q},
        {"T_0", params.T_0},
        {"T_L", params.T_L},
        {"num_elements", params.num_elements}
    };
    j["element_length_h"] = element_length_h;
    j["max_midpoint_error_C"] = max_midpoint_error_C;
    j["max_nodal_error_C"] = max_nodal_error_C;

    nlohmann::json nodes_arr = nlohmann::json::array();
    for (size_t i = 0; i < node_x_m.size(); ++i) {
        nodes_arr.push_back({
            {"node_id", static_cast<int>(i)},
            {"x_m", node_x_m[i]},
            {"T_fe_C", node_T_fe_C[i]},
            {"T_exact_C", node_T_exact_C[i]},
            {"abs_error_C", node_abs_error_C[i]}
        });
    }
    j["nodes"] = nodes_arr;

    nlohmann::json midpoints_arr = nlohmann::json::array();
    for (const auto& mid : midpoints) {
        midpoints_arr.push_back({
            {"element_id", mid.element_id},
            {"x_mid_m", mid.x_mid_m},
            {"T_fe_C", mid.T_fe_C},
            {"T_exact_C", mid.T_exact_C},
            {"abs_error_C", mid.abs_error_C},
            {"rel_error_pct", mid.rel_error_pct}
        });
    }
    j["midpoints"] = midpoints_arr;

    return j;
}

std::string ThermalFESolution::toCsv() const {
    std::ostringstream ss;
    ss << std::fixed << std::setprecision(6);
    ss << "# Unified Engineering Workbench - Thermal FEA Results\n";
    ss << "# Parameters: L=" << params.L << " m, A=" << params.A << " m2, k=" << params.k
       << " W/(m K), q=" << params.q << " W/m3, T0=" << params.T_0 << " C, TL=" << params.T_L
       << " C, N=" << params.num_elements << "\n";
    ss << "type,id,x_m,T_fe_C,T_exact_C,abs_error_C\n";
    
    for (size_t i = 0; i < node_x_m.size(); ++i) {
        ss << "node," << i << "," << node_x_m[i] << "," << node_T_fe_C[i] << ","
           << node_T_exact_C[i] << "," << node_abs_error_C[i] << "\n";
    }
    for (const auto& mid : midpoints) {
        ss << "midpoint," << mid.element_id << "," << mid.x_mid_m << "," << mid.T_fe_C << ","
           << mid.T_exact_C << "," << mid.abs_error_C << "\n";
    }
    return ss.str();
}

nlohmann::json ConvergenceResult::toJson() const {
    nlohmann::json j;
    j["N_values"] = N_values;
    j["h_values"] = h_values;
    j["max_errors"] = max_errors;
    
    nlohmann::json sols_arr = nlohmann::json::array();
    for (const auto& s : solutions) {
        sols_arr.push_back(s.toJson());
    }
    j["solutions"] = sols_arr;
    return j;
}

} // namespace workbench
