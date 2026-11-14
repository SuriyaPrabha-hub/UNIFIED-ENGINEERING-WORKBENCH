#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <shellapi.h>
#include <iostream>
#include <string>
#include <thread>
#include <chrono>

int main() {
    // 1. Get current executable directory
    char exe_path[MAX_PATH];
    GetModuleFileNameA(NULL, exe_path, MAX_PATH);
    std::string current_dir(exe_path);
    size_t last_slash = current_dir.find_last_of("\\/");
    if (last_slash != std::string::npos) {
        current_dir = current_dir.substr(0, last_slash);
    }

    SetCurrentDirectoryA(current_dir.c_str());

    std::string backend_exe = current_dir + "\\backend\\workbench_server.exe";

    // 2. Launch backend server in background
    STARTUPINFOA si;
    PROCESS_INFORMATION pi;
    ZeroMemory(&si, sizeof(si));
    si.cb = sizeof(si);
    si.dwFlags |= STARTF_USESHOWWINDOW;
    si.wShowWindow = SW_HIDE; // Hidden console for clean desktop experience
    ZeroMemory(&pi, sizeof(pi));

    std::string cmd = "\"" + backend_exe + "\" 8080";
    char cmd_cstr[1024];
    strncpy(cmd_cstr, cmd.c_str(), sizeof(cmd_cstr));

    BOOL success = CreateProcessA(
        NULL,
        cmd_cstr,
        NULL,
        NULL,
        FALSE,
        CREATE_NO_WINDOW,
        NULL,
        current_dir.c_str(),
        &si,
        &pi
    );

    if (!success) {
        // Fallback: try relative path
        std::string fallback_cmd = "backend\\workbench_server.exe 8080";
        strncpy(cmd_cstr, fallback_cmd.c_str(), sizeof(cmd_cstr));
        success = CreateProcessA(
            NULL,
            cmd_cstr,
            NULL,
            NULL,
            FALSE,
            CREATE_NO_WINDOW,
            NULL,
            NULL,
            &si,
            &pi
        );
    }

    // 3. Wait 800ms for HTTP server port binding
    std::this_thread::sleep_for(std::chrono::milliseconds(800));

    // 4. Open Default Web Browser to http://127.0.0.1:8080
    ShellExecuteA(NULL, "open", "http://127.0.0.1:8080", NULL, NULL, SW_SHOWNORMAL);

    // 5. Keep monitoring backend process
    if (success) {
        WaitForSingleObject(pi.hProcess, INFINITE);
        CloseHandle(pi.hProcess);
        CloseHandle(pi.hThread);
    }

    return 0;
}
