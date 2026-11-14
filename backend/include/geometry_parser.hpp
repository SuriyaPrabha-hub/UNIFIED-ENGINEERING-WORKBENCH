#pragma once
#include <string>
#include <vector>
#include <array>
#include "json.hpp"

namespace workbench {

struct Vec3 {
    double x = 0.0;
    double y = 0.0;
    double z = 0.0;
};

struct BoundingBox {
    Vec3 min{0.0, 0.0, 0.0};
    Vec3 max{0.0, 0.0, 0.0};
    Vec3 center{0.0, 0.0, 0.0};
    double diag_size = 0.0;
};

struct STLTriangle {
    Vec3 normal;
    Vec3 v1;
    Vec3 v2;
    Vec3 v3;
};

struct STLGeometry {
    std::string solid_name;
    int triangle_count = 0;
    std::vector<float> positions; // Flat array for Three.js BufferGeometry: [x1,y1,z1, x2,y2,z2, ...]
    std::vector<float> normals;   // Flat array: [nx1,ny1,nz1, ...]
    BoundingBox bbox;
    std::string validation_status;
    std::string warnings;

    nlohmann::json toJson() const;
};

struct AnsysNode {
    int node_id = 0;
    double x_m = 0.0;
    double y_m = 0.0;
    double z_m = 0.0;
    double temperature_C = 0.0;
};

struct AnsysPointCloud {
    int node_count = 0;
    std::vector<AnsysNode> nodes;
    double min_temp_C = 0.0;
    double max_temp_C = 0.0;
    double avg_temp_C = 0.0;
    BoundingBox bbox;
    std::string validation_status;
    std::string warnings;

    nlohmann::json toJson() const;
};

class GeometryParser {
public:
    static STLGeometry parseSTL(const std::string& buffer);
    static STLGeometry parseBinarySTL(const std::string& buffer);
    static STLGeometry parseAsciiSTL(const std::string& content);
    static STLGeometry parseAsciiSTLFile(const std::string& filepath);
    static STLGeometry parseSTLFile(const std::string& filepath);

    static AnsysPointCloud parseAnsysCSV(const std::string& content);
    static AnsysPointCloud parseAnsysCSVFile(const std::string& filepath);

    // Benchmark 1D Rod (Task C Reference)
    static std::string generateSyntheticSampleSTL();
    static std::string generateSyntheticSampleAnsysCSV();

    // Formula-E Electric Hypercar Power Unit (SiC Inverter + Axial-Flux Traction Motor FEA Showcase)
    static std::string generateFormulaEPowerUnitSTL();
    static std::string generateFormulaEAnsysCSV();

    // Compatibility aliases
    static std::string generateProjectLionSTL() { return generateFormulaEPowerUnitSTL(); }
    static std::string generateProjectLionAnsysCSV() { return generateFormulaEAnsysCSV(); }
};

} // namespace workbench
