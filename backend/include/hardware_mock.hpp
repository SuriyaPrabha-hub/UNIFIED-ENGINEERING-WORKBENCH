#pragma once
#include <string>
#include <vector>
#include <chrono>
#include "json.hpp"

#ifdef ERROR_TIMEOUT
#undef ERROR_TIMEOUT
#endif

namespace workbench {

enum class DeviceType {
    MICROCONTROLLER, // e.g. STM32H743ZI (ARM Cortex-M7)
    FPGA,            // e.g. Xilinx Artix-7 XC7A100T
    JTAG_DEBUGGER    // e.g. SEGGER J-Link Base / ST-Link V3
};

enum class DeviceStatus {
    DEV_DISCONNECTED,
    DEV_CONNECTING,
    DEV_CONNECTED,
    DEV_ERROR_TIMEOUT,
    DEV_ERROR_COMMUNICATION
};

struct DeviceTelemetry {
    uint32_t packet_id = 0;
    double timestamp_s = 0.0;
    double supply_voltage_V = 0.0;
    double current_draw_mA = 0.0;
    double temperature_C = 0.0;
    uint32_t status_flags = 0;
    std::string custom_data; // e.g., MCU loop cycle, FPGA PLL lock state, JTAG TCK frequency
};

struct DeviceInfo {
    std::string id;
    std::string name;
    DeviceType type;
    std::string type_name;
    DeviceStatus status;
    std::string status_name;
    std::string serial_number;
    std::string firmware_version;
    std::string interface_type; // "USB CDC-ACM / UART", "USB-FTDI / SPI", "High-Speed USB 2.0 / SWD-JTAG"
    double operating_voltage_V;
    std::string voltage_domain; // "3.3V Logic", "1.8V Bank / 1.0V Core (Level-Shifted)", "Target Sense: 1.2V-5.0V"
    std::vector<std::string> capabilities;
    DeviceTelemetry last_telemetry;
    std::string last_error_message;
    bool simulation_flag = true; // Clearly labelled simulated behaviour
};

class HardwareMockManager {
public:
    HardwareMockManager();

    // Device enumeration & capabilities
    std::vector<DeviceInfo> discoverDevices();

    // Connect / Disconnect
    bool connectDevice(const std::string& device_id);
    bool disconnectDevice(const std::string& device_id);

    // Telemetry polling
    DeviceTelemetry pollTelemetry(const std::string& device_id);

    // Recoverable failure simulation
    void injectFailure(const std::string& device_id, const std::string& failure_type = "TIMEOUT");
    bool recoverDevice(const std::string& device_id);

    nlohmann::json getDevicesJson();
    nlohmann::json getHardwareArchitectureDocJson();

private:
    std::vector<DeviceInfo> devices_;
    uint32_t telemetry_counter_ = 0;
    std::chrono::steady_clock::time_point start_time_;
};

} // namespace workbench
