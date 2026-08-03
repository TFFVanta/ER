#pragma once
#include <functional>
#include <stop_token>
#include <string>
namespace exotic::runtime {class WindowsServiceRunner{public:using Main=std::function<int(std::stop_token)>;static int run(std::string service_name,bool service_mode,Main main);};}
