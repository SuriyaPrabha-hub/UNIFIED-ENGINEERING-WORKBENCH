#include "hardware_mock.hpp"
#include <random>
#include <cmath>

namespace workbench {

HardwareMockManager::HardwareMockManager() {
    start_time_ = std::chrono::steady_clock::now();

    // 1. Microcontroller Board
    DeviceInfo mcu;
    mcu.id = "dev_mcu_01";
    mcu.name = "STM32H743ZI Nucleo-144 (MCU)";
    mcu.type = DeviceType::MICROCONTROLLER;
    mcu.type_name = "Microcontroller";
    mcu.status = DeviceStatus::DEV_DISCONNECTED;
    mcu.status_name = "Disconnected";
    mcu.serial_number = "ST-H7-8849201A";
    mcu.firmware_version = "v2.4.1-rc3";
    mcu.interface_type = "USB CDC-ACM Virtual COM Port (115200 8N1)";
    mcu.operating_voltage_V = 3.3;
    mcu.voltage_domain = "3.3V Logic (Direct VDD)";
    mcu.capabilities = {
        "ARM Cortex-M7 @ 480 MHz",
        "2MB Dual-bank Flash, 1MB RAM",
        "Hardware Double-Precision FPU",
        "Hardware Cryptographic Acceleration",
        "UART/SPI/I2C/CAN-FD Telemetry"
    };
    mcu.last_telemetry.supply_voltage_V = 3.31;
    mcu.last_telemetry.current_draw_mA = 84.5;
    mcu.last_telemetry.temperature_C = 38.2;
    mcu.last_telemetry.custom_data = "SysTick: 1248902 | Free Heap: 842 KB";

    // 2. FPGA Board
    DeviceInfo fpga;
    fpga.id = "dev_fpga_01";
    fpga.name = "Xilinx Artix-7 XC7A100T Board";
    fpga.type = DeviceType::FPGA;
    fpga.type_name = "FPGA";
    fpga.status = DeviceStatus::DEV_DISCONNECTED;
    fpga.status_name = "Disconnected";
    fpga.serial_number = "XLX-A7-100T-59281";
    fpga.firmware_version = "Bitstream MD5: e4d909c2";
    fpga.interface_type = "FTDI FT2232H High-Speed USB to SPI/FIFO";
    fpga.operating_voltage_V = 1.8;
    fpga.voltage_domain = "1.8V VCCO Bank / 1.0V VCCINT Core (Bidirectional Level-Shifted TXS0108E)";
    fpga.capabilities = {
        "101,440 Logic Cells, 240 DSP Slices",
        "4,860 Kb Block RAM",
        "Quad 6.6 Gb/s GTP Transceivers",
        "Configurable MicroBlaze Soft Core",
        "Real-time Systolic FEA Accelerator Pipeline"
    };
    fpga.last_telemetry.supply_voltage_V = 1.79;
    fpga.last_telemetry.current_draw_mA = 340.2;
    fpga.last_telemetry.temperature_C = 45.7;
    fpga.last_telemetry.custom_data = "MMCM/PLL Locked: YES | FPGA Die XADC: 45.7 C";

    // 3. JTAG Debug Adapter
    DeviceInfo jtag;
    jtag.id = "dev_jtag_01";
    jtag.name = "SEGGER J-Link / ST-Link V3 Debug Probe";
    jtag.type = DeviceType::JTAG_DEBUGGER;
    jtag.type_name = "JTAG Debug Probe";
    jtag.status = DeviceStatus::DEV_DISCONNECTED;
    jtag.status_name = "Disconnected";
    jtag.serial_number = "JLK-PROBE-994821";
    jtag.firmware_version = "J-Link ARM V11.0 compiled Sep 2025";
    jtag.interface_type = "USB 2.0 High-Speed (480 Mbps) Bulk Endpoint";
    jtag.operating_voltage_V = 3.3;
    jtag.voltage_domain = "Target Sense VTref: 1.2V - 5.0V (Auto Voltage Tracking)";
    jtag.capabilities = {
        "IEEE 1149.1 JTAG Boundary Scan Engine",
        "ARM 2-wire Serial Wire Debug (SWD)",
        "Hardware Breakpoints & Watchpoints",
        "Direct Memory Access (AHB-AP / AXI-AP)",
        "Target Supply Current Measurement"
    };
    jtag.last_telemetry.supply_voltage_V = 3.30;
    jtag.last_telemetry.current_draw_mA = 18.1;
    jtag.last_telemetry.temperature_C = 31.4;
    jtag.last_telemetry.custom_data = "TCK Speed: 12.0 MHz | Target VTref: 3.29 V";

    devices_.push_back(mcu);
    devices_.push_back(fpga);
    devices_.push_back(jtag);
}

std::vector<DeviceInfo> HardwareMockManager::discoverDevices() {
    return devices_;
}

bool HardwareMockManager::connectDevice(const std::string& device_id) {
    for (auto& dev : devices_) {
        if (dev.id == device_id) {
            dev.status = DeviceStatus::DEV_CONNECTED;
            dev.status_name = "Connected";
            dev.last_error_message = "";
            return true;
        }
    }
    return false;
}

bool HardwareMockManager::disconnectDevice(const std::string& device_id) {
    for (auto& dev : devices_) {
        if (dev.id == device_id) {
            dev.status = DeviceStatus::DEV_DISCONNECTED;
            dev.status_name = "Disconnected";
            dev.last_error_message = "";
            return true;
        }
    }
    return false;
}

DeviceTelemetry HardwareMockManager::pollTelemetry(const std::string& device_id) {
    telemetry_counter_++;
    auto now = std::chrono::steady_clock::now();
    double elapsed_s = std::chrono::duration<double>(now - start_time_).count();

    for (auto& dev : devices_) {
        if (dev.id == device_id) {
            if (dev.status == DeviceStatus::DEV_ERROR_TIMEOUT) {
                dev.last_telemetry.status_flags = 0xDEADBEEF;
                dev.last_telemetry.custom_data = "TIMEOUT: No ACK packet received from target bus.";
                return dev.last_telemetry;
            }

            dev.last_telemetry.packet_id = telemetry_counter_;
            dev.last_telemetry.timestamp_s = elapsed_s;

            double noise_v = ((rand() % 20) - 10) * 0.001;
            double noise_i = ((rand() % 40) - 20) * 0.1;
            double noise_t = ((rand() % 10) - 5) * 0.05;

            if (dev.type == DeviceType::MICROCONTROLLER) {
                dev.last_telemetry.supply_voltage_V = 3.30 + noise_v;
                dev.last_telemetry.current_draw_mA = 84.5 + noise_i;
                dev.last_telemetry.temperature_C = 38.2 + noise_t;
                dev.last_telemetry.custom_data = "SysTick: " + std::to_string(telemetry_counter_ * 100) + " | Free Heap: 842 KB";
            } else if (dev.type == DeviceType::FPGA) {
                dev.last_telemetry.supply_voltage_V = 1.80 + noise_v;
                dev.last_telemetry.current_draw_mA = 340.2 + noise_i;
                dev.last_telemetry.temperature_C = 45.7 + noise_t;
                dev.last_telemetry.custom_data = "MMCM PLL Locked: YES | FPGA Die XADC: " + std::to_string(dev.last_telemetry.temperature_C).substr(0, 4) + " C";
            } else if (dev.type == DeviceType::JTAG_DEBUGGER) {
                dev.last_telemetry.supply_voltage_V = 3.30 + noise_v;
                dev.last_telemetry.current_draw_mA = 18.1 + noise_i * 0.1;
                dev.last_telemetry.temperature_C = 31.4 + noise_t;
                dev.last_telemetry.custom_data = "TCK: 12.0 MHz | Target VTref: " + std::to_string(3.29 + noise_v).substr(0, 4) + " V";
            }

            return dev.last_telemetry;
        }
    }
    return DeviceTelemetry{};
}

void HardwareMockManager::injectFailure(const std::string& device_id, const std::string& failure_type) {
    for (auto& dev : devices_) {
        if (dev.id == device_id) {
            dev.status = DeviceStatus::DEV_ERROR_TIMEOUT;
            dev.status_name = "Error (Timeout)";
            dev.last_error_message = "Target response timed out (1500 ms). Communication link stalled.";
            dev.last_telemetry.status_flags = 0xEE01;
            dev.last_telemetry.custom_data = "BUS FAULT: Timeout waiting for target sync frame.";
            return;
        }
    }
}

bool HardwareMockManager::recoverDevice(const std::string& device_id) {
    for (auto& dev : devices_) {
        if (dev.id == device_id) {
            dev.status = DeviceStatus::DEV_CONNECTED;
            dev.status_name = "Connected";
            dev.last_error_message = "Recovered successfully via bus re-sync and hardware reset handshake.";
            dev.last_telemetry.status_flags = 0x0001; // Normal
            return true;
        }
    }
    return false;
}

nlohmann::json HardwareMockManager::getDevicesJson() {
    nlohmann::json arr = nlohmann::json::array();
    for (auto& d : devices_) {
        if (d.status == DeviceStatus::DEV_CONNECTED) {
            pollTelemetry(d.id);
        }
        nlohmann::json item;
        item["id"] = d.id;
        item["name"] = d.name;
        item["type"] = d.type_name;
        item["status"] = d.status_name;
        item["serial_number"] = d.serial_number;
        item["firmware_version"] = d.firmware_version;
        item["interface_type"] = d.interface_type;
        item["operating_voltage_V"] = d.operating_voltage_V;
        item["voltage_domain"] = d.voltage_domain;
        item["capabilities"] = d.capabilities;
        item["simulation_flag"] = d.simulation_flag;
        item["last_error"] = d.last_error_message;
        item["telemetry"] = {
            {"packet_id", d.last_telemetry.packet_id},
            {"timestamp_s", d.last_telemetry.timestamp_s},
            {"voltage_V", d.last_telemetry.supply_voltage_V},
            {"current_mA", d.last_telemetry.current_draw_mA},
            {"temperature_C", d.last_telemetry.temperature_C},
            {"custom_data", d.last_telemetry.custom_data}
        };
        arr.push_back(item);
    }
    return arr;
}

nlohmann::json HardwareMockManager::getHardwareArchitectureDocJson() {
    nlohmann::json doc;
    doc["title"] = "Unified Modular Workbench - Embedded Hardware Architecture Specification";
    doc["jtag_rationale"] = 
        "CRITICAL ARCHITECTURAL DISTINCTION: A JTAG debug adapter (e.g. SEGGER J-Link / ST-Link) "
        "is a specialized hardware test/debug access port (TAP) controller operating IEEE 1149.1 / ARM SWD "
        "protocol. It is strictly NOT a generic interchangeable compute board. Unlike the MCU or FPGA which "
        "execute computational firmware/bitstreams, the JTAG probe owns the hardware debug signals (TCK, TMS, TDI, TDO, nTRST, nSRST) "
        "to drive boundary scan registers, halt CPU cores, and inspect memory buses. JTAG adapters feature auto-sensing "
        "voltage buffers (1.2V-5.0V) rather than supplying raw computation power.";

    nlohmann::json pin_table = nlohmann::json::array({
        {
            {"subsystem", "Host USB Interface"},
            {"pin_signal", "VBUS (5.0V), D-, D+, GND"},
            {"voltage_domain", "5.0V USB standard"},
            {"level_shifting", "Not required (Direct USB controller)"},
            {"connector", "USB Type-C / Micro-B"},
            {"protocol", "USB 2.0 Full/High-Speed CDC-ACM / FTDI FIFO"}
        },
        {
            {"subsystem", "Microcontroller Core"},
            {"pin_signal", "VDD (3.3V), VSS (GND), NRST, BOOT0"},
            {"voltage_domain", "3.3V Logic"},
            {"level_shifting", "Native 3.3V domain"},
            {"connector", "2.54mm Pin Header / Morpho ST connector"},
            {"protocol", "UART (PA9/PA10) @ 115200 8N1"}
        },
        {
            {"subsystem", "FPGA I/O Banks"},
            {"pin_signal", "VCCO_0 (1.8V), VCCINT (1.0V), SPI_MOSI, SPI_MISO, SPI_SCK, CS"},
            {"voltage_domain", "1.8V I/O Bank (Directly vulnerable to 3.3V overvoltage!)"},
            {"level_shifting", "Mandatory Bidirectional Level Shifter (TI TXS0108E / TXB0104) 1.8V <-> 3.3V"},
            {"connector", "Pmod Standard 2x6 / Samtec Q-Strip"},
            {"protocol", "Synchronous SPI @ 25 MHz with DMA"}
        },
        {
            {"subsystem", "JTAG Debug Bus"},
            {"pin_signal", "VTref (Sense), TCK/SWCLK, TMS/SWDIO, TDI, TDO/SWO, nSRST, GND"},
            {"voltage_domain", "Target Sense VTref (Tracks target 1.2V to 3.3V)"},
            {"level_shifting", "Internal dynamic level-translating line drivers in debug probe"},
            {"connector", "Standard 10-pin 1.27mm Cortex Debug / 20-pin 2.54mm JTAG"},
            {"protocol", "IEEE 1149.1 JTAG Boundary Scan / ARM SWD"}
        }
    });

    doc["pin_table"] = pin_table;
    doc["safe_integration_plan"] = 
        "1. GROUND INTEGRITY: Connect common star ground before applying power.\n"
        "2. VOLTAGE ISOLATION: Never connect 3.3V MCU GPIOs directly to 1.8V FPGA banks without bidirectional level shifters (TXS0108E).\n"
        "3. POWER SEQUENCING: Power target FPGA core (1.0V) and auxiliary (1.8V) before applying JTAG signals to prevent parasitic latch-up.\n"
        "4. JTAG OWNERSHIP: Debug adapter holds Master ownership of TCK/TMS; target boards act purely as TAP slaves.";
    
    return doc;
}

} // namespace workbench
