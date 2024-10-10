cmake_minimum_required(VERSION 3.12)
project(CCXPoolPing)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Add an option for specifying wxWidgets directory
set(wxWidgets_DIR "" CACHE PATH "Directory containing wxWidgetsConfig.cmake")

# Find wxWidgets
if(wxWidgets_DIR)
    set(wxWidgets_CONFIG_EXECUTABLE "${wxWidgets_DIR}/bin/wx-config" CACHE FILEPATH "Path to wx-config")
    find_package(wxWidgets REQUIRED COMPONENTS ${wxWidgets_COMPONENTS} HINTS ${wxWidgets_DIR})
else()
    find_package(wxWidgets REQUIRED COMPONENTS ${wxWidgets_COMPONENTS})
endif()

# If wxWidgets is still not found, provide instructions
if(NOT wxWidgets_FOUND)
    message(FATAL_ERROR "wxWidgets not found. Please specify the wxWidgets directory using -DwxWidgets_DIR=/path/to/wxWidgets")
endif()

# Include wxWidgets use file
include(${wxWidgets_USE_FILE})

# Add source files
set(SOURCES
    ping_ccx_pool.cpp
)

# Add header files
set(HEADERS
    ping_ccx_pool.hpp
)

# Create executable
add_executable(CCXPoolPing ${SOURCES} ${HEADERS})

# Link wxWidgets libraries
target_link_libraries(CCXPoolPing PRIVATE ${wxWidgets_LIBRARIES})

# Include directories
target_include_directories(CCXPoolPing PRIVATE ${wxWidgets_INCLUDE_DIRS})

# Set compiler flags
if(MSVC)
    target_compile_options(CCXPoolPing PRIVATE /W4)
else()
    target_compile_options(CCXPoolPing PRIVATE -Wall -Wextra -pedantic)
endif()
