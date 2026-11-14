#include <iostream>
#include <fstream>
#include <sstream>
#include <string>
#include <thread>
#include <chrono>

#include "httplib.h"
#include "json.hpp"
#include "thermal_fea.hpp"
#include "geometry_parser.hpp"
#include "performance_benchmark.hpp"
#include "hardware_mock.hpp"
#include "neural_net.hpp"

using namespace workbench;
using json = nlohmann::json;

static void setCorsHeaders(httplib::Response& res) {
    res.set_header("Access-Control-Allow-Origin", "*");
    res.set_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.set_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
}

int main(int argc, char* argv[]) {
    int port = 8080;
    if (argc > 1) {
        try {
            port = std::stoi(argv[1]);
        } catch (...) {
            port = 8080;
        }
    }

    httplib::Server svr;
    HardwareMockManager hw_manager;

    // Handle Preflight OPTIONS requests
    svr.Options(".*", [](const httplib::Request&, httplib::Response& res) {
        setCorsHeaders(res);
        res.status = 204;
    });

    // 1. Health & Server Status
    svr.Get("/api/status", [](const httplib::Request&, httplib::Response& res) {
        setCorsHeaders(res);
        json j;
        j["status"] = "ONLINE";
        j["service"] = "Unified Engineering Workbench C++ Core";
        j["version"] = "2.0.0-PROD";
        j["standard"] = "C++17";
        j["hardware_concurrency"] = std::thread::hardware_concurrency();
        res.set_content(j.dump(), "application/json");
    });

    // 2. Thermal FEA - Single Solve
    svr.Post("/api/fea/solve", [](const httplib::Request& req, httplib::Response& res) {
        setCorsHeaders(res);
        try {
            json body = json::parse(req.body);
            ThermalFEAParams p;
            if (body.contains("L")) p.L = body["L"].get<double>();
            if (body.contains("A")) p.A = body["A"].get<double>();
            if (body.contains("k")) p.k = body["k"].get<double>();
            if (body.contains("q")) p.q = body["q"].get<double>();
            if (body.contains("T_0")) p.T_0 = body["T_0"].get<double>();
            if (body.contains("T_L")) p.T_L = body["T_L"].get<double>();
            if (body.contains("num_elements")) p.num_elements = body["num_elements"].get<int>();

            ThermalFESolution sol = ThermalSolver::solve(p);
            res.set_content(sol.toJson().dump(), "application/json");
        } catch (const std::exception& e) {
            json err;
            err["error"] = e.what();
            res.status = 400;
            res.set_content(err.dump(), "application/json");
        }
    });

    // 3. Thermal FEA - Convergence Study (N = 10, 20, 40, 80)
    svr.Post("/api/fea/convergence", [](const httplib::Request& req, httplib::Response& res) {
        setCorsHeaders(res);
        try {
            ThermalFEAParams p;
            if (!req.body.empty()) {
                json body = json::parse(req.body);
                if (body.contains("L")) p.L = body["L"].get<double>();
                if (body.contains("A")) p.A = body["A"].get<double>();
                if (body.contains("k")) p.k = body["k"].get<double>();
                if (body.contains("q")) p.q = body["q"].get<double>();
                if (body.contains("T_0")) p.T_0 = body["T_0"].get<double>();
                if (body.contains("T_L")) p.T_L = body["T_L"].get<double>();
            }
            ConvergenceResult conv = ThermalSolver::runConvergenceStudy(p);
            res.set_content(conv.toJson().dump(), "application/json");
        } catch (const std::exception& e) {
            json err;
            err["error"] = e.what();
            res.status = 400;
            res.set_content(err.dump(), "application/json");
        }
    });

    // 4. Thermal FEA - Export CSV
    svr.Post("/api/fea/export-csv", [](const httplib::Request& req, httplib::Response& res) {
        setCorsHeaders(res);
        try {
            json body = json::parse(req.body);
            ThermalFEAParams p;
            if (body.contains("L")) p.L = body["L"].get<double>();
            if (body.contains("A")) p.A = body["A"].get<double>();
            if (body.contains("k")) p.k = body["k"].get<double>();
            if (body.contains("q")) p.q = body["q"].get<double>();
            if (body.contains("T_0")) p.T_0 = body["T_0"].get<double>();
            if (body.contains("T_L")) p.T_L = body["T_L"].get<double>();
            if (body.contains("num_elements")) p.num_elements = body["num_elements"].get<int>();

            ThermalFESolution sol = ThermalSolver::solve(p);
            res.set_header("Content-Disposition", "attachment; filename=\"thermal_fea_results.csv\"");
            res.set_content(sol.toCsv(), "text/csv");
        } catch (const std::exception& e) {
            res.status = 400;
            res.set_content(std::string("Error: ") + e.what(), "text/plain");
        }
    });

    // 5. Geometry - Parse STL (Universal: Auto-detects Binary & ASCII STL)
    svr.Post("/api/geometry/parse-stl", [](const httplib::Request& req, httplib::Response& res) {
        setCorsHeaders(res);
        try {
            const std::string& content = req.body;
            if (content.empty()) {
                throw std::invalid_argument("Empty request body: No STL data received.");
            }
            STLGeometry geom = GeometryParser::parseSTL(content);
            res.set_content(geom.toJson().dump(), "application/json");
        } catch (const std::exception& e) {
            json err;
            err["error"] = e.what();
            res.status = 400;
            res.set_content(err.dump(), "application/json");
        }
    });

    // 6. Geometry - Parse ANSYS CSV (Universal: Delimiters, mm/m units, flexible columns)
    svr.Post("/api/geometry/parse-ansys-csv", [](const httplib::Request& req, httplib::Response& res) {
        setCorsHeaders(res);
        try {
            const std::string& content = req.body;
            if (content.empty()) {
                throw std::invalid_argument("Empty request body: No CSV data received.");
            }
            AnsysPointCloud cloud = GeometryParser::parseAnsysCSV(content);
            res.set_content(cloud.toJson().dump(), "application/json");
        } catch (const std::exception& e) {
            json err;
            err["error"] = e.what();
            res.status = 400;
            res.set_content(err.dump(), "application/json");
        }
    });

    // 7. Geometry - Sample files (Benchmark Rod & Formula-E Power Unit)
    svr.Get("/api/geometry/sample-stl", [](const httplib::Request&, httplib::Response& res) {
        setCorsHeaders(res);
        std::string sample = GeometryParser::generateSyntheticSampleSTL();
        STLGeometry geom = GeometryParser::parseSTL(sample);
        res.set_content(geom.toJson().dump(), "application/json");
    });

    svr.Get("/api/geometry/sample-ansys-csv", [](const httplib::Request&, httplib::Response& res) {
        setCorsHeaders(res);
        std::string sample = GeometryParser::generateSyntheticSampleAnsysCSV();
        AnsysPointCloud cloud = GeometryParser::parseAnsysCSV(sample);
        res.set_content(cloud.toJson().dump(), "application/json");
    });

    // Formula-E Electric Hypercar Power Unit (SiC Inverter + Axial-Flux Motor)
    auto serve_powerunit_stl = [](const httplib::Request&, httplib::Response& res) {
        setCorsHeaders(res);
        std::string sample = GeometryParser::generateFormulaEPowerUnitSTL();
        STLGeometry geom = GeometryParser::parseSTL(sample);
        res.set_content(geom.toJson().dump(), "application/json");
    };
    svr.Get("/api/geometry/sample-powerunit-stl", serve_powerunit_stl);
    svr.Get("/api/geometry/sample-lion-stl", serve_powerunit_stl); // Backward compatibility alias

    auto serve_powerunit_csv = [](const httplib::Request&, httplib::Response& res) {
        setCorsHeaders(res);
        std::string sample = GeometryParser::generateFormulaEAnsysCSV();
        AnsysPointCloud cloud = GeometryParser::parseAnsysCSV(sample);
        res.set_content(cloud.toJson().dump(), "application/json");
    };
    svr.Get("/api/geometry/sample-powerunit-ansys-csv", serve_powerunit_csv);
    svr.Get("/api/geometry/sample-lion-ansys-csv", serve_powerunit_csv); // Backward compatibility alias

    // 8. Performance Benchmark Suite
    svr.Post("/api/benchmark/run", [](const httplib::Request& req, httplib::Response& res) {
        setCorsHeaders(res);
        try {
            int case_count = 200;
            int mesh_N = 40;
            uint32_t seed = 42;

            if (!req.body.empty()) {
                json body = json::parse(req.body);
                if (body.contains("case_count")) case_count = body["case_count"].get<int>();
                if (body.contains("mesh_N")) mesh_N = body["mesh_N"].get<int>();
                if (body.contains("seed")) seed = body["seed"].get<uint32_t>();
            }

            BenchmarkSuiteResult suite = PerformanceBenchmark::runSuite(case_count, mesh_N, seed);
            res.set_content(suite.toJson().dump(), "application/json");
        } catch (const std::exception& e) {
            json err;
            err["error"] = e.what();
            res.status = 400;
            res.set_content(err.dump(), "application/json");
        }
    });

    // 9. Hardware Integration Mocks
    svr.Get("/api/hardware/devices", [&hw_manager](const httplib::Request&, httplib::Response& res) {
        setCorsHeaders(res);
        res.set_content(hw_manager.getDevicesJson().dump(), "application/json");
    });

    svr.Post("/api/hardware/connect", [&hw_manager](const httplib::Request& req, httplib::Response& res) {
        setCorsHeaders(res);
        try {
            json body = json::parse(req.body);
            std::string id = body["id"].get<std::string>();
            bool ok = hw_manager.connectDevice(id);
            json r;
            r["success"] = ok;
            r["devices"] = hw_manager.getDevicesJson();
            res.set_content(r.dump(), "application/json");
        } catch (const std::exception& e) {
            res.status = 400;
            json err; err["error"] = e.what();
            res.set_content(err.dump(), "application/json");
        }
    });

    svr.Post("/api/hardware/disconnect", [&hw_manager](const httplib::Request& req, httplib::Response& res) {
        setCorsHeaders(res);
        try {
            json body = json::parse(req.body);
            std::string id = body["id"].get<std::string>();
            bool ok = hw_manager.disconnectDevice(id);
            json r;
            r["success"] = ok;
            r["devices"] = hw_manager.getDevicesJson();
            res.set_content(r.dump(), "application/json");
        } catch (const std::exception& e) {
            res.status = 400;
            json err; err["error"] = e.what();
            res.set_content(err.dump(), "application/json");
        }
    });

    svr.Post("/api/hardware/inject-failure", [&hw_manager](const httplib::Request& req, httplib::Response& res) {
        setCorsHeaders(res);
        try {
            json body = json::parse(req.body);
            std::string id = body["id"].get<std::string>();
            std::string type = body.value("type", "TIMEOUT");
            hw_manager.injectFailure(id, type);
            json r;
            r["success"] = true;
            r["devices"] = hw_manager.getDevicesJson();
            res.set_content(r.dump(), "application/json");
        } catch (const std::exception& e) {
            res.status = 400;
            json err; err["error"] = e.what();
            res.set_content(err.dump(), "application/json");
        }
    });

    svr.Post("/api/hardware/recover", [&hw_manager](const httplib::Request& req, httplib::Response& res) {
        setCorsHeaders(res);
        try {
            json body = json::parse(req.body);
            std::string id = body["id"].get<std::string>();
            bool ok = hw_manager.recoverDevice(id);
            json r;
            r["success"] = ok;
            r["devices"] = hw_manager.getDevicesJson();
            res.set_content(r.dump(), "application/json");
        } catch (const std::exception& e) {
            res.status = 400;
            json err; err["error"] = e.what();
            res.set_content(err.dump(), "application/json");
        }
    });

    svr.Get("/api/hardware/architecture-doc", [&hw_manager](const httplib::Request&, httplib::Response& res) {
        setCorsHeaders(res);
        res.set_content(hw_manager.getHardwareArchitectureDocJson().dump(), "application/json");
    });

    // 10. Neural Network Backpropagation Simulation
    svr.Post("/api/neural/simulate", [](const httplib::Request& req, httplib::Response& res) {
        setCorsHeaders(res);
        try {
            double lr = 0.1;
            int steps = 100;
            if (!req.body.empty()) {
                json body = json::parse(req.body);
                if (body.contains("learning_rate")) lr = body["learning_rate"].get<double>();
                if (body.contains("steps")) steps = body["steps"].get<int>();
            }
            BackpropSimulationResult sim = NeuralNetEngine::runSimulation(lr, steps);
            res.set_content(sim.toJson().dump(), "application/json");
        } catch (const std::exception& e) {
            res.status = 400;
            json err; err["error"] = e.what();
            res.set_content(err.dump(), "application/json");
        }
    });

    svr.Post("/api/neural/export-csv", [](const httplib::Request& req, httplib::Response& res) {
        setCorsHeaders(res);
        try {
            double lr = 0.1;
            int steps = 100;
            if (!req.body.empty()) {
                json body = json::parse(req.body);
                if (body.contains("learning_rate")) lr = body["learning_rate"].get<double>();
                if (body.contains("steps")) steps = body["steps"].get<int>();
            }
            BackpropSimulationResult sim = NeuralNetEngine::runSimulation(lr, steps);
            res.set_header("Content-Disposition", "attachment; filename=\"neural_backprop_training.csv\"");
            res.set_content(sim.toCsv(), "text/csv");
        } catch (const std::exception& e) {
            res.status = 400;
            res.set_content(std::string("Error: ") + e.what(), "text/plain");
        }
    });

    // 11. Static files from frontend/dist if present
    if (std::ifstream("frontend/dist/index.html").good()) {
        svr.set_mount_point("/", "./frontend/dist");
    } else if (std::ifstream("../frontend/dist/index.html").good()) {
        svr.set_mount_point("/", "../frontend/dist");
    } else if (std::ifstream("./dist/index.html").good()) {
        svr.set_mount_point("/", "./dist");
    }

    std::cout << "========================================================\n";
    std::cout << "  UNIFIED ENGINEERING WORKBENCH C++ BACKEND SERVER      \n";
    std::cout << "  Listening on: http://127.0.0.1:" << port << "\n";
    std::cout << "  C++17 Numerical Core | Active Hardware Concurrency: " 
              << std::thread::hardware_concurrency() << "\n";
    std::cout << "========================================================\n" << std::flush;

    bool ok = svr.listen("127.0.0.1", port);
    if (!ok) {
        std::cerr << "SERVER FAILED TO BIND TO PORT " << port << std::endl << std::flush;
        return 1;
    }
    return 0;
}
