#pragma once
#include <mutex>
#include <stdexcept>
#include <string>
#include <unordered_map>
namespace exotic::runtime {class InjectedFailure:public std::runtime_error{public:using std::runtime_error::runtime_error;};class FailureInjector{public:void arm(std::string point,std::size_t hits=1);void clear();void check(std::string_view point);private:std::mutex m_;std::unordered_map<std::string,std::size_t>points_;};}
