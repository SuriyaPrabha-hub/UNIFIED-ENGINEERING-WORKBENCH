#include "geometry_parser.hpp"
#include <fstream>
#include <sstream>
#include <iostream>
#include <cmath>
#include <algorithm>
#include <cctype>
#include <stdexcept>

namespace workbench {

static std::string trim(const std::string& str) {
    size_t first = str.find_first_not_of(" \t\r\n");
    if (first == std::string::npos) return "";
    size_t last = str.find_last_not_of(" \t\r\n");
    return str.substr(first, (last - first + 1));
}

STLGeometry GeometryParser::parseAsciiSTL(const std::string& content) {
    if (trim(content).empty()) {
        throw std::invalid_argument("Empty STL file: No geometry data found.");
    }

    std::istringstream stream(content);
    std::string line;
    STLGeometry geom;
    geom.solid_name = "Unnamed";

    double min_x = 1e30, max_x = -1e30;
    double min_y = 1e30, max_y = -1e30;
    double min_z = 1e30, max_z = -1e30;

    bool inside_solid = false;
    bool inside_facet = false;
    bool inside_loop = false;
    Vec3 current_normal{0.0, 0.0, 0.0};
    std::vector<Vec3> loop_vertices;

    int line_num = 0;
    while (std::getline(stream, line)) {
        line_num++;
        std::string trimmed = trim(line);
        if (trimmed.empty()) continue;

        std::istringstream ls(trimmed);
        std::string token;
        ls >> token;

        std::string lower_token = token;
        std::transform(lower_token.begin(), lower_token.end(), lower_token.begin(), ::tolower);

        if (lower_token == "solid") {
            inside_solid = true;
            std::string name;
            std::getline(ls, name);
            std::string trimmed_name = trim(name);
            if (!trimmed_name.empty()) geom.solid_name = trimmed_name;
        } else if (lower_token == "facet") {
            std::string norm_tag;
            ls >> norm_tag;
            if (norm_tag == "normal") {
                if (!(ls >> current_normal.x >> current_normal.y >> current_normal.z)) {
                    throw std::runtime_error("Malformed normal at line " + std::to_string(line_num));
                }
                if (!std::isfinite(current_normal.x) || !std::isfinite(current_normal.y) || !std::isfinite(current_normal.z)) {
                    throw std::runtime_error("Non-finite normal value at line " + std::to_string(line_num));
                }
            }
            inside_facet = true;
            loop_vertices.clear();
        } else if (lower_token == "outer") {
            std::string loop_tag;
            ls >> loop_tag;
            if (loop_tag == "loop") {
                inside_loop = true;
                loop_vertices.clear();
            }
        } else if (lower_token == "vertex") {
            Vec3 v;
            if (!(ls >> v.x >> v.y >> v.z)) {
                throw std::runtime_error("Malformed vertex coordinates at line " + std::to_string(line_num));
            }
            if (!std::isfinite(v.x) || !std::isfinite(v.y) || !std::isfinite(v.z)) {
                throw std::runtime_error("Non-finite vertex coordinates at line " + std::to_string(line_num));
            }
            loop_vertices.push_back(v);
        } else if (lower_token == "endloop") {
            inside_loop = false;
        } else if (lower_token == "endfacet") {
            inside_facet = false;
            if (loop_vertices.size() != 3) {
                throw std::runtime_error("Facet does not have exactly 3 vertices at line " + std::to_string(line_num));
            }

            for (const auto& v : loop_vertices) {
                geom.positions.push_back(static_cast<float>(v.x));
                geom.positions.push_back(static_cast<float>(v.y));
                geom.positions.push_back(static_cast<float>(v.z));

                geom.normals.push_back(static_cast<float>(current_normal.x));
                geom.normals.push_back(static_cast<float>(current_normal.y));
                geom.normals.push_back(static_cast<float>(current_normal.z));

                min_x = std::min(min_x, v.x); max_x = std::max(max_x, v.x);
                min_y = std::min(min_y, v.y); max_y = std::max(max_y, v.y);
                min_z = std::min(min_z, v.z); max_z = std::max(max_z, v.z);
            }
            geom.triangle_count++;
        } else if (lower_token == "endsolid") {
            inside_solid = false;
        }
    }

    if (geom.triangle_count == 0) {
        throw std::runtime_error("Invalid or empty STL: Zero valid triangles parsed.");
    }

    geom.bbox.min = {min_x, min_y, min_z};
    geom.bbox.max = {max_x, max_y, max_z};
    geom.bbox.center = {(min_x + max_x) / 2.0, (min_y + max_y) / 2.0, (min_z + max_z) / 2.0};
    double dx = max_x - min_x, dy = max_y - min_y, dz = max_z - min_z;
    geom.bbox.diag_size = std::sqrt(dx * dx + dy * dy + dz * dz);
    geom.validation_status = "VALID_ASCII_STL";

    return geom;
}

STLGeometry GeometryParser::parseAsciiSTLFile(const std::string& filepath) {
    std::ifstream file(filepath);
    if (!file.is_open()) {
        throw std::runtime_error("Cannot open STL file: " + filepath);
    }
    std::stringstream buffer;
    buffer << file.rdbuf();
    return parseAsciiSTL(buffer.str());
}

AnsysPointCloud GeometryParser::parseAnsysCSV(const std::string& content) {
    if (trim(content).empty()) {
        throw std::invalid_argument("Empty CSV file: No data rows found.");
    }

    std::istringstream stream(content);
    std::string line;
    AnsysPointCloud cloud;

    double min_x = 1e30, max_x = -1e30;
    double min_y = 1e30, max_y = -1e30;
    double min_z = 1e30, max_z = -1e30;
    double min_t = 1e30, max_t = -1e30;
    double sum_t = 0.0;

    int line_num = 0;
    bool header_checked = false;

    while (std::getline(stream, line)) {
        line_num++;
        std::string trimmed = trim(line);
        if (trimmed.empty()) continue;
        if (trimmed[0] == '#') continue; // Comments

        // Check header
        if (!header_checked) {
            std::string lower = trimmed;
            std::transform(lower.begin(), lower.end(), lower.begin(), ::tolower);
            if (lower.find("node_id") != std::string::npos || lower.find("temperature") != std::string::npos) {
                header_checked = true;
                continue; // Skip header row
            }
            header_checked = true;
        }

        // Parse CSV columns: node_id,x_m,y_m,z_m,temperature_C
        std::istringstream ls(trimmed);
        std::string token;
        std::vector<std::string> cols;
        while (std::getline(ls, token, ',')) {
            cols.push_back(trim(token));
        }

        if (cols.size() < 5) {
            throw std::runtime_error("Line " + std::to_string(line_num) + ": Expected 5 columns (node_id,x_m,y_m,z_m,temperature_C), found " + std::to_string(cols.size()));
        }

        try {
            AnsysNode node;
            node.node_id = std::stoi(cols[0]);
            node.x_m = std::stod(cols[1]);
            node.y_m = std::stod(cols[2]);
            node.z_m = std::stod(cols[3]);
            node.temperature_C = std::stod(cols[4]);

            if (!std::isfinite(node.x_m) || !std::isfinite(node.y_m) || !std::isfinite(node.z_m) || !std::isfinite(node.temperature_C)) {
                throw std::runtime_error("Non-finite numeric value at line " + std::to_string(line_num));
            }

            min_x = std::min(min_x, node.x_m); max_x = std::max(max_x, node.x_m);
            min_y = std::min(min_y, node.y_m); max_y = std::max(max_y, node.y_m);
            min_z = std::min(min_z, node.z_m); max_z = std::max(max_z, node.z_m);

            min_t = std::min(min_t, node.temperature_C);
            max_t = std::max(max_t, node.temperature_C);
            sum_t += node.temperature_C;

            cloud.nodes.push_back(node);
        } catch (const std::exception& e) {
            throw std::runtime_error("Line " + std::to_string(line_num) + ": Numeric conversion failure - " + e.what());
        }
    }

    if (cloud.nodes.empty()) {
        throw std::runtime_error("No valid ANSYS node rows found in CSV.");
    }

    cloud.node_count = static_cast<int>(cloud.nodes.size());
    cloud.min_temp_C = min_t;
    cloud.max_temp_C = max_t;
    cloud.avg_temp_C = sum_t / cloud.node_count;

    cloud.bbox.min = {min_x, min_y, min_z};
    cloud.bbox.max = {max_x, max_y, max_z};
    cloud.bbox.center = {(min_x + max_x) / 2.0, (min_y + max_y) / 2.0, (min_z + max_z) / 2.0};
    double dx = max_x - min_x, dy = max_y - min_y, dz = max_z - min_z;
    cloud.bbox.diag_size = std::sqrt(dx * dx + dy * dy + dz * dz);
    cloud.validation_status = "VALID_ANSYS_NODAL_CSV";

    return cloud;
}

AnsysPointCloud GeometryParser::parseAnsysCSVFile(const std::string& filepath) {
    std::ifstream file(filepath);
    if (!file.is_open()) {
        throw std::runtime_error("Cannot open CSV file: " + filepath);
    }
    std::stringstream buffer;
    buffer << file.rdbuf();
    return parseAnsysCSV(buffer.str());
}

std::string GeometryParser::generateSyntheticSampleSTL() {
    // Generate an ASCII STL for a square rod: L = 1.0 m, cross section 0.01 m x 0.01 m (Area = 1e-4 m^2)
    // Exactly matching Task C mechanical rod!
    std::ostringstream ss;
    ss << "solid ThermalRod_1D_Benchmark\n";
    
    double l = 1.0;
    double w = 0.01;
    double h = 0.01;

    // Helper lambda for facet
    auto emit_facet = [&](double nx, double ny, double nz,
                          double x1, double y1, double z1,
                          double x2, double y2, double z2,
                          double x3, double y3, double z3) {
        ss << "  facet normal " << nx << " " << ny << " " << nz << "\n";
        ss << "    outer loop\n";
        ss << "      vertex " << x1 << " " << y1 << " " << z1 << "\n";
        ss << "      vertex " << x2 << " " << y2 << " " << z2 << "\n";
        ss << "      vertex " << x3 << " " << y3 << " " << z3 << "\n";
        ss << "    endloop\n";
        ss << "  endfacet\n";
    };

    // Subdivided segments along length (10 segments)
    int segs = 10;
    double dx = l / segs;
    double y0 = -w / 2.0, y1 = w / 2.0;
    double z0 = -h / 2.0, z1 = h / 2.0;

    // End cap at x = 0 (Left face)
    emit_facet(-1, 0, 0, 0, y0, z0, 0, y1, z1, 0, y0, z1);
    emit_facet(-1, 0, 0, 0, y0, z0, 0, y1, z0, 0, y1, z1);

    // End cap at x = L (Right face)
    emit_facet(1, 0, 0, l, y0, z0, l, y0, z1, l, y1, z1);
    emit_facet(1, 0, 0, l, y0, z0, l, y1, z1, l, y1, z0);

    // 4 lateral sides along segments
    for (int i = 0; i < segs; ++i) {
        double xa = i * dx;
        double xb = (i + 1) * dx;

        // Top (+Z)
        emit_facet(0, 0, 1, xa, y0, z1, xb, y0, z1, xb, y1, z1);
        emit_facet(0, 0, 1, xa, y0, z1, xb, y1, z1, xa, y1, z1);

        // Bottom (-Z)
        emit_facet(0, 0, -1, xa, y0, z0, xb, y1, z0, xb, y0, z0);
        emit_facet(0, 0, -1, xa, y0, z0, xa, y1, z0, xb, y1, z0);

        // Front (+Y)
        emit_facet(0, 1, 0, xa, y1, z0, xb, y1, z1, xb, y1, z0);
        emit_facet(0, 1, 0, xa, y1, z0, xa, y1, z1, xb, y1, z1);

        // Back (-Y)
        emit_facet(0, -1, 0, xa, y0, z0, xb, y0, z0, xb, y0, z1);
        emit_facet(0, -1, 0, xa, y0, z0, xb, y0, z1, xa, y0, z1);
    }

    ss << "endsolid ThermalRod_1D_Benchmark\n";
    return ss.str();
}

std::string GeometryParser::generateSyntheticSampleAnsysCSV() {
    // Generate synthetic ANSYS nodal export CSV for the thermal rod
    // Provenance: Synthetic ANSYS export based on exact 1D thermal FEA solution with volumetric heating
    std::ostringstream ss;
    ss << "# SYNTHETIC DATASET: Export schema mimics ANSYS Mechanical Nodal Temperature Export\n";
    ss << "# Provenance: Synthetic 3D grid with analytical temperature solution T(x) = 100 - 80*x + 500*x*(1-x)\n";
    ss << "# Units: Coordinates in meters (m), Temperature in Celsius (C)\n";
    ss << "node_id,x_m,y_m,z_m,temperature_C\n";

    int node_id = 1;
    int nx = 21; // 21 stations along X from 0 to 1.0 m
    int ny = 3;  // 3 across width (-0.005, 0, 0.005)
    int nz = 3;  // 3 across height (-0.005, 0, 0.005)

    for (int i = 0; i < nx; ++i) {
        double x = (1.0 / (nx - 1)) * i;
        // Exact solution: T(x) = 100 - 80*x + [q/(2k)]*x*(1-x), with q=10000, k=10 -> q/(2k) = 500
        double t_base = 100.0 - 80.0 * x + 500.0 * x * (1.0 - x);

        for (int j = 0; j < ny; ++j) {
            double y = -0.005 + j * 0.005;
            for (int k = 0; k < nz; ++k) {
                double z = -0.005 + k * 0.005;
                // Add slight 3D boundary variation (e.g. 0.05 C) for visual realism
                double t_val = t_base + 0.02 * (y * 100.0 + z * 100.0);
                ss << node_id++ << "," << x << "," << y << "," << z << "," << t_val << "\n";
            }
        }
    }
    return ss.str();
}

nlohmann::json STLGeometry::toJson() const {
    nlohmann::json j;
    j["solid_name"] = solid_name;
    j["triangle_count"] = triangle_count;
    j["positions"] = positions;
    j["normals"] = normals;
    j["bbox"] = {
        {"min", {bbox.min.x, bbox.min.y, bbox.min.z}},
        {"max", {bbox.max.x, bbox.max.y, bbox.max.z}},
        {"center", {bbox.center.x, bbox.center.y, bbox.center.z}},
        {"diag_size", bbox.diag_size}
    };
    j["validation_status"] = validation_status;
    j["warnings"] = warnings;
    return j;
}

nlohmann::json AnsysPointCloud::toJson() const {
    nlohmann::json j;
    j["node_count"] = node_count;
    j["min_temp_C"] = min_temp_C;
    j["max_temp_C"] = max_temp_C;
    j["avg_temp_C"] = avg_temp_C;
    j["bbox"] = {
        {"min", {bbox.min.x, bbox.min.y, bbox.min.z}},
        {"max", {bbox.max.x, bbox.max.y, bbox.max.z}},
        {"center", {bbox.center.x, bbox.center.y, bbox.center.z}},
        {"diag_size", bbox.diag_size}
    };
    j["validation_status"] = validation_status;
    j["warnings"] = warnings;

    nlohmann::json node_arr = nlohmann::json::array();
    for (const auto& n : nodes) {
        node_arr.push_back({
            {"id", n.node_id},
            {"x", n.x_m},
            {"y", n.y_m},
            {"z", n.z_m},
            {"temp", n.temperature_C}
        });
    }
    j["nodes"] = node_arr;
    return j;
}

} // namespace workbench
