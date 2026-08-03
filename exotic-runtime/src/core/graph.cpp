#include "exotic/core/graph.hpp"
#include <mutex>

namespace exotic {
std::shared_ptr<Entity> StateGraph::create_entity(std::string type, std::string name) {
    auto e = std::make_shared<Entity>(std::move(type), std::move(name));
    std::unique_lock lock(mutex_); entities_[e->id()] = e; return e;
}
bool StateGraph::remove_entity(Id id) {
    std::unique_lock lock(mutex_);
    for (auto it = relationships_.begin(); it != relationships_.end();) {
        if (it->second.from == id || it->second.to == id) it = relationships_.erase(it); else ++it;
    }
    return entities_.erase(id) > 0;
}
std::shared_ptr<Entity> StateGraph::entity(Id id) const {
    std::shared_lock lock(mutex_); const auto it = entities_.find(id); return it == entities_.end() ? nullptr : it->second;
}
Relationship StateGraph::connect(Id from, Id to, std::string type, double weight) {
    if (!entity(from) || !entity(to)) throw std::invalid_argument("relationship endpoint missing");
    Relationship rel{Id::New(), from, to, std::move(type), weight, {}};
    std::unique_lock lock(mutex_); relationships_[rel.id] = rel; return rel;
}
std::vector<Relationship> StateGraph::neighbors(Id id) const {
    std::shared_lock lock(mutex_); std::vector<Relationship> out;
    for (const auto& [_, rel] : relationships_) if (rel.from == id || rel.to == id) out.push_back(rel);
    return out;
}
std::vector<std::shared_ptr<Entity>> StateGraph::entities() const {
    std::shared_lock lock(mutex_); std::vector<std::shared_ptr<Entity>> out; out.reserve(entities_.size());
    for (const auto& [_, entity] : entities_) {
        out.push_back(entity);
    }
    return out;
}
std::size_t StateGraph::entity_count() const { std::shared_lock lock(mutex_); return entities_.size(); }
std::size_t StateGraph::relationship_count() const { std::shared_lock lock(mutex_); return relationships_.size(); }
}
