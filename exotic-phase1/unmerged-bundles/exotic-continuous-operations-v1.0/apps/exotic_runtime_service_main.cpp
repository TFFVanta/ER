#include "exotic/runtime/full_stack_bootstrap.hpp"
#include "exotic/runtime/windows_service.hpp"
#include <filesystem>
#include <string>
int main(int argc,char**argv){std::filesystem::path workspace=".";bool service=false;for(int i=1;i<argc;++i){std::string a=argv[i];if(a=="--service")service=true;else if(a=="--workspace"&&i+1<argc)workspace=argv[++i];}auto config=exotic::runtime::load_runtime_config(workspace);auto production=exotic::runtime::FullStackBootstrap::build(config);return exotic::runtime::WindowsServiceRunner::run("EXOTIC",service,[&](std::stop_token stop){production->runtime->run(stop);return 0;});}
