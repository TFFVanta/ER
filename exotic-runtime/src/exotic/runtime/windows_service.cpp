#include "windows_service.hpp"
#include <atomic>
#ifdef _WIN32
#include <windows.h>
#endif
namespace exotic::runtime {
#ifdef _WIN32
namespace {WindowsServiceRunner::Main* g_main{};std::stop_source g_stop;SERVICE_STATUS_HANDLE g_handle{};SERVICE_STATUS g_status{};void WINAPI control(DWORD code){if(code==SERVICE_CONTROL_STOP||code==SERVICE_CONTROL_SHUTDOWN){g_status.dwCurrentState=SERVICE_STOP_PENDING;SetServiceStatus(g_handle,&g_status);g_stop.request_stop();}}void WINAPI entry(DWORD,LPWSTR*){g_handle=RegisterServiceCtrlHandlerW(L"EXOTIC",control);g_status.dwServiceType=SERVICE_WIN32_OWN_PROCESS;g_status.dwControlsAccepted=SERVICE_ACCEPT_STOP|SERVICE_ACCEPT_SHUTDOWN;g_status.dwCurrentState=SERVICE_RUNNING;SetServiceStatus(g_handle,&g_status);if(g_main)(*g_main)(g_stop.get_token());g_status.dwCurrentState=SERVICE_STOPPED;SetServiceStatus(g_handle,&g_status);}}
#endif
int WindowsServiceRunner::run(std::string service_name,bool service_mode,Main main){
#ifndef _WIN32
(void)service_name;(void)service_mode;
#else
(void)service_name;
#endif
#ifdef _WIN32
if(service_mode){g_main=&main;SERVICE_TABLE_ENTRYW table[]={{const_cast<LPWSTR>(L"EXOTIC"),entry},{nullptr,nullptr}};if(!StartServiceCtrlDispatcherW(table))return static_cast<int>(GetLastError());return 0;}
#endif
return main({});}
}
