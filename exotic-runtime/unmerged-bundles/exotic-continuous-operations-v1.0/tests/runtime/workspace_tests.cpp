#include "exotic/runtime/workspace.hpp"
#include <cassert>
int main(){using namespace exotic::runtime;auto p=std::filesystem::temp_directory_path()/"exotic-runtime-workspace-test";std::filesystem::remove_all(p);WorkspaceContext w{p};assert(w.contains(w.paths().runtime_database));{WorkspaceLease one{w.paths()};bool threw=false;try{WorkspaceLease two{w.paths()};}catch(...){threw=true;}assert(threw);}WorkspaceLease three{w.paths()};std::filesystem::remove_all(p);}
