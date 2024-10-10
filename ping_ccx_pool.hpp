#ifndef PING_CCX_POOL_HPP
#define PING_CCX_POOL_HPP

#include <wx/wx.h>
#include <wx/grid.h>
#include <wx/stattext.h>
#include <map>
#include <vector>
#include <string>
#include <wx/image.h>
#include <wx/bitmap.h>
#include <wx/statbmp.h>

// Forward declarations
class MainFrame;

// Global variables (consider making these member variables in a class later)
extern std::map<int, std::vector<std::string>> poolAndPort;

// Add the PoolResult struct
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
    PoolResult PerformNpingTest(const std::vector<std::string>& poolInfo);  // Updated return type
    void SummarizeResults();  // Add this line

    wxTextCtrl* resultTextCtrl;
    wxCheckListBox* poolListBox;
    std::vector<PoolResult> poolResults;  // Add this line
    wxString m_gitVersion;  // Add this line to store the git version
    wxStaticBitmap* m_logoImage;  // Add this line to store the logo image
};

// wxApp-derived class
class MyApp : public wxApp {
public:
    virtual bool OnInit() override;
};

#endif // PING_CCX_POOL_HPP
