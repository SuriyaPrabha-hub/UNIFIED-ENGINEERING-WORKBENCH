cmake_minimum_required(VERSION 3.16)
project(WorkbenchBackend LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include_directories(${CMAKE_CURRENT_SOURCE_DIR}/include)

set(CORE_SOURCES
    src/thermal_fea.cpp
    src/geometry_parser.cpp
    src/performance_benchmark.cpp
    src/hardware_mock.cpp
    src/neural_net.cpp
)

add_executable(workbench_server
    ${CORE_SOURCES}
    src/server_main.cpp
)

if(WIN32)
    target_link_libraries(workbench_server PRIVATE ws2_32)
endif()

add_executable(run_tests
    ${CORE_SOURCES}
    tests/unit_tests.cpp
)
