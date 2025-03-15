#include "ping_ccx_pool.hpp"
#include <cstdlib>
#include <iostream>
#include <sstream>
#include <iomanip>
#include <chrono>
#include <thread>
#include <wx/process.h>
#include <wx/txtstrm.h>
#include <wx/stdpaths.h>
#include <wx/filename.h>
#include <wx/textfile.h>
#include <fstream>
#include <nlohmann/json.hpp>
#include <regex>
#include <string>
#include <algorithm>
#include <wx/image.h>
#include <wx/bitmap.h>
#include <wx/statbmp.h>
#include "mainFrame.hpp"
// Include other necessary headers

// Define the global vector
std::vector<PoolInfo> poolsAndPorts;

using json = nlohmann::json;



void MainFrame::InitializePoolData() {
    poolsAndPorts.clear();
    
    // Try to load pear-pools.json from system location, then fall back to bundled pools.json
    wxString pearJsonFilePath = "/usr/share/PingCCXPool/pear-pools.json"; 
    wxString defaultJsonFilePath = "pools.json";
    wxString jsonFilePath;
    
    // Check if pear-pools.json exists and use it if available
    if (wxFileExists(pearJsonFilePath)) {
        jsonFilePath = pearJsonFilePath;
        resultTextCtrl->AppendText("Using community-maintained pool data from system-wide location\n\n");
    } else {
        jsonFilePath = defaultJsonFilePath;
    }
    
    std::ifstream file(jsonFilePath.ToStdString());
    if (!file.is_open()) {
        wxString errorMsg = wxString::Format("Failed to open %s file. Please ensure the file exists and you have read permissions.", jsonFilePath);
        wxMessageBox(errorMsg, "Error", wxOK | wxICON_ERROR);
        return;
    }

    json poolsJson;
    try {
        file >> poolsJson;
    } catch (json::parse_error& e) {
        wxString errorMsg = wxString::Format("Failed to parse %s file: %s\nError at byte position %llu", 
                                             jsonFilePath, e.what(), e.byte);
        wxMessageBox(errorMsg, "JSON Parse Error", wxOK | wxICON_ERROR);
        return;
    }

    if (!poolsJson.contains("pools") || !poolsJson["pools"].is_array()) {
        wxString errorMsg = wxString::Format("%s file is missing the 'pools' array or it's not properly formatted.", jsonFilePath);
        wxMessageBox(errorMsg, "JSON Format Error", wxOK | wxICON_ERROR);
        return;
    }

    poolsAndPorts.clear();
    int index = 0;
    for (const auto& pool : poolsJson["pools"]) {
        try {
            if (!pool.contains("address") || !pool.contains("port")) {
                wxString errorMsg = wxString::Format("Pool entry %d is missing 'address' or 'port' field.", index);
                wxMessageBox(errorMsg, "JSON Format Error", wxOK | wxICON_ERROR);
                return;
            }

            std::string address = pool["address"].get<std::string>();
            std::string port = pool["port"].get<std::string>();

            if (address.empty() || port.empty()) {
                wxString errorMsg = wxString::Format("Pool entry %d has empty 'address' or 'port' field.", index);
                wxMessageBox(errorMsg, "Data Error", wxOK | wxICON_ERROR);
                return;
            }
            poolsAndPorts.push_back({index, address, port});
            index++;
        } catch (json::type_error& e) {
            wxString errorMsg = wxString::Format("Type error in pool entry %d: %s", index, e.what());
            wxMessageBox(errorMsg, "JSON Type Error", wxOK | wxICON_ERROR);
            return;
        }
    }
}

void MainFrame::CreateControls() {
    wxPanel* panel = new wxPanel(this);
    wxBoxSizer* mainSizer = new wxBoxSizer(wxVERTICAL);

    wxButton* startButton = new wxButton(panel, wxID_ANY, "Start Test");
    resultTextCtrl = new wxTextCtrl(panel, wxID_ANY, "", wxDefaultPosition, wxDefaultSize, wxTE_MULTILINE | wxTE_READONLY);

    mainSizer->Add(startButton, 0, wxALL, 5);
    mainSizer->Add(resultTextCtrl, 1, wxEXPAND | wxALL, 5);

    panel->SetSizer(mainSizer);
}

void MainFrame::BindEvents() {
    wxButton* startButton = (wxButton*)FindWindowByLabel("Start Test");
    if (startButton) {
        startButton->Bind(wxEVT_BUTTON, &MainFrame::OnStartTest, this);
    }
}

std::vector<PoolResult> MainFrame::PerformNpingTest(const std::vector<int>& poolIndices) {
    std::vector<PoolResult> results;
    
    // Create a temporary script to run all nping commands
    wxString tempDir = wxStandardPaths::Get().GetTempDir();
    wxString scriptPath = wxFileName::CreateTempFileName(tempDir + "/nping_script");
    
    {
        wxTextFile file(scriptPath);
        file.Create();
        file.AddLine("#!/bin/bash");
        
        for (int index : poolIndices) {
            const PoolInfo& poolInfo = poolsAndPorts[index];
            file.AddLine(wxString::Format("echo 'Testing pool: %s:%s'", poolInfo.address, poolInfo.port));
            file.AddLine(wxString::Format("nping --tcp-connect -p %s -c 4 %s", poolInfo.port, poolInfo.address));
            file.AddLine("echo '----------------------------------------'");
        }
        
        file.Write();
        file.Close();
    }
    
    // Make the script executable
    wxExecute(wxString::Format("chmod +x %s", scriptPath));
    
    // Execute the script with pkexec
    wxString command = wxString::Format("pkexec %s", scriptPath);
    
    wxArrayString output, errors;
    long exitCode = wxExecute(command, output, errors, wxEXEC_SYNC);
    
    if (exitCode == 0) {
        std::regex pool_regex("Testing pool: ([^:]+):(.+)");
        std::regex rtt_regex("Avg rtt: (\\d+\\.\\d+)ms");
        std::smatch match;
        PoolInfo currentPool;
        double currentRtt = -1.0;

        for (const auto& line : output) {
            std::string line_str = line.ToStdString();
            
            if (std::regex_search(line_str, match, pool_regex)) {
                // New pool test starting, save previous result if any
                if (!currentPool.address.empty() && currentRtt != -1.0) {
                    results.emplace_back(currentPool.address, currentPool.port, currentRtt);
                }
                // Set new pool info
                currentPool.address = match[1];
                currentPool.port = match[2];
                currentRtt = -1.0;
            } else if (std::regex_search(line_str, match, rtt_regex)) {
                currentRtt = std::stod(match[1]);
                // Immediately save the result for this pool
                if (!currentPool.address.empty()) {
                    results.emplace_back(currentPool.address, currentPool.port, currentRtt);
                    // Reset for next pool
                    currentPool = PoolInfo();
                    currentRtt = -1.0;
                }
            }
        }
    } else {
        wxString errorMsg = "Error executing nping tests:\n";
        for (const auto& error : errors) {
            errorMsg += error + "\n";
        }
        throw std::runtime_error(errorMsg.ToStdString());
    }
    
    // Clean up the temporary script
    wxRemoveFile(scriptPath);
    
    return results;
}

void MainFrame::OnStartTest(wxCommandEvent& event) {
    (void)event;  // Suppress unused parameter warning
    
    // Clear previous results
    poolResults.clear();
    resultTextCtrl->Clear();

    std::vector<int> checkedPoolIndices;

    // Collect indices of checked pools
    for (unsigned int i = 0; i < poolListBox->GetCount(); ++i) {
        if (poolListBox->IsChecked(i) && i < poolsAndPorts.size()) {
            checkedPoolIndices.push_back(i);
            wxString poolAddress = poolsAndPorts[i].address;
            resultTextCtrl->AppendText(wxString::Format("Will test pool: %s\n", poolAddress));
        }
    }

    if (checkedPoolIndices.empty()) {
        resultTextCtrl->AppendText("No pools selected for testing.\n");
        return;
    }

    try {
        std::vector<PoolResult> results = PerformNpingTest(checkedPoolIndices);
        for (const auto& result : results) {
            poolResults.push_back(result);
            resultTextCtrl->AppendText(wxString::Format("Pool: %s:%s, Avg RTT: %.2f ms\n\n", 
                                                        result.address, result.port, result.avgRtt));
            
        }
    } catch (const std::exception& e) {
        wxString errorMsg = wxString::Format("Exception occurred: %s\n", e.what());
        std::cout << errorMsg << std::endl;
        resultTextCtrl->AppendText(errorMsg);
    }

    SummarizeResults();

    std::cout << "OnStartTest function completed" << std::endl;
}

void MainFrame::SummarizeResults() {
    if (poolResults.empty()) {
        resultTextCtrl->AppendText("No results to summarize.\n");
        return;
    }

    // Sort the results by average RTT
    std::sort(poolResults.begin(), poolResults.end(), 
              [](const PoolResult& a, const PoolResult& b) { return a.avgRtt < b.avgRtt; });

    resultTextCtrl->AppendText("\n--- Summary of Results (Sorted by Average RTT) ---\n\n");
    for (const auto& result : poolResults) {
        resultTextCtrl->AppendText(wxString::Format("%s:%s - Avg RTT: %.2f ms\n", 
                                                    result.address, result.port, result.avgRtt));
    }
}

// PingCCXPoolApp implementation
bool PingCCXPoolApp::OnInit() {
    wxInitAllImageHandlers();
    MainFrame* frame = new MainFrame("Ping CCX Pool", GIT_VERSION);
    frame->Show(true);
    return true;
}

wxIMPLEMENT_APP(PingCCXPoolApp);
