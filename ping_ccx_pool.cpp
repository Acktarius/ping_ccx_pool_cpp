#include "ping_ccx_pool.hpp"
#include <cstdlib>
#include <iostream>
#include <sstream>
#include <iomanip>
#include <chrono>
#include <thread>

// Global variables implementation
std::map<int, std::vector<std::string>> poolAndPort;

// MainFrame implementation
MainFrame::MainFrame() : wxFrame(nullptr, wxID_ANY, "CCX Pool Ping Test") {
    InitializePoolData();
    CreateControls();
    BindEvents();
}

void MainFrame::InitializePoolData() {
    poolAndPort[1] = {"conceal.network", "pool.", "3333"};
    poolAndPort[2] = {"cedric-crispin.com", "conceal.", "3364"};
    poolAndPort[3] = {"fastpool.xyz", "us.", "eu.", "sg.", "10167"};
    poolAndPort[4] = {"gntl.uk", "ccx.", "40012"};
    poolAndPort[5] = {"conceal.miner.rocks", "fr.", "30041"};
    poolAndPort[6] = {"hashvault.pro", "pool.", "3333"};
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
    Bind(wxEVT_BUTTON, &MainFrame::OnStartTest, this);
}

void MainFrame::OnStartTest(wxCommandEvent& WXUNUSED(event)) {
    // TODO: Implement the main logic here
    resultTextCtrl->AppendText("Test started...\n");
}

// MyApp implementation
bool MyApp::OnInit() {
    MainFrame* frame = new MainFrame();
    frame->Show(true);
    return true;
}

wxIMPLEMENT_APP(MyApp);