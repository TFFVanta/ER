#include "service_graph.hpp"
#include <functional>
#include <stdexcept>
namespace exotic::runtime {
void ServiceGraph::add(std::shared_ptr<RuntimeService>s){if(!s)throw ServiceError("cannot add null service");auto n=s->name();if(n.empty())throw ServiceError("service name is empty");if(!services_.emplace(n,std::move(s)).second)throw ServiceError("duplicate service: "+n);}
std::shared_ptr<RuntimeService> ServiceGraph::find(std::string_view n)const{auto it=services_.find(std::string{n});return it==services_.end()?nullptr:it->second;}
std::vector<std::shared_ptr<RuntimeService>> ServiceGraph::ordered()const{enum class Mark{None,Visiting,Done};std::unordered_map<std::string,Mark> marks;std::vector<std::shared_ptr<RuntimeService>> out;std::function<void(const std::string&)> visit=[&](const std::string&n){auto it=services_.find(n);if(it==services_.end())throw ServiceError("missing service dependency: "+n);auto mark=marks[n];if(mark==Mark::Visiting)throw ServiceError("service dependency cycle at: "+n);if(mark==Mark::Done)return;marks[n]=Mark::Visiting;for(const auto&d:it->second->dependencies())visit(d);marks[n]=Mark::Done;out.push_back(it->second);};for(const auto&[n,s]:services_){(void)s;visit(n);}return out;}
}
