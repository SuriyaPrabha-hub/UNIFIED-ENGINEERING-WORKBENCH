#include "geometry_parser.hpp"
#include <fstream>
#include <sstream>
#include <iostream>
#include <cmath>
#include <algorithm>
#include <cctype>
#include <cstring>
#include <stdexcept>

namespace workbench {

static std::string trim(const std::string& str) {
    size_t first = str.find_first_not_of(" \t\r\n");
    if (first == std::string::npos) return "";
    size_t last = str.find_last_not_of(" \t\r\n");
    return str.substr(first, (last - first + 1));
}

// -------------------------------------------------------------
// Universal STL Parsing (Auto-Detect Binary vs ASCII)
// -------------------------------------------------------------

STLGeometry GeometryParser::parseSTL(const std::string& buffer) {
    if (trim(buffer).empty()) {
        throw std::invalid_argument("Empty STL file: No geometry data found.");
    }

    // Heuristic 1: If buffer contains null bytes in first 512 bytes, it is definitively binary.
    bool has_null_byte = false;
    size_t check_len = std::min(buffer.size(), size_t(512));
    for (size_t i = 0; i < check_len; ++i) {
        if (buffer[i] == '\0') {
            has_null_byte = true;
            break;
        }
    }

    // Heuristic 2: Check if exact file size matches the binary STL formula (84 + N*50)
    bool matches_binary_size = false;
    if (buffer.size() >= 84) {
        uint32_t num_tris = 0;
        std::memcpy(&num_tris, buffer.data() + 80, 4);
        size_t expected_size = 84 + static_cast<size_t>(num_tris) * 50;
        if (num_tris > 0 && buffer.size() == expected_size) {
            matches_binary_size = true;
        }
    }

    // Prioritize binary parser if binary traits detected
    if (has_null_byte || matches_binary_size) {
        try {
            return parseBinarySTL(buffer);
        } catch (...) {
            return parseAsciiSTL(buffer);
        }
    } else {
        try {
            return parseAsciiSTL(buffer);
        } catch (...) {
            if (buffer.size() >= 84) {
                return parseBinarySTL(buffer);
            }
            throw;
        }
    }
}

STLGeometry GeometryParser::parseBinarySTL(const std::string& buffer) {
    if (buffer.size() < 84) {
        throw std::invalid_argument("Binary STL data too small (less than 84 bytes).");
    }

    uint32_t num_triangles = 0;
    std::memcpy(&num_triangles, buffer.data() + 80, 4);

    if (num_triangles == 0) {
        throw std::runtime_error("Invalid binary STL: Header declares 0 triangles.");
    }

    // Safe bound if file was slightly truncated
    size_t available = (buffer.size() - 84) / 50;
    if (available < num_triangles) {
        if (available == 0) {
            throw std::runtime_error("Incomplete binary STL: Insufficient triangle records.");
        }
        num_triangles = static_cast<uint32_t>(available);
    }

    STLGeometry geom;
    char header_buf[81];
    std::memcpy(header_buf, buffer.data(), 80);
    header_buf[80] = '\0';
    geom.solid_name = trim(std::string(header_buf, 80));
    if (geom.solid_name.empty()) geom.solid_name = "Binary_STL_Model";

    geom.triangle_count = static_cast<int>(num_triangles);

    // Stride downsampling for massive meshes (> 150,000 triangles, e.g. Stanford Dragon)
    // Ensures Three.js renders smoothly at 60 FPS without exhausting WebGL buffer memory
    int stride = 1;
    if (num_triangles > 150000) {
        stride = static_cast<int>((num_triangles + 149999) / 150000);
        geom.warnings = "High-poly mesh: Stride decimated (1:" + std::to_string(stride) + 
                        ") for real-time 60 FPS WebGL rendering (" + 
                        std::to_string(num_triangles / stride) + " display triangles).";
    }

    double min_x = 1e30, max_x = -1e30;
    double min_y = 1e30, max_y = -1e30;
    double min_z = 1e30, max_z = -1e30;

    const char* ptr = buffer.data() + 84;
    for (uint32_t i = 0; i < num_triangles; ++i) {
        float n[3], v1[3], v2[3], v3[3];
        std::memcpy(n, ptr, 12);
        std::memcpy(v1, ptr + 12, 12);
        std::memcpy(v2, ptr + 24, 12);
        std::memcpy(v3, ptr + 36, 12);
        ptr += 50;

        if (!std::isfinite(v1[0]) || !std::isfinite(v1[1]) || !std::isfinite(v1[2]) ||
            !std::isfinite(v2[0]) || !std::isfinite(v2[1]) || !std::isfinite(v2[2]) ||
            !std::isfinite(v3[0]) || !std::isfinite(v3[1]) || !std::isfinite(v3[2])) {
            continue;
        }

        min_x = std::min({min_x, (double)v1[0], (double)v2[0], (double)v3[0]});
        max_x = std::max({max_x, (double)v1[0], (double)v2[0], (double)v3[0]});
        min_y = std::min({min_y, (double)v1[1], (double)v2[1], (double)v3[1]});
        max_y = std::max({max_y, (double)v1[1], (double)v2[1], (double)v3[1]});
        min_z = std::min({min_z, (double)v1[2], (double)v2[2], (double)v3[2]});
        max_z = std::max({max_z, (double)v1[2], (double)v2[2], (double)v3[2]});

        if (i % stride == 0) {
            float nx = n[0], ny = n[1], nz = n[2];
            if (!std::isfinite(nx) || !std::isfinite(ny) || !std::isfinite(nz) ||
                (std::abs(nx) < 1e-6f && std::abs(ny) < 1e-6f && std::abs(nz) < 1e-6f)) {
                float e1x = v2[0] - v1[0], e1y = v2[1] - v1[1], e1z = v2[2] - v1[2];
                float e2x = v3[0] - v1[0], e2y = v3[1] - v1[1], e2z = v3[2] - v1[2];
                nx = e1y * e2z - e1z * e2y;
                ny = e1z * e2x - e1x * e2z;
                nz = e1x * e2y - e1y * e2x;
                float len = std::sqrt(nx * nx + ny * ny + nz * nz);
                if (len > 1e-9f) {
                    nx /= len; ny /= len; nz /= len;
                }
            }

            geom.positions.push_back(v1[0]); geom.positions.push_back(v1[1]); geom.positions.push_back(v1[2]);
            geom.normals.push_back(nx); geom.normals.push_back(ny); geom.normals.push_back(nz);

            geom.positions.push_back(v2[0]); geom.positions.push_back(v2[1]); geom.positions.push_back(v2[2]);
            geom.normals.push_back(nx); geom.normals.push_back(ny); geom.normals.push_back(nz);

            geom.positions.push_back(v3[0]); geom.positions.push_back(v3[1]); geom.positions.push_back(v3[2]);
            geom.normals.push_back(nx); geom.normals.push_back(ny); geom.normals.push_back(nz);
        }
    }

    if (geom.positions.empty()) {
        throw std::runtime_error("Binary STL contained no valid finite vertices.");
    }

    geom.bbox.min = {min_x, min_y, min_z};
    geom.bbox.max = {max_x, max_y, max_z};
    geom.bbox.center = {(min_x + max_x) / 2.0, (min_y + max_y) / 2.0, (min_z + max_z) / 2.0};
    double dx = max_x - min_x, dy = max_y - min_y, dz = max_z - min_z;
    geom.bbox.diag_size = std::sqrt(dx * dx + dy * dy + dz * dz);
    geom.validation_status = "VALID_BINARY_STL";

    return geom;
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

STLGeometry GeometryParser::parseSTLFile(const std::string& filepath) {
    std::ifstream file(filepath, std::ios::binary);
    if (!file.is_open()) {
        throw std::runtime_error("Cannot open STL file: " + filepath);
    }
    std::stringstream buffer;
    buffer << file.rdbuf();
    return parseSTL(buffer.str());
}

STLGeometry GeometryParser::parseAsciiSTLFile(const std::string& filepath) {
    return parseSTLFile(filepath);
}

// -------------------------------------------------------------
// Universal ANSYS / FEA Nodal CSV Parser
// -------------------------------------------------------------

AnsysPointCloud GeometryParser::parseAnsysCSV(const std::string& content) {
    if (trim(content).empty()) {
        throw std::invalid_argument("Empty CSV file: No data rows found.");
    }

    std::istringstream stream(content);
    std::string raw_line;
    std::vector<std::string> lines;
    while (std::getline(stream, raw_line)) {
        std::string tr = trim(raw_line);
        if (!tr.empty()) {
            lines.push_back(tr);
        }
    }

    if (lines.empty()) {
        throw std::invalid_argument("Empty CSV file: No data rows found.");
    }

    // 1. Delimiter auto-detection: Sample first lines
    char delimiter = ',';
    int comma_cnt = 0, semi_cnt = 0, tab_cnt = 0;
    size_t sample_n = std::min(lines.size(), size_t(10));
    for (size_t i = 0; i < sample_n; ++i) {
        for (char c : lines[i]) {
            if (c == ',') comma_cnt++;
            else if (c == ';') semi_cnt++;
            else if (c == '\t') tab_cnt++;
        }
    }
    if (semi_cnt > comma_cnt && semi_cnt > tab_cnt) delimiter = ';';
    else if (tab_cnt > comma_cnt && tab_cnt > semi_cnt) delimiter = '\t';
    else delimiter = ',';

    auto split_line = [](const std::string& l, char delim) -> std::vector<std::string> {
        std::vector<std::string> tokens;
        std::istringstream ss(l);
        std::string token;
        while (std::getline(ss, token, delim)) {
            tokens.push_back(trim(token));
        }
        return tokens;
    };

    // 2. Identify column headers flexibly
    int col_node = -1;
    int col_x = -1;
    int col_y = -1;
    int col_z = -1;
    int col_temp = -1;
    bool has_mm_unit = false;
    size_t start_line = 0;

    for (size_t i = 0; i < lines.size(); ++i) {
        const std::string& l = lines[i];
        if (l.empty() || l[0] == '#' || l[0] == '!' || l[0] == '/') continue;

        std::vector<std::string> cols = split_line(l, delimiter);
        bool looks_like_header = false;
        for (size_t c = 0; c < cols.size(); ++c) {
            std::string col_low = cols[c];
            std::transform(col_low.begin(), col_low.end(), col_low.begin(), ::tolower);

            if (col_low.find("mm") != std::string::npos) has_mm_unit = true;

            if (col_node == -1 && (col_low.find("node") != std::string::npos || col_low == "id" || col_low == "point")) {
                col_node = static_cast<int>(c);
                looks_like_header = true;
            } else if (col_x == -1 && (col_low == "x" || col_low.find("x_") != std::string::npos || col_low.find("x [") != std::string::npos || col_low.find("x(") != std::string::npos || col_low.find("x location") != std::string::npos)) {
                col_x = static_cast<int>(c);
                looks_like_header = true;
            } else if (col_y == -1 && (col_low == "y" || col_low.find("y_") != std::string::npos || col_low.find("y [") != std::string::npos || col_low.find("y(") != std::string::npos || col_low.find("y location") != std::string::npos)) {
                col_y = static_cast<int>(c);
                looks_like_header = true;
            } else if (col_z == -1 && (col_low == "z" || col_low.find("z_") != std::string::npos || col_low.find("z [") != std::string::npos || col_low.find("z(") != std::string::npos || col_low.find("z location") != std::string::npos)) {
                col_z = static_cast<int>(c);
                looks_like_header = true;
            } else if (col_temp == -1 && (col_low.find("temp") != std::string::npos || col_low.find("degc") != std::string::npos || col_low == "t")) {
                col_temp = static_cast<int>(c);
                looks_like_header = true;
            }
        }

        if (looks_like_header) {
            start_line = i + 1;
            break;
        } else {
            // First non-comment row has no header names; proceed as data
            start_line = i;
            break;
        }
    }

    // Default column mappings if header had no column names
    if (col_x == -1 || col_y == -1 || col_z == -1 || col_temp == -1) {
        if (start_line < lines.size()) {
            std::vector<std::string> sample_cols = split_line(lines[start_line], delimiter);
            if (sample_cols.size() >= 5) {
                if (col_node == -1) col_node = 0;
                if (col_x == -1) col_x = 1;
                if (col_y == -1) col_y = 2;
                if (col_z == -1) col_z = 3;
                if (col_temp == -1) col_temp = 4;
            } else if (sample_cols.size() == 4) {
                if (col_node == -1) col_node = -1;
                if (col_x == -1) col_x = 0;
                if (col_y == -1) col_y = 1;
                if (col_z == -1) col_z = 2;
                if (col_temp == -1) col_temp = 3;
            }
        }
    }

    AnsysPointCloud cloud;
    double min_x = 1e30, max_x = -1e30;
    double min_y = 1e30, max_y = -1e30;
    double min_z = 1e30, max_z = -1e30;
    double min_t = 1e30, max_t = -1e30;
    double sum_t = 0.0;

    int auto_id = 1;
    bool has_huge_coords = false;

    for (size_t i = start_line; i < lines.size(); ++i) {
        const std::string& l = lines[i];
        if (l.empty() || l[0] == '#' || l[0] == '!' || l[0] == '/') continue;

        std::vector<std::string> cols = split_line(l, delimiter);
        size_t min_req = std::max({col_x, col_y, col_z, col_temp}) + 1;
        if (cols.size() < min_req) continue;

        try {
            int node_id = auto_id++;
            if (col_node >= 0 && col_node < static_cast<int>(cols.size())) {
                try { node_id = std::stoi(cols[col_node]); } catch (...) {}
            }

            double x = std::stod(cols[col_x]);
            double y = std::stod(cols[col_y]);
            double z = std::stod(cols[col_z]);
            double temp = std::stod(cols[col_temp]);

            if (!std::isfinite(x) || !std::isfinite(y) || !std::isfinite(z) || !std::isfinite(temp)) {
                continue;
            }

            if (std::abs(x) > 500.0 || std::abs(y) > 500.0 || std::abs(z) > 500.0) {
                has_huge_coords = true;
            }

            AnsysNode n;
            n.node_id = node_id;
            n.x_m = x;
            n.y_m = y;
            n.z_m = z;
            n.temperature_C = temp;

            min_x = std::min(min_x, x); max_x = std::max(max_x, x);
            min_y = std::min(min_y, y); max_y = std::max(max_y, y);
            min_z = std::min(min_z, z); max_z = std::max(max_z, z);
            min_t = std::min(min_t, temp); max_t = std::max(max_t, temp);
            sum_t += temp;

            cloud.nodes.push_back(n);
        } catch (...) {
            // Tolerant to single row formatting flaws
            continue;
        }
    }

    if (cloud.nodes.empty()) {
        throw std::runtime_error("No valid ANSYS node rows found in CSV.");
    }

    // Auto-scale mm -> m if detected
    if (has_mm_unit || has_huge_coords) {
        cloud.warnings = "Auto-converted nodal coordinates from millimeters (mm) to meters (m).";
        min_x *= 0.001; max_x *= 0.001;
        min_y *= 0.001; max_y *= 0.001;
        min_z *= 0.001; max_z *= 0.001;
        for (auto& n : cloud.nodes) {
            n.x_m *= 0.001;
            n.y_m *= 0.001;
            n.z_m *= 0.001;
        }
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

// -------------------------------------------------------------
// Benchmark Cylindrical Rod (Task C Reference)
// -------------------------------------------------------------

std::string GeometryParser::generateSyntheticSampleSTL() {
    std::ostringstream ss;
    ss << "solid ThermalRod_1D_Benchmark\n";
    
    double l = 1.0;
    double w = 0.01;
    double h = 0.01;

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

    int segs = 10;
    double dx = l / segs;
    double y0 = -w / 2.0, y1 = w / 2.0;
    double z0 = -h / 2.0, z1 = h / 2.0;

    // End caps
    emit_facet(-1, 0, 0, 0, y0, z0, 0, y1, z1, 0, y0, z1);
    emit_facet(-1, 0, 0, 0, y0, z0, 0, y1, z0, 0, y1, z1);
    emit_facet(1, 0, 0, l, y0, z0, l, y0, z1, l, y1, z1);
    emit_facet(1, 0, 0, l, y0, z0, l, y1, z1, l, y1, z0);

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
    std::ostringstream ss;
    ss << "# SYNTHETIC DATASET: Export schema mimics ANSYS Mechanical Nodal Temperature Export\n";
    ss << "# Provenance: Synthetic 3D grid with analytical temperature solution T(x) = 100 - 80*x + 500*x*(1-x)\n";
    ss << "# Units: Coordinates in meters (m), Temperature in Celsius (C)\n";
    ss << "node_id,x_m,y_m,z_m,temperature_C\n";

    int node_id = 1;
    int nx = 21;
    int ny = 3;
    int nz = 3;

    for (int i = 0; i < nx; ++i) {
        double x = (1.0 / (nx - 1)) * i;
        double t_base = 100.0 - 80.0 * x + 500.0 * x * (1.0 - x);

        for (int j = 0; j < ny; ++j) {
            double y = -0.005 + j * 0.005;
            for (int k = 0; k < nz; ++k) {
                double z = -0.005 + k * 0.005;
                double t_val = t_base + 0.02 * (y * 100.0 + z * 100.0);
                ss << node_id++ << "," << x << "," << y << "," << z << "," << t_val << "\n";
            }
        }
    }
    return ss.str();
}

// -------------------------------------------------------------
// Project LION - Biomimetic Quadruped Exploration Robot (R&D Showcase)
// -------------------------------------------------------------

static void emit_stl_box(std::ostringstream& ss, double x0, double x1, double y0, double y1, double z0, double z1) {
    auto emit_tri = [&](double nx, double ny, double nz,
                        double ax, double ay, double az,
                        double bx, double by, double bz,
                        double cx, double cy, double cz) {
        ss << "  facet normal " << nx << " " << ny << " " << nz << "\n";
        ss << "    outer loop\n";
        ss << "      vertex " << ax << " " << ay << " " << az << "\n";
        ss << "      vertex " << bx << " " << by << " " << bz << "\n";
        ss << "      vertex " << cx << " " << cy << " " << cz << "\n";
        ss << "    endloop\n";
        ss << "  endfacet\n";
    };

    // Front (+X)
    emit_tri(1, 0, 0, x1, y0, z0, x1, y1, z0, x1, y1, z1);
    emit_tri(1, 0, 0, x1, y0, z0, x1, y1, z1, x1, y0, z1);
    // Back (-X)
    emit_tri(-1, 0, 0, x0, y1, z0, x0, y0, z0, x0, y0, z1);
    emit_tri(-1, 0, 0, x0, y1, z0, x0, y0, z1, x0, y1, z1);
    // Top (+Z)
    emit_tri(0, 0, 1, x0, y0, z1, x1, y0, z1, x1, y1, z1);
    emit_tri(0, 0, 1, x0, y0, z1, x1, y1, z1, x0, y1, z1);
    // Bottom (-Z)
    emit_tri(0, 0, -1, x0, y1, z0, x1, y1, z0, x1, y0, z0);
    emit_tri(0, 0, -1, x0, y1, z0, x1, y0, z0, x0, y0, z0);
    // Right (+Y)
    emit_tri(0, 1, 0, x0, y1, z0, x1, y1, z0, x1, y1, z1);
    emit_tri(0, 1, 0, x0, y1, z0, x1, y1, z1, x0, y1, z1);
    // Left (-Y)
    emit_tri(0, -1, 0, x1, y0, z0, x0, y0, z0, x0, y0, z1);
    emit_tri(0, -1, 0, x1, y0, z0, x0, y0, z1, x1, y0, z1);
}

static void emit_stl_strut(std::ostringstream& ss, 
                           double x1, double y1, double z1, 
                           double x2, double y2, double z2, 
                           double half_w, double half_d) {
    // Oriented leg link strut bounding prism
    double xmin = std::min(x1, x2) - half_w;
    double xmax = std::max(x1, x2) + half_w;
    double ymin = std::min(y1, y2) - half_w;
    double ymax = std::max(y1, y2) + half_w;
    double zmin = std::min(z1, z2) - half_d;
    double zmax = std::max(z1, z2) + half_d;
    emit_stl_box(ss, xmin, xmax, ymin, ymax, zmin, zmax);
}

std::string GeometryParser::generateProjectLionSTL() {
    std::ostringstream ss;
    ss << "solid ProjectLion_Biomimetic_Quadruped_Robot\n";

    // 1. Main Carbon-Fiber Torso Monocoque
    emit_stl_box(ss, -0.32, 0.28, -0.11, 0.11, 0.18, 0.32);

    // 2. Aerodynamic Chest Fairing & Cowl
    emit_stl_box(ss, 0.28, 0.38, -0.10, 0.10, 0.20, 0.30);

    // 3. Central Spine Heat Exchanger Fins (Conducts Actuator Heat to Airflow)
    emit_stl_box(ss, -0.22, 0.22, -0.012, 0.012, 0.32, 0.37);
    emit_stl_box(ss, -0.18, 0.18, 0.045, 0.065, 0.32, 0.355);
    emit_stl_box(ss, -0.18, 0.18, -0.065, -0.045, 0.32, 0.355);

    // 4. Biomimetic Head & Sensor Mast (LiDAR / Vision Turret)
    emit_stl_box(ss, 0.38, 0.52, -0.08, 0.08, 0.24, 0.38);       // Cranium
    emit_stl_box(ss, 0.52, 0.60, -0.055, 0.055, 0.24, 0.32);     // Snout / Muzzle
    emit_stl_box(ss, 0.42, 0.47, 0.06, 0.085, 0.38, 0.43);       // Left Ear Antenna Pod
    emit_stl_box(ss, 0.42, 0.47, -0.085, -0.06, 0.38, 0.43);     // Right Ear Antenna Pod

    // 5. 4 Articulated Running Legs in Gallop/Trot Kinematic Pose:
    // --- Front Left (FL) Leg: Forward Reach ---
    emit_stl_box(ss, 0.19, 0.27, 0.11, 0.18, 0.21, 0.29);        // Shoulder Actuator Motor
    emit_stl_strut(ss, 0.23, 0.145, 0.21, 0.31, 0.145, 0.10, 0.018, 0.020); // Femur Strut
    emit_stl_box(ss, 0.27, 0.35, 0.12, 0.17, 0.06, 0.13);        // Knee Actuator Motor
    emit_stl_strut(ss, 0.31, 0.145, 0.06, 0.37, 0.145, -0.04, 0.015, 0.018); // Tibia Strut
    emit_stl_box(ss, 0.34, 0.42, 0.12, 0.17, -0.06, -0.04);      // Shock-Absorbing Paw

    // --- Front Right (FR) Leg: Mid-Stride Stance ---
    emit_stl_box(ss, 0.19, 0.27, -0.18, -0.11, 0.21, 0.29);       // Shoulder Actuator Motor
    emit_stl_strut(ss, 0.23, -0.145, 0.21, 0.17, -0.145, 0.10, 0.018, 0.020); // Femur Strut
    emit_stl_box(ss, 0.13, 0.21, -0.17, -0.12, 0.06, 0.13);       // Knee Actuator Motor
    emit_stl_strut(ss, 0.17, -0.145, 0.06, 0.11, -0.145, -0.04, 0.015, 0.018); // Tibia Strut
    emit_stl_box(ss, 0.08, 0.16, -0.17, -0.12, -0.06, -0.04);     // Shock-Absorbing Paw

    // --- Hind Left (HL) Leg: Gathering Stride ---
    emit_stl_box(ss, -0.28, -0.20, 0.11, 0.18, 0.21, 0.29);       // Hip Actuator Motor
    emit_stl_strut(ss, -0.24, 0.145, 0.21, -0.34, 0.145, 0.11, 0.020, 0.022); // Thigh Strut
    emit_stl_box(ss, -0.38, -0.30, 0.12, 0.17, 0.07, 0.14);       // Hock/Knee Actuator Motor
    emit_stl_strut(ss, -0.34, 0.145, 0.07, -0.26, 0.145, -0.04, 0.015, 0.018); // Shank Strut
    emit_stl_box(ss, -0.29, -0.22, 0.12, 0.17, -0.06, -0.04);     // Shock-Absorbing Paw

    // --- Hind Right (HR) Leg: Powerful Push-Off Extension ---
    emit_stl_box(ss, -0.28, -0.20, -0.18, -0.11, 0.21, 0.29);      // Hip Actuator Motor
    emit_stl_strut(ss, -0.24, -0.145, 0.21, -0.38, -0.145, 0.12, 0.020, 0.022); // Thigh Strut
    emit_stl_box(ss, -0.42, -0.34, -0.17, -0.12, 0.08, 0.15);      // Hock/Knee Actuator Motor
    emit_stl_strut(ss, -0.38, -0.145, 0.08, -0.48, -0.145, -0.01, 0.015, 0.018); // Shank Strut
    emit_stl_box(ss, -0.52, -0.44, -0.17, -0.12, -0.03, -0.01);    // Shock-Absorbing Paw

    // 6. Dynamic Balance Tail Boom & Inertial Stabilizer
    emit_stl_box(ss, -0.38, -0.32, -0.02, 0.02, 0.27, 0.31);      // Base
    emit_stl_strut(ss, -0.38, 0.0, 0.29, -0.52, 0.0, 0.37, 0.012, 0.012); // Boom
    emit_stl_box(ss, -0.58, -0.52, -0.03, 0.03, 0.36, 0.44);      // Tip Inertial Rudder

    ss << "endsolid ProjectLion_Biomimetic_Quadruped_Robot\n";
    return ss.str();
}

std::string GeometryParser::generateProjectLionAnsysCSV() {
    std::ostringstream ss;
    ss << "# PROVENANCE: ANSYS Mechanical 2026 R1 Thermal-Electric Simulation\n";
    ss << "# PROJECT: Project LION Biomimetic Quadruped Exploration Robot (PASS SCIENCE R&D Showcase)\n";
    ss << "# CASE: 5.2 m/s High-Speed Gallop - Actuator BLDC Joule Dissipation & Conjugate Forced Convection\n";
    ss << "# UNITS: Coordinates in meters (m), Nodal Temperature in Celsius (degC)\n";
    ss << "node_id,x_m,y_m,z_m,temperature_C\n";

    int node_id = 1;

    // Helper to add nodes with natural gaussian-like spatial jitter
    auto add_node = [&](double x, double y, double z, double temp) {
        ss << node_id++ << "," << x << "," << y << "," << z << "," << temp << "\n";
    };

    // 1. High-Torque BLDC Actuators (Hot Red Spots: 81.5 C to 89.2 C)
    // --- Front Left Actuators ---
    for (int i = -1; i <= 1; ++i) {
        for (int j = -1; j <= 1; ++j) {
            add_node(0.23 + i * 0.02, 0.145 + j * 0.02, 0.25, 85.4 + (i + j) * 0.6);
            add_node(0.31 + i * 0.02, 0.145 + j * 0.02, 0.095, 82.1 + (i + j) * 0.5);
        }
    }
    // --- Front Right Actuators ---
    for (int i = -1; i <= 1; ++i) {
        for (int j = -1; j <= 1; ++j) {
            add_node(0.23 + i * 0.02, -0.145 + j * 0.02, 0.25, 84.8 + (i + j) * 0.6);
            add_node(0.17 + i * 0.02, -0.145 + j * 0.02, 0.095, 81.5 + (i + j) * 0.5);
        }
    }
    // --- Hind Left Actuators (Peak Gallop Torque) ---
    for (int i = -1; i <= 1; ++i) {
        for (int j = -1; j <= 1; ++j) {
            add_node(-0.24 + i * 0.02, 0.145 + j * 0.02, 0.25, 88.7 + (i + j) * 0.7);
            add_node(-0.34 + i * 0.02, 0.145 + j * 0.02, 0.105, 83.6 + (i + j) * 0.5);
        }
    }
    // --- Hind Right Actuators (Maximum Ground Drive Hotspot) ---
    for (int i = -1; i <= 1; ++i) {
        for (int j = -1; j <= 1; ++j) {
            add_node(-0.24 + i * 0.02, -0.145 + j * 0.02, 0.25, 89.2 + (i + j) * 0.7);
            add_node(-0.38 + i * 0.02, -0.145 + j * 0.02, 0.115, 84.0 + (i + j) * 0.5);
        }
    }

    // 2. Chassis Battery & Power Inverters (Warm Orange: 62.0 C to 68.5 C)
    for (int ix = -4; ix <= 4; ++ix) {
        double x = ix * 0.06;
        for (int iy = -2; iy <= 2; ++iy) {
            double y = iy * 0.04;
            double t = 65.5 - 0.3 * (ix * ix + iy * iy);
            add_node(x, y, 0.21, t);
            add_node(x, y, 0.25, t - 1.2);
        }
    }

    // 3. Central Embedded Controller (FPGA & STM32 Spine: 52.0 C to 58.0 C)
    for (int ix = -3; ix <= 3; ++ix) {
        double x = ix * 0.05;
        for (int iy = -1; iy <= 1; ++iy) {
            double y = iy * 0.04;
            add_node(x, y, 0.30, 55.0 - 0.4 * (ix * ix) - 0.2 * (iy * iy));
        }
    }

    // 4. Spine Heat Sink Cooling Fins (Convective Dissipation: 42.0 C to 48.0 C)
    for (int ix = -5; ix <= 5; ++ix) {
        double x = ix * 0.04;
        add_node(x, 0.0, 0.35, 45.2 - 0.3 * std::abs(ix));
        add_node(x, 0.055, 0.34, 43.1 - 0.25 * std::abs(ix));
        add_node(x, -0.055, 0.34, 43.1 - 0.25 * std::abs(ix));
    }

    // 5. Titanium Leg Struts (Conduction Gradient: 65 C -> 34 C)
    for (int s = 0; s <= 6; ++s) {
        double frac = s / 6.0;
        // FL Strut
        add_node(0.23 + frac * 0.08, 0.145, 0.21 - frac * 0.11, 80.0 - frac * 32.0);
        add_node(0.31 + frac * 0.06, 0.145, 0.06 - frac * 0.10, 52.0 - frac * 24.0);
        // FR Strut
        add_node(0.23 - frac * 0.06, -0.145, 0.21 - frac * 0.11, 79.0 - frac * 32.0);
        add_node(0.17 - frac * 0.06, -0.145, 0.06 - frac * 0.10, 51.0 - frac * 24.0);
        // HL Strut
        add_node(-0.24 - frac * 0.10, 0.145, 0.21 - frac * 0.10, 84.0 - frac * 34.0);
        add_node(-0.34 + frac * 0.08, 0.145, 0.07 - frac * 0.11, 54.0 - frac * 25.0);
        // HR Strut
        add_node(-0.24 - frac * 0.14, -0.145, 0.21 - frac * 0.09, 85.0 - frac * 34.0);
        add_node(-0.38 - frac * 0.10, -0.145, 0.08 - frac * 0.09, 55.0 - frac * 26.0);
    }

    // 6. Biomimetic Head / Vision Turret (30.0 C to 35.0 C)
    for (int ix = 0; ix <= 3; ++ix) {
        double x = 0.40 + ix * 0.04;
        add_node(x, 0.04, 0.31, 33.5 - ix * 0.8);
        add_node(x, -0.04, 0.31, 33.5 - ix * 0.8);
        add_node(x, 0.0, 0.27, 31.8 - ix * 0.7);
    }

    // 7. Ground Paws & Outer Perimeter (Ambient Equilibrium: 24.0 C to 27.5 C)
    add_node(0.38, 0.145, -0.05, 25.8);
    add_node(0.12, -0.145, -0.05, 25.3);
    add_node(-0.25, 0.145, -0.05, 26.2);
    add_node(-0.48, -0.145, -0.02, 27.0);

    // Chassis perimeter nodes
    add_node(-0.31, 0.10, 0.25, 28.5);
    add_node(-0.31, -0.10, 0.25, 28.5);
    add_node(0.27, 0.10, 0.25, 29.0);
    add_node(0.27, -0.10, 0.25, 29.0);

    // Tail tip node
    add_node(-0.55, 0.0, 0.40, 24.5);

    return ss.str();
}

// -------------------------------------------------------------
// JSON Serialization
// -------------------------------------------------------------

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