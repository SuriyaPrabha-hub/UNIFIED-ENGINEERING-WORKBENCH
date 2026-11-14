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

std::string GeometryParser::generateFormulaEPowerUnitSTL() {
    std::ostringstream ss;
    ss << "solid FormulaE_SiC_Inverter_AxialFlux_Powertrain\n";

    // 1. Dual Silicon Carbide (SiC) Inverter Enclosure (CNC 6061-T6 Aluminum Housing)
    emit_stl_box(ss, -0.22, 0.22, -0.14, 0.14, 0.06, 0.18);

    // 2. Inverter Top Cover Plate Cooling Fins (Convective Airflow Fins)
    emit_stl_box(ss, -0.20, 0.20, -0.11, -0.09, 0.18, 0.205);
    emit_stl_box(ss, -0.20, 0.20, -0.06, -0.04, 0.18, 0.205);
    emit_stl_box(ss, -0.20, 0.20, -0.01, 0.01, 0.18, 0.205);
    emit_stl_box(ss, -0.20, 0.20, 0.04, 0.06, 0.18, 0.205);
    emit_stl_box(ss, -0.20, 0.20, 0.09, 0.11, 0.18, 0.205);

    // 3. 800V High-Voltage DC Link Terminal Studs & Isolation Barrier
    emit_stl_box(ss, -0.19, -0.13, -0.08, -0.03, 0.18, 0.24); // DC+ High-Voltage Lug
    emit_stl_box(ss, -0.19, -0.13, 0.03, 0.08, 0.18, 0.24);  // DC- High-Voltage Lug
    emit_stl_box(ss, -0.20, -0.12, -0.015, 0.015, 0.18, 0.25); // Dielectric Safety Barrier

    // 4. Embedded Gate Driver & Real-Time Controller Bay (STM32/FPGA Low-Voltage Housing - Task E)
    emit_stl_box(ss, -0.11, 0.11, 0.14, 0.185, 0.08, 0.165);
    emit_stl_box(ss, -0.08, 0.08, 0.185, 0.205, 0.10, 0.145); // Automotive Wire Harness Port

    // 5. Direct-Contact Pin-Fin Liquid Cold Plate (Water-Glycol Coolant Manifold)
    emit_stl_box(ss, -0.24, 0.24, -0.16, 0.16, 0.02, 0.06);
    // Coolant Inlet & Outlet Quick-Disconnect Fittings
    emit_stl_box(ss, -0.28, -0.24, -0.11, -0.06, 0.025, 0.055); // Coolant Inlet Port (32 C)
    emit_stl_box(ss, -0.28, -0.24, 0.06, 0.11, 0.025, 0.055);   // Coolant Outlet Port (42 C)

    // 6. 3-Phase High-Current AC Busbars (Phase U, V, W to Motor)
    emit_stl_box(ss, 0.22, 0.27, -0.08, -0.04, 0.07, 0.13); // Phase U Busbar
    emit_stl_box(ss, 0.22, 0.27, -0.02, 0.02, 0.07, 0.13);  // Phase V Busbar
    emit_stl_box(ss, 0.22, 0.27, 0.04, 0.08, 0.07, 0.13);   // Phase W Busbar

    // 7. YASA-Style Axial-Flux Traction Motor (Stator Shell & Radial Stator Poles)
    emit_stl_box(ss, -0.20, 0.20, -0.20, 0.20, -0.12, 0.02); // Main Stator Enclosure
    // Stator Octagonal Corner Chamfers for Cylindrical Motor Profile
    emit_stl_box(ss, -0.22, -0.14, -0.22, -0.14, -0.11, 0.01);
    emit_stl_box(ss, 0.14, 0.22, -0.22, -0.14, -0.11, 0.01);
    emit_stl_box(ss, -0.22, -0.14, 0.14, 0.22, -0.11, 0.01);
    emit_stl_box(ss, 0.14, 0.22, 0.14, 0.22, -0.11, 0.01);

    // 8. Radial Electromagnetic Concentrated Stator Coils (High Torque Density Copper Windings)
    emit_stl_box(ss, -0.17, -0.11, -0.03, 0.03, -0.10, 0.0);   // Pole 180 deg
    emit_stl_box(ss, 0.11, 0.17, -0.03, 0.03, -0.10, 0.0);    // Pole 0 deg
    emit_stl_box(ss, -0.03, 0.03, -0.17, -0.11, -0.10, 0.0);   // Pole 270 deg
    emit_stl_box(ss, -0.03, 0.03, 0.11, 0.17, -0.10, 0.0);    // Pole 90 deg
    emit_stl_box(ss, 0.07, 0.14, 0.07, 0.14, -0.10, 0.0);     // Pole 45 deg
    emit_stl_box(ss, -0.14, -0.07, 0.07, 0.14, -0.10, 0.0);   // Pole 135 deg
    emit_stl_box(ss, -0.14, -0.07, -0.14, -0.07, -0.10, 0.0); // Pole 225 deg
    emit_stl_box(ss, 0.07, 0.14, -0.14, -0.07, -0.10, 0.0);   // Pole 315 deg

    // 9. Central Rotor Hub & Output Spline Shaft (Drives Planetary Reduction Gearbox)
    emit_stl_box(ss, -0.045, 0.045, -0.045, 0.045, -0.18, 0.02); // Center Drive Spline Shaft
    emit_stl_box(ss, -0.07, 0.07, -0.07, 0.07, -0.08, 0.0);      // High-Speed Bearing Cartridge

    // 10. Vehicle Subframe Structural Mounting Flanges (Chassis Ground Brackets)
    emit_stl_box(ss, -0.27, -0.20, 0.16, 0.23, -0.02, 0.02);   // FL Mounting Lug
    emit_stl_box(ss, 0.20, 0.27, 0.16, 0.23, -0.02, 0.02);    // FR Mounting Lug
    emit_stl_box(ss, -0.27, -0.20, -0.23, -0.16, -0.02, 0.02); // RL Mounting Lug
    emit_stl_box(ss, 0.20, 0.27, -0.23, -0.16, -0.02, 0.02);  // RR Mounting Lug

    ss << "endsolid FormulaE_SiC_Inverter_AxialFlux_Powertrain\n";
    return ss.str();
}

std::string GeometryParser::generateFormulaEAnsysCSV() {
    std::ostringstream ss;
    ss << "# PROVENANCE: ANSYS Mechanical 2026 R1 Electro-Thermal Multiphysics Simulation\n";
    ss << "# PROJECT: Formula-E Gen3 250 kW Hypercar Powertrain (PASS SCIENCE R&D Showcase)\n";
    ss << "# CASE: 0-200 km/h Standing-Start Launch Acceleration - SiC Junction Dissipation & Conjugate Liquid Cooling\n";
    ss << "# UNITS: Coordinates in meters (m), Nodal Temperature in Celsius (degC)\n";
    ss << "node_id,x_m,y_m,z_m,temperature_C\n";

    int node_id = 1;

    // Helper to emit nodes
    auto add_node = [&](double x, double y, double z, double temp) {
        ss << node_id++ << "," << x << "," << y << "," << z << "," << temp << "\n";
    };

    // 1. Silicon Carbide (SiC) Half-Bridge Power Switches (Critical Launch Hotspots: 118.0 C to 124.8 C)
    const double module_x[6] = {-0.14, -0.08, -0.02, 0.04, 0.10, 0.15};
    const double base_temps[6] = {122.4, 121.2, 124.8, 123.6, 121.8, 119.5};
    for (int m = 0; m < 6; ++m) {
        double mx = module_x[m];
        double btemp = base_temps[m];
        for (int ix = -1; ix <= 1; ++ix) {
            for (int iy = -1; iy <= 1; ++iy) {
                double x = mx + ix * 0.015;
                double y = -0.05 + iy * 0.02;
                double temp = btemp - (ix * ix + iy * iy) * 0.7;
                add_node(x, y, 0.08, temp);
                add_node(x, y, 0.065, temp - 3.8); // Silicon-to-copper substrate gradient
            }
        }
    }

    // 2. Axial-Flux Stator Copper Windings (Peak I^2*R Launch Torque: 86.5 C to 96.5 C)
    const double pole_angles[8] = {0, 45, 90, 135, 180, 225, 270, 315};
    const double pole_peak_temps[8] = {94.2, 96.5, 95.8, 93.1, 92.4, 95.0, 96.1, 93.8};
    for (int p = 0; p < 8; ++p) {
        double rad = pole_angles[p] * 3.141592653589793 / 180.0;
        double cx = 0.13 * std::cos(rad);
        double cy = 0.13 * std::sin(rad);
        double ptemp = pole_peak_temps[p];
        for (int i = -1; i <= 1; ++i) {
            for (int j = -1; j <= 1; ++j) {
                double x = cx + i * 0.012;
                double y = cy + j * 0.012;
                add_node(x, y, -0.06, ptemp - (i * i + j * j) * 1.2);
                add_node(x, y, -0.09, ptemp - 4.5 - (i * i + j * j) * 0.9);
            }
        }
    }

    // 3. 3-Phase AC Output Busbars & DC-Link Busbars (Conduction Losses: 72.0 C to 79.5 C)
    const double phase_y[3] = {-0.06, 0.0, 0.06};
    for (int ph = 0; ph < 3; ++ph) {
        double py = phase_y[ph];
        for (int step = 0; step < 5; ++step) {
            double x = 0.22 + step * 0.01;
            add_node(x, py, 0.09, 78.5 - step * 1.1);
            add_node(x, py, 0.11, 76.8 - step * 1.0);
        }
    }

    // DC Link Busbars
    for (int s = 0; s < 4; ++s) {
        add_node(-0.16 + s * 0.01, -0.05, 0.20, 74.2 - s * 0.8);
        add_node(-0.16 + s * 0.01, 0.05, 0.20, 73.6 - s * 0.8);
    }

    // 4. DC-Link Metalized Film Capacitor Bank (Ripple Current Heating: 58.0 C to 64.5 C)
    for (int ix = -3; ix <= 3; ++ix) {
        double x = ix * 0.05;
        for (int iy = -1; iy <= 1; ++iy) {
            double y = 0.05 + iy * 0.035;
            double t = 62.5 - 0.4 * (ix * ix) - 0.3 * (iy * iy);
            add_node(x, y, 0.12, t);
            add_node(x, y, 0.15, t - 1.8);
        }
    }

    // 5. Embedded Gate Driver & Real-Time Controller (STM32 / FPGA Board - Task E: 48.0 C to 54.5 C)
    for (int ix = -3; ix <= 3; ++ix) {
        double x = ix * 0.03;
        for (int iy = 0; iy <= 2; ++iy) {
            double y = 0.145 + iy * 0.015;
            add_node(x, y, 0.12, 53.8 - 0.3 * (ix * ix) - 0.5 * iy);
        }
    }

    // 6. Direct-Contact Liquid Pin-Fin Cold Plate (Water-Glycol Coolant Flow: 32.0 C to 42.0 C)
    // Coolant enters at inlet (-0.26, -0.08, 0.04) at 32 C, absorbs heat, exits at (+0.24, 0.08) at 41.8 C
    for (int ix = -5; ix <= 5; ++ix) {
        double frac_x = (ix + 5) / 10.0;
        double x = ix * 0.042;
        for (int iy = -3; iy <= 3; ++iy) {
            double y = iy * 0.045;
            double flow_temp = 32.0 + frac_x * 9.8 + (iy > 0 ? 1.5 : 0.0);
            add_node(x, y, 0.035, flow_temp);
            add_node(x, y, 0.050, flow_temp + 3.2); // Interface plate conduction
        }
    }

    // Inlet and outlet ports
    add_node(-0.26, -0.08, 0.04, 32.1);
    add_node(-0.27, -0.08, 0.04, 32.0);
    add_node(-0.26, 0.08, 0.04, 41.5);
    add_node(-0.27, 0.08, 0.04, 41.8);

    // 7. Aluminum Chassis Shell, Stator Casing & Subframe Mounting Tabs (Ambient: 24.0 C to 28.5 C)
    // 4 Chassis Mounts
    add_node(-0.24, 0.19, 0.0, 25.2);
    add_node(0.24, 0.19, 0.0, 26.4);
    add_node(-0.24, -0.19, 0.0, 24.8);
    add_node(0.24, -0.19, 0.0, 25.9);

    // Outer Perimeter Shell Nodes
    add_node(-0.21, -0.13, 0.10, 27.5);
    add_node(0.21, -0.13, 0.10, 28.2);
    add_node(-0.21, 0.13, 0.10, 26.8);
    add_node(0.21, 0.13, 0.10, 27.9);
    add_node(0.0, -0.19, -0.10, 26.1);
    add_node(0.0, 0.19, -0.10, 25.5);
    add_node(0.0, 0.0, -0.17, 24.0); // Center spline shaft tip

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