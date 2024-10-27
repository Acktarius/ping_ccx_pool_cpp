#include "mainFrame.hpp"
#include <cstdlib>
#include <iostream>
#include <sstream>
#include <iomanip>
#include <chrono>
#include <wx/process.h>
#include <wx/txtstrm.h>
#include <wx/stdpaths.h>
#include <wx/filename.h>
#include <wx/textfile.h>
#include <wx/image.h>
#include <wx/bitmap.h>
#include <wx/statbmp.h>
#include <nlohmann/json.hpp>


// MainFrame implementation
MainFrame::MainFrame(const wxString& title, const wxString& gitVersion)
    : wxFrame(nullptr, wxID_ANY, title), m_gitVersion(gitVersion) {

    InitializePoolData();
    
    // Create a panel to hold our controls
    wxPanel* panel = new wxPanel(this);
    
    // Create a sizer for the panel
    wxBoxSizer* mainSizer = new wxBoxSizer(wxVERTICAL);

    // Create a horizontal sizer for the banner and image
    wxBoxSizer* bannerSizer = new wxBoxSizer(wxHORIZONTAL);

    // Add a spacer on the left to push the text to the center
    bannerSizer->Add(0, 0, 1, wxEXPAND);

    // Add the banner text
    wxStaticText* bannerText = new wxStaticText(panel, wxID_ANY, "Ping CCX Pool");
    wxFont bannerFont = bannerText->GetFont();
    bannerFont.SetPointSize(bannerFont.GetPointSize() + 16 );
    bannerFont.SetWeight(wxFONTWEIGHT_BOLD);
    bannerText->SetFont(bannerFont);
    bannerText->SetForegroundColour(wxColour(255, 125, 0));  // Set to red, adjust as needed
    bannerSizer->Add(bannerText, 0, wxALIGN_CENTER_VERTICAL);

    // Add a spacer on the right to balance the layout
    bannerSizer->Add(0, 0, 1, wxEXPAND);

    // Load and add the image
    wxImage image;
    if (image.LoadFile("pp.png", wxBITMAP_TYPE_PNG))
    {
        // Scale the image to desired size (e.g., 32x32)
        image.Rescale(64, 64, wxIMAGE_QUALITY_HIGH);
        wxBitmap bitmap(image);
        m_logoImage = new wxStaticBitmap(panel, wxID_ANY, bitmap);
        bannerSizer->Add(m_logoImage, 0, wxALIGN_CENTER_VERTICAL | wxLEFT, 10);
    }
    //bannerSizer->Add(0, 0, 0.2, wxEXPAND);

    // Add the banner sizer to the main sizer
    mainSizer->Add(bannerSizer, 0, wxEXPAND | wxALL, 10);

    // Add the version information
    wxBoxSizer* versionSizer = new wxBoxSizer(wxHORIZONTAL);
    wxString shortVersion = wxString(m_gitVersion).BeforeFirst('-');
    wxStaticText* versionText = new wxStaticText(panel, wxID_ANY, wxString::Format("Version: %s", shortVersion));
    versionSizer->Add(0, 0, 1, wxEXPAND); // Add a spacer that can expand
    versionSizer->Add(versionText, 0, wxALIGN_CENTER_VERTICAL | wxRIGHT, 5);
    mainSizer->Add(versionSizer, 0, wxEXPAND | wxBOTTOM, 5);

    // Pool selection list
    wxArrayString poolChoices;
    for (const auto& pool : poolsAndPorts) {
        wxString poolAddress = pool.address;
        poolChoices.Add(poolAddress);
    }
    poolListBox = new wxCheckListBox(panel, wxID_ANY, wxDefaultPosition, wxSize(900, 200), poolChoices);
    mainSizer->Add(poolListBox, 0, wxALIGN_CENTER | wxALL, 10);

    // Start button
    wxButton* startButton = new wxButton(panel, wxID_ANY, "Start Test");
    mainSizer->Add(startButton, 0, wxALIGN_CENTER | wxALL, 10);

    // Result text control
    resultTextCtrl = new wxTextCtrl(panel, wxID_ANY, "", wxDefaultPosition, wxSize(900, 300), wxTE_MULTILINE | wxTE_READONLY);
    mainSizer->Add(resultTextCtrl, 1, wxEXPAND | wxALL, 10);

    // Get the current year
    auto now = std::chrono::system_clock::now();
    std::time_t currentTime = std::chrono::system_clock::to_time_t(now);
    std::tm* localTime = std::localtime(&currentTime);
    int currentYear = localTime->tm_year + 1900;  // tm_year is years since 1900
   // Create the copyright text with the current year
    wxString copyrightString = wxString::Format("%d - Acktarius - All rights reserved.", currentYear);
    // Add footer with copyright
    wxBoxSizer* footerSizer = new wxBoxSizer(wxHORIZONTAL);
    wxStaticText* copyrightText = new wxStaticText(panel, wxID_ANY, copyrightString);
    wxFont footerFont = copyrightText->GetFont();
    footerFont.SetPointSize(footerFont.GetPointSize() + 2);  // Slightly larger font
    copyrightText->SetFont(footerFont);
    copyrightText->SetForegroundColour(wxColour(255, 125, 0));  // Orange color
    footerSizer->Add(copyrightText, 1, wxALIGN_CENTER | wxALL, 5);

    mainSizer->AddSpacer(20);  // Add 20 pixels of space before the footer
    mainSizer->Add(footerSizer, 0, wxALIGN_CENTER_HORIZONTAL | wxALIGN_CENTER_VERTICAL | wxALL, 10);

    panel->SetSizer(mainSizer);
    mainSizer->Fit(this);

    wxBoxSizer* frameSizer = new wxBoxSizer(wxVERTICAL);
    frameSizer->Add(panel, 1, wxEXPAND);
    this->SetSizer(frameSizer);

    this->SetMinSize(wxSize(1000, 800));
    this->Layout();
    this->Fit();

    BindEvents();
}
