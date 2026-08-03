#pragma once
#include "types.hpp"
#include <filesystem>
namespace exotic::runtime {class DashboardWriter{public:explicit DashboardWriter(std::filesystem::path directory);void write(const RuntimeSnapshot&);std::filesystem::path json_path()const;std::filesystem::path text_path()const;private:std::filesystem::path directory_;};}
