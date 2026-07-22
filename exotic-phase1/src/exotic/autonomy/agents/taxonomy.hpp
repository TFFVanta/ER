#pragma once
#include "repository.hpp"
#include <unordered_set>
namespace exotic::autonomy::agents {
class CapabilityTaxonomy {
public:
    explicit CapabilityTaxonomy(AgentRepository& repository):repository_(repository){}
    CapabilityDefinitionId define(CapabilityDefinition definition);
    [[nodiscard]] bool is_a(std::string_view child, std::string_view ancestor) const;
    [[nodiscard]] std::vector<std::string> lineage(std::string_view key) const;
private:
    AgentRepository& repository_;
};
}
