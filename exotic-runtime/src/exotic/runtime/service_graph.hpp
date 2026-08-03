#pragma once
#include "service.hpp"
#include <memory>
#include <unordered_map>
#include <vector>
namespace exotic::runtime {
class ServiceGraph {
public:void add(std::shared_ptr<RuntimeService> service);std::vector<std::shared_ptr<RuntimeService>> ordered()const;std::shared_ptr<RuntimeService> find(std::string_view name)const;
private:std::unordered_map<std::string,std::shared_ptr<RuntimeService>> services_;
};
}
