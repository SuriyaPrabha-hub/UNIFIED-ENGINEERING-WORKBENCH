cmake_minimum_required(VERSION 3.16)
project(UnifiedEngineeringWorkbench LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Optimization flags
if(MSVC)
    add_compile_options(/O2 /W4 /permissive-)
else()
    add_compile_options(-O3 -Wall -Wextra -pthread)
endif()

# Include directories
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/backend/include
)

# Core library sources
set(CORE_SOURCES
    backend/src/thermal_fea.cpp
    backend/src/geometry_parser.cpp
    backend/src/performance_benchmark.cpp
    backend/src/hardware_mock.cpp
    backend/src/neural_net.cpp
)

# REST API Server Executable
find_package(Threads REQUIRED)

add_executable(workbench_server
    ${CORE_SOURCES}
    backend/src/server_main.cpp
)

target_link_libraries(workbench_server PRIVATE Threads::Threads)

if(WIN32)
    target_link_libraries(workbench_server PRIVATE ws2_32)
endif()

# Unit Verification Test Executable
add_executable(workbench_tests
    ${CORE_SOURCES}
    backend/tests/unit_tests.cpp
)

enable_testing()
add_test(NAME AllNumericalAndSystemTests COMMAND workbench_tests)
