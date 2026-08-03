#include "workspace.hpp"
#include <fstream>
#include <stdexcept>
#ifdef _WIN32
#include <windows.h>
#else
#include <unistd.h>
#endif
namespace exotic::runtime {
namespace {unsigned long pid(){
#ifdef _WIN32
return static_cast<unsigned long>(GetCurrentProcessId());
#else
return static_cast<unsigned long>(getpid());
#endif
}}
WorkspaceContext::WorkspaceContext(std::filesystem::path root){paths_.root=std::filesystem::weakly_canonical(std::filesystem::absolute(std::move(root)));std::filesystem::create_directories(paths_.root);paths_.exotic=paths_.root/".exotic";paths_.state=paths_.exotic/"state";paths_.logs=paths_.exotic/"logs";paths_.dashboards=paths_.exotic/"dashboards";paths_.runtime_database=paths_.state/"continuous-operations.db";paths_.lock_directory=paths_.state/"runtime.lock";std::filesystem::create_directories(paths_.state);std::filesystem::create_directories(paths_.logs);std::filesystem::create_directories(paths_.dashboards);}
bool WorkspaceContext::contains(const std::filesystem::path&p)const{auto candidate=std::filesystem::weakly_canonical(std::filesystem::absolute(p));auto root=paths_.root.native();auto value=candidate.native();if(value.size()<root.size())return false;return std::equal(root.begin(),root.end(),value.begin());}
WorkspaceLease::WorkspaceLease(const WorkspacePaths&p):lock_(p.lock_directory){std::error_code ec;if(!std::filesystem::create_directory(lock_,ec))throw std::runtime_error("EXOTIC workspace is already owned by another runtime: "+lock_.string());held_=true;std::ofstream out(lock_/"owner.txt",std::ios::trunc);out<<"pid="<<pid()<<"\n";out<<"workspace="<<p.root.string()<<"\n";}
WorkspaceLease::~WorkspaceLease(){if(held_){std::error_code ec;std::filesystem::remove_all(lock_,ec);}}
}
