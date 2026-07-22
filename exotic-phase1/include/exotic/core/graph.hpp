#pragma once
#include "exotic/core/entity.hpp"
#include <memory>
#include <optional>
#include <shared_mutex>
#include <string>
#include <unordered_map>
#include <vector>

namespace exotic {
struct Relationship {
    Id id{Id::New()}; Id from{}; Id to{}; std::string type; double weight{1.0}; Properties properties;
};
class StateGraph {
public:
    std::shared_ptr<Entity> create_entity(std::string type, std::string name = {});
    bool remove_entity(Id id);
    [[nodiscard]] std::shared_ptr<Entity> entity(Id id) const;
    Relationship connect(Id from, Id to, std::string type, double weight = 1.0);
    [[nodiscard]] std::vector<Relationship> neighbors(Id id) const;
    [[nodiscard]] std::vector<std::shared_ptr<Entity>> entities() const;
    [[nodiscard]] std::size_t entity_count() const;
    [[nodiscard]] std::size_t relationship_count() const;
private:
    mutable std::shared_mutex mutex_;
    std::unordered_map<Id, std::shared_ptr<Entity>> entities_;
    std::unordered_map<Id, Relationship> relationships_;
};
}
