#include "exotic/core/entity.hpp"
#include <mutex>

namespace exotic {
Entity::Entity(std::string type, std::string name)
    : type_(std::move(type)), name_(std::move(name)) {}
void Entity::set(std::string key, Value value) {
    std::unique_lock lock(mutex_); state_[std::move(key)] = std::move(value);
}
Value Entity::get(const std::string& key) const {
    std::shared_lock lock(mutex_);
    const auto it = state_.find(key); return it == state_.end() ? Value{} : it->second;
}
void Entity::attach(Component component) {
    std::unique_lock lock(mutex_); components_[component.type] = std::move(component);
}
bool Entity::has_component(const std::string& type) const {
    std::shared_lock lock(mutex_); return components_.contains(type);
}
Properties Entity::snapshot() const { std::shared_lock lock(mutex_); return state_; }
}
