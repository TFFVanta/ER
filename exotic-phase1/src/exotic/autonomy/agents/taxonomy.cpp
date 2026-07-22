#include "taxonomy.hpp"
#include <stdexcept>
namespace exotic::autonomy::agents {
CapabilityDefinitionId CapabilityTaxonomy::define(CapabilityDefinition definition){
    if(definition.key.empty()) throw std::invalid_argument("Capability key cannot be empty");
    if(definition.id==0) definition.id=repository_.next_capability_definition_id();
    if(definition.parent_key&&*definition.parent_key==definition.key) throw std::invalid_argument("Capability cannot parent itself");
    repository_.save_capability_definition(definition); return definition.id;
}
std::vector<std::string> CapabilityTaxonomy::lineage(std::string_view key) const{
    std::vector<std::string> result; std::unordered_set<std::string> visited; std::string current{key};
    while(!current.empty()){
        if(!visited.insert(current).second) throw std::runtime_error("Capability taxonomy cycle detected");
        result.push_back(current); auto d=repository_.load_capability_definition(current); if(!d||!d->parent_key) break; current=*d->parent_key;
    }
    return result;
}
bool CapabilityTaxonomy::is_a(std::string_view child,std::string_view ancestor) const{
    for (const auto& key : lineage(child)) {
        if (key == ancestor) {
            return true;
        }
    }
    return false;
}
}
