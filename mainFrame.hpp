#pragma once

#include <wx/wx.h>
#include <map> 
#include <wx/stattext.h>
#include <string>
#include <wx/image.h>
#include <wx/bitmap.h>
#include <wx/statbmp.h>
#include <vector>

// Forward declarations
class MainFrame;

// Define the PoolInfo struct
struct PoolInfo {
    int id;
    std::string address;
    std::string port;
};

// Replace the global variable with the new vector
extern std::vector<PoolInfo> poolsAndPorts;

// Update the PoolResult struct if necessary
struct PoolResult {
    std::string address;
    std::string port;
    double avgRtt;

    PoolResult(std::string addr, std::string p, double rtt)
        : address(std::move(addr)), port(std::move(p)), avgRtt(rtt) {}
};

// MainFrame class
class MainFrame : public wxFrame {
public:
    // Update the constructor declaration to include GIT_VERSION
    MainFrame(const wxString& title, const wxString& gitVersion);
    void CreateControls();

private:
    void InitializePoolData();
    void BindEvents();
    void OnStartTest(wxCommandEvent& event);
    std::vector<PoolResult> PerformNpingTest(const std::vector<int>& poolIndices);
    void SummarizeResults();

    wxTextCtrl* resultTextCtrl;
    wxCheckListBox* poolListBox;
    std::vector<PoolResult> poolResults;
    wxString m_gitVersion;
    wxStaticBitmap* m_logoImage;
};
