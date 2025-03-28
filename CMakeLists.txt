cmake_minimum_required(VERSION 3.0)

# Find Git
find_package(Git QUIET)

if(GIT_FOUND)
  # Retrieve the latest tag and strip the 'v' prefix if present
  execute_process(
    COMMAND ${GIT_EXECUTABLE} describe --tags --abbrev=0
    WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
    OUTPUT_VARIABLE GIT_TAG
    OUTPUT_STRIP_TRAILING_WHITESPACE
    ERROR_QUIET
  )

  # Strip the 'v' prefix if present
  if(GIT_TAG MATCHES "^v(.*)")
    set(VERSION "${CMAKE_MATCH_1}")
  else()
    set(VERSION "${GIT_TAG}")
  endif()

  # If no valid version was found, use fallback
  if(NOT VERSION)
    set(VERSION "0.0.0")
  endif()
else()
  # Fallback version if Git is not found
  set(VERSION "0.0.0")
endif()

# Set the project version
project(PingCCXPool VERSION ${VERSION})

# Output the version for verification
message(STATUS "Project version: ${PROJECT_VERSION}")

# Explicitly exclude pears-pool-sync directory from build
set(PEARS_POOL_SYNC_DIR "${CMAKE_CURRENT_SOURCE_DIR}/pears-pool-sync")
if(EXISTS ${PEARS_POOL_SYNC_DIR})
    message(STATUS "Excluding pears-pool-sync directory from build process")
    set_property(DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR} PROPERTY EXCLUDE_FROM_ALL ${PEARS_POOL_SYNC_DIR})
    
    # Add note about the pears-pool-sync directory
    message(STATUS "Note: The pears-pool-sync directory contains a separate Node.js application")
    message(STATUS "      for users who want to share mining pool information via peer-to-peer network.")
    message(STATUS "      This is not part of the main C++ application build.")
endif()

# Add option to auto-install nlohmann/json
option(AUTO_INSTALL_NLOHMANN_JSON "Automatically install nlohmann/json if not found" ON)

# Try to find nlohmann_json
find_package(nlohmann_json 3.2.0 QUIET)

if(NOT nlohmann_json_FOUND AND AUTO_INSTALL_NLOHMANN_JSON)
    include(ExternalProject)
    ExternalProject_Add(
        nlohmann_json
        GIT_REPOSITORY https://github.com/nlohmann/json.git
        GIT_TAG v3.11.2  # Specify the version you want
        CMAKE_ARGS -DCMAKE_INSTALL_PREFIX=${CMAKE_BINARY_DIR}/nlohmann_json_install
        UPDATE_COMMAND ""
    )
    set(NLOHMANN_JSON_INCLUDE_DIR ${CMAKE_BINARY_DIR}/nlohmann_json_install/include)
    add_library(nlohmann_json::nlohmann_json INTERFACE IMPORTED)
    set_target_properties(nlohmann_json::nlohmann_json PROPERTIES
        INTERFACE_INCLUDE_DIRECTORIES ${NLOHMANN_JSON_INCLUDE_DIR}
    )
    add_dependencies(nlohmann_json::nlohmann_json nlohmann_json)
else()
    find_package(nlohmann_json 3.2.0 REQUIRED)
endif()

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Check for Release-Debian build type for GLIBC 2.31 compatibility
string(FIND "${CMAKE_BUILD_TYPE}" "Release-Debian" DEBIAN_BUILD_POS)
if(NOT DEBIAN_BUILD_POS EQUAL -1)
    message(STATUS "Building with Debian compatibility mode for GLIBC 2.31")
    
    # Force static linking of C++ standard libraries to avoid GLIBC version issues
    set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} -static-libgcc -static-libstdc++")
    
    # Set actual build type to Release (stripping Release-Debian prefix)
    set(CMAKE_BUILD_TYPE "Release")
    
    # Add compatibility flags for GLIBC 2.31
    add_compile_options(-D_GLIBCXX_USE_CXX11_ABI=0)
    add_compile_options(-U_FILE_OFFSET_BITS)  # Undefine and then redefine to avoid conflicts
    add_compile_options(-D_FILE_OFFSET_BITS=64)
endif()

# Set output directory for the binary
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)

# Add an option for specifying wxWidgets directory
set(wxWidgets_DIR "" CACHE PATH "Directory containing wxWidgetsConfig.cmake")

# Find wxWidgets
find_package(wxWidgets REQUIRED COMPONENTS core base)
include(${wxWidgets_USE_FILE})

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
    mainFrame.cpp
)

# Add header files
set(HEADERS
    ping_ccx_pool.hpp
    mainFrame.hpp
)

# Create executable
add_executable(PingCCXPool ${SOURCES} ${HEADERS})

# Link wxWidgets libraries
target_link_libraries(PingCCXPool PRIVATE 
    ${wxWidgets_LIBRARIES}
    nlohmann_json::nlohmann_json
    # ... (other libraries)
)

# Include directories
target_include_directories(PingCCXPool PRIVATE ${wxWidgets_INCLUDE_DIRS})
target_compile_options(PingCCXPool PRIVATE ${wxWidgets_CXX_FLAGS})

# Set compiler flags
if(MSVC)
    target_compile_options(PingCCXPool PRIVATE /W4)
else()
    target_compile_options(PingCCXPool PRIVATE -Wall -Wextra -pedantic)
endif()

# Custom target for cleanup
add_custom_target(cleanup
    COMMAND ${CMAKE_COMMAND} -E remove_directory ${CMAKE_BINARY_DIR}/CMakeFiles
    COMMAND ${CMAKE_COMMAND} -E remove ${CMAKE_BINARY_DIR}/CMakeCache.txt
    COMMAND ${CMAKE_COMMAND} -E remove ${CMAKE_BINARY_DIR}/cmake_install.cmake
    COMMAND ${CMAKE_COMMAND} -E remove ${CMAKE_BINARY_DIR}/Makefile
    COMMENT "Cleaning up build directory, keeping only the bin folder"
)

# Define the path for the policy file
set(POLICY_FILE "${CMAKE_CURRENT_SOURCE_DIR}/org.acktarius.nping.policy")
set(POLICY_INSTALL_DIR "/usr/share/polkit-1/actions")

# Check if the policy file exists in the source directory
if(NOT EXISTS ${POLICY_FILE})
    message(FATAL_ERROR "Policy file ${POLICY_FILE} not found. Please ensure it exists in the project directory.")
endif()

# Prompt user for policy file installation
option(INSTALL_POLICY_FILE "Install the PolicyKit policy file for nping" OFF)
if(INSTALL_POLICY_FILE)
    message(STATUS "PolicyKit policy file will be installed to ${POLICY_INSTALL_DIR}")
    install(FILES ${POLICY_FILE} DESTINATION ${POLICY_INSTALL_DIR})
else()
    message(WARNING "PolicyKit policy file installation is disabled. The application may not function correctly without proper permissions.")
    message(STATUS "To install the policy file manually, copy ${POLICY_FILE} to ${POLICY_INSTALL_DIR}")
endif()

# Check for nmap (which includes nping)
find_program(NMAP_PROGRAM nmap)
if(NOT NMAP_PROGRAM)
    message(STATUS "nmap not found. Adding installation step.")
    list(APPEND MISSING_DEPENDENCIES nmap)
endif()

# If any dependencies are missing, create an installation target
if(MISSING_DEPENDENCIES)
    # Join the list of missing dependencies into a space-separated string
    string(JOIN " " INSTALL_COMMAND ${MISSING_DEPENDENCIES})
    
    # Add a custom target to install missing dependencies
    add_custom_target(install_dependencies
        COMMAND sudo apt-get update && sudo apt-get install -y ${INSTALL_COMMAND}
        COMMENT "Installing missing dependencies: ${INSTALL_COMMAND}"
    )
    
    # Make sure dependencies are installed before building the main target
    add_dependencies(${PingCCXPool} install_dependencies)
else()
    message(STATUS "All required dependencies found.")
endif()

# Copy pools.json to the bin directory
set(POOLS_JSON "${CMAKE_CURRENT_SOURCE_DIR}/pools.json")
if(EXISTS ${POOLS_JSON})
    add_custom_command(TARGET PingCCXPool POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E copy
                ${POOLS_JSON}
                ${CMAKE_RUNTIME_OUTPUT_DIRECTORY}/pools.json
        COMMENT "Copying pools.json to bin directory"
    )
    
    # Update the note about pear-pools.json with the correct local file name
    message(STATUS "Note: The application supports loading pools from user data directory (~/.local/share/PingCCXPool/pear-pools.json)")
    message(STATUS "      or local directory (./pools.json) if present.")
    message(STATUS "      The pear-pools.json file can be generated by the separate Pears application in the pears-pool-sync directory.")
    message(STATUS "      See the pears-pool-sync/README.md for more information on this optional component.")
else()
    message(WARNING "pools.json not found in the source directory. Make sure it exists before running the application.")
endif()

# Find Git
find_package(Git)

if(GIT_FOUND)
  # Get the current working branch
  execute_process(
    COMMAND ${GIT_EXECUTABLE} rev-parse --abbrev-ref HEAD
    WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
    OUTPUT_VARIABLE GIT_BRANCH
    OUTPUT_STRIP_TRAILING_WHITESPACE
  )

  # Get the latest abbreviated commit hash of the working branch
  execute_process(
    COMMAND ${GIT_EXECUTABLE} log -1 --format=%h
    WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
    OUTPUT_VARIABLE GIT_COMMIT_HASH
    OUTPUT_STRIP_TRAILING_WHITESPACE
  )
else()
  set(GIT_BRANCH "unknown")
  set(GIT_COMMIT_HASH "unknown")
endif()

# Add the binary tree to the search path for include files
include_directories(${CMAKE_BINARY_DIR}/generated)

# ... existing CMake configuration ...

find_package(Git QUIET)
if(GIT_FOUND)
  execute_process(
    COMMAND ${GIT_EXECUTABLE} describe --tags --always --dirty
    WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
    OUTPUT_VARIABLE GIT_VERSION
    ERROR_QUIET
    OUTPUT_STRIP_TRAILING_WHITESPACE
  )
else()
  set(GIT_VERSION "unknown")
endif()

# Define the version as a preprocessor macro
add_definitions(-DGIT_VERSION="${GIT_VERSION}")

# ... rest of your CMake configuration ...

# Copy pp.png to the bin directory
set(PP_PNG_SOURCE "${CMAKE_CURRENT_SOURCE_DIR}/pp.png")
set(PP_PNG_DESTINATION "${CMAKE_RUNTIME_OUTPUT_DIRECTORY}/pp.png")

if(EXISTS ${PP_PNG_SOURCE})
    add_custom_command(
        TARGET PingCCXPool POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E copy_if_different
            ${PP_PNG_SOURCE}
            ${PP_PNG_DESTINATION}
        COMMENT "Copying pp.png to bin directory"
    )
else()
    message(WARNING "pp.png not found in the source directory. Make sure it exists before running the application.")
endif()

# Installation
include(GNUInstallDirs)

# Generate .desktop file content
file(WRITE ${CMAKE_BINARY_DIR}/${PROJECT_NAME}.desktop
"[Desktop Entry]
Version=${PROJECT_VERSION}
Type=Application
Name=${PROJECT_NAME}
Comment=Application to ping CCX pools (v${PROJECT_VERSION})
Path=${CMAKE_BINARY_DIR}/bin/
Exec=${CMAKE_BINARY_DIR}/bin/${PROJECT_NAME}
Icon=$ENV{HOME}/.local/share/icons/hicolor/128x128/apps/${PROJECT_NAME}.png
Terminal=false
Categories=Utility;Network;
")

# Install desktop file to user's local applications directory
install(CODE "
    file(MAKE_DIRECTORY $ENV{HOME}/.local/share/applications)
    file(COPY ${CMAKE_BINARY_DIR}/${PROJECT_NAME}.desktop 
         DESTINATION $ENV{HOME}/.local/share/applications)
")

# Install icon to user's local icon directory
install(CODE "
    file(MAKE_DIRECTORY $ENV{HOME}/.local/share/icons/hicolor/128x128/apps)
    file(COPY ${CMAKE_SOURCE_DIR}/pp.png 
         DESTINATION $ENV{HOME}/.local/share/icons/hicolor/128x128/apps)
    file(RENAME 
         $ENV{HOME}/.local/share/icons/hicolor/128x128/apps/pp.png
         $ENV{HOME}/.local/share/icons/hicolor/128x128/apps/${PROJECT_NAME}.png)
")

# Create symlink in ~/.local/bin
install(CODE "
    file(MAKE_DIRECTORY $ENV{HOME}/.local/bin)
    execute_process(
        COMMAND ${CMAKE_COMMAND} -E create_symlink 
        ${CMAKE_BINARY_DIR}/bin/${PROJECT_NAME}
        $ENV{HOME}/.local/bin/${PROJECT_NAME}
    )
")

# Create symlink on Desktop
install(CODE "
    execute_process(
        COMMAND ${CMAKE_COMMAND} -E create_symlink 
        $ENV{HOME}/.local/share/applications/${PROJECT_NAME}.desktop
        $ENV{HOME}/Desktop/${PROJECT_NAME}.desktop
    )
")
