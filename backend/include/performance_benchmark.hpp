#pragma once
#include <vector>
#include <string>
#include <chrono>
#include "thermal_fea.hpp"
#include "json.hpp"

namespace workbench {

struct BenchmarkCase {
    int case_id;
    ThermalFEAParams params;
};

struct WorkerRunResult {
    int num_workers;
    std::vector<double> repetition_times_ms; // 5 repetitions
    double median_time_ms = 0.0;
    double speedup = 1.0;
    double efficiency = 1.0;
};

struct BenchmarkSuiteResult {
    std::string cpu_model;
    unsigned int hardware_concurrency;
    int case_count;
    int mesh_size_N;
    uint32_t random_seed;
    std::string compiler_info;
    std::string optimization_flags;
    
    std::vector<WorkerRunResult> worker_results; // for 1, 2, 3, 4 workers
    double max_serial_parallel_diff_C = 0.0;     // Agreement check <= 1e-8 C
    bool numerical_agreement_passed = false;
    double launch_to_ready_ms = 0.0;
    std::string notes;

    nlohmann::json toJson() const;
    std::string toCsv() const;
};

class PerformanceBenchmark {
public:
    // Generates a reproducible batch of thermal cases
    static std::vector<BenchmarkCase> generateBatch(int count = 200, int mesh_N = 40, uint32_t seed = 42);

    // Runs a batch using a specified number of worker threads
    // Deterministic output order guaranteed
    static std::vector<ThermalFESolution> runBatch(const std::vector<BenchmarkCase>& cases, int num_workers);

    // Runs complete benchmark suite for 1, 2, 3, and 4 workers with 5 repetitions each + warmup
    static BenchmarkSuiteResult runSuite(int case_count = 200, int mesh_N = 40, uint32_t seed = 42);
};

} // namespace workbench
