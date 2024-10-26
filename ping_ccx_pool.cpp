#include"mainFrame.hpp"
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
#include <algorithm>
#include <wx/image.h>
#include <wx/bitmap.h>
#include <wx/statbmp.h>

using json = nlohmann::json;



void MainFrame::InitializePoolData() {
    const wxString jsonFilePath = "pools.json";
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

    poolAndPort.clear();
    int index = 1;
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

            poolAndPort[index++] = {address, port};
        } catch (json::type_error& e) {
            wxString errorMsg = wxString::Format("Type error in pool entry %d: %s", index, e.what());
            wxMessageBox(errorMsg, "JSON Type Error", wxOK | wxICON_ERROR);
            
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

PoolResult MainFrame::PerformNpingTest(const std::vector<std::string>& poolInfo) {
    wxString result;
    double avgRtt = -1.0;  // Default value if we can't parse the result
    
    // Create a temporary script to run all nping commands
    wxString tempDir = wxStandardPaths::Get().GetTempDir();
    wxString scriptPath = wxFileName::CreateTempFileName(tempDir + "/nping_script");
    
    {
        wxTextFile file(scriptPath);
        file.Create();
        file.AddLine("#!/bin/bash");
        
        wxString pool = poolInfo[0];
        wxString port = poolInfo[1];
        
        file.AddLine(wxString::Format("nping --tcp-connect -p %s -c 1 %s", port, pool));
        file.AddLine("echo '----------------------------------------'");
        
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
        for (const auto& line : output) {
            result += line + "\n";
            
            // Parse the Avg rtt
            std::regex rtt_regex("Avg rtt: (\\d+\\.\\d+)ms");
            std::smatch match;
            std::string line_str = line.ToStdString();
            if (std::regex_search(line_str, match, rtt_regex)) {
                avgRtt = std::stod(match[1]);
            }
        }
    } else {
        result += "Error executing nping tests:\n";
        for (const auto& error : errors) {
            result += error + "\n";
        }
    }
    
    // Clean up the temporary script
    wxRemoveFile(scriptPath);
    
    return PoolResult(poolInfo[0], poolInfo[1], avgRtt);
}

void MainFrame::OnStartTest(wxCommandEvent& WXUNUSED(event)) {
    resultTextCtrl->Clear();
    resultTextCtrl->AppendText("Test started...\n");
    poolResults.clear();  // Clear previous results

    std::cout << "OnStartTest function called" << std::endl;

    wxArrayInt checkedItems;
    poolListBox->GetCheckedItems(checkedItems);

    if (checkedItems.IsEmpty()) {
        resultTextCtrl->AppendText("Please select at least one pool to test.\n");
        std::cout << "No pools selected for testing" << std::endl;
        return;
    }

    std::cout << "Number of pools selected: " << checkedItems.GetCount() << std::endl;

    for (int index : checkedItems) {
        wxString poolAddress = poolListBox->GetString(index);
        resultTextCtrl->AppendText(wxString::Format("Testing pool: %s\n", poolAddress));
        
        std::cout << "Testing pool: " << poolAddress << std::endl;

        bool poolFound = false;
        for (const auto& pool : poolAndPort) {
            if (pool.second[0] == poolAddress) {
                std::cout << "Pool info found. Performing nping test..." << std::endl;

                try {
                    PoolResult result = PerformNpingTest(pool.second);
                    poolResults.push_back(result);
                    resultTextCtrl->AppendText(wxString::Format("Avg RTT: %.2f ms\n\n", result.avgRtt));
                } catch (const std::exception& e) {
                    wxString errorMsg = wxString::Format("Exception occurred: %s\n", e.what());
                    std::cout << errorMsg << std::endl;
                    resultTextCtrl->AppendText(errorMsg);
                }

                poolFound = true;
                break;
            }
        }

        if (!poolFound) {
            std::cout << "Pool info not found for: " << poolAddress << std::endl;
            resultTextCtrl->AppendText(wxString::Format("Error: Pool info not found for %s\n", poolAddress));
        }
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

    resultTextCtrl->AppendText("\n--- Summary of Results (Sorted by Average RTT) ---\n");
    for (const auto& result : poolResults) {
        resultTextCtrl->AppendText(wxString::Format("%s:%s - Avg RTT: %.2f ms\n", 
                                                    result.address, result.port, result.avgRtt));
    }
}

// MyApp implementation
bool MyApp::OnInit() {
    wxInitAllImageHandlers();
    MainFrame* frame = new MainFrame("Ping CCX Pool", GIT_VERSION);
    frame->Show(true);
    return true;
}

wxIMPLEMENT_APP(MyApp);