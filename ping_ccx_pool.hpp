#ifndef PING_CCX_POOL_HPP
#define PING_CCX_POOL_HPP

#include <wx/wx.h>
#include <wx/grid.h>
#include <map>
#include <vector>
#include <string>

// Forward declarations
class MainFrame;

// Global variables (consider making these member variables in a class later)
extern std::map<int, std::vector<std::string>> poolAndPort;

// MainFrame class
class MainFrame : public wxFrame {
public:
    MainFrame();

private:
    wxTextCtrl* resultTextCtrl;

    void InitializePoolData();
    void CreateControls();
    void BindEvents();
    void OnStartTest(wxCommandEvent& event);
};

// wxApp-derived class
class MyApp : public wxApp {
public:
    virtual bool OnInit() override;
};

#endif // PING_CCX_POOL_HPP
