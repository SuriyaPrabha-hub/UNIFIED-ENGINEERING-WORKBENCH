#include <iostream>
#include <fstream>
#include "thermal_fea.hpp"
#include "performance_benchmark.hpp"
#include "neural_net.hpp"

using namespace workbench;

int main() {
    // 1. Export FEA Convergence CSV
    ThermalFEAParams p;
    auto sol = ThermalSolver::solve(p);
    std::ofstream fea_out("results/thermal_fea_results.csv");
    fea_out << sol.toCsv();
    fea_out.close();

    // 2. Export Multicore Benchmark CSV
    auto suite = PerformanceBenchmark::runSuite(200, 40, 42);
    std::ofstream bench_out("results/performance_benchmark_results.csv");
    bench_out << suite.toCsv();
    bench_out.close();

    // 3. Export Backpropagation Training CSV
    auto sim = NeuralNetEngine::runSimulation(0.1, 100);
    std::ofstream nn_out("results/neural_backpropagation_training.csv");
    nn_out << sim.toCsv();
    nn_out.close();

    std::cout << "All results successfully written to results/ directory.\n";
    return 0;
}
