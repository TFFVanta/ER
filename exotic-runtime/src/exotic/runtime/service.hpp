#pragma once
#include "types.hpp"
#include <stdexcept>
#include <string>
#include <vector>
namespace exotic::runtime {
class ServiceError:public std::runtime_error{public:using std::runtime_error::runtime_error;};
class RuntimeService {
public:virtual~RuntimeService()=default;virtual std::string name()const=0;virtual std::vector<std::string> dependencies()const{return{};}virtual void recover()=0;virtual void start()=0;virtual void request_stop()=0;virtual void join()=0;virtual ServiceHealth health()=0;};
}
